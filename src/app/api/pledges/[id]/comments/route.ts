import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { ZodError } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createPledgeCommentSchema } from "@/lib/validations";
import { apiSuccess, apiError, apiValidationError } from "@/lib/api-utils";
import { verifyRecaptcha } from "@/app/api/captcha/route";

const IP_HASH_SALT = process.env.IP_HASH_SALT || "reform-chungnam-salt";
const BCRYPT_ROUNDS = 10;

function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(ip + IP_HASH_SALT).digest("hex");
}

// ── GET — fetch approved comments for a pledge ──────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: pledgeId } = await params;
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 100);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);

  try {
    const { data, count, error } = await supabaseAdmin
      .from("PledgeComment")
      .select("id, pledgeId, content, authorName, status, createdAt", {
        count: "exact",
      })
      .eq("pledgeId", pledgeId)
      .eq("status", "visible")
      .order("createdAt", { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("[GET /api/pledges/[id]/comments]", error);
      return apiError("댓글을 불러올 수 없습니다", 500);
    }

    return NextResponse.json({
      success: true,
      data: data ?? [],
      total: count ?? 0,
    });
  } catch (err) {
    console.error("[GET /api/pledges/[id]/comments]", err);
    return apiError("댓글을 불러올 수 없습니다", 500);
  }
}

// ── POST — create a new comment ─────────────────────────────────────────────
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: pledgeId } = await params;

  try {
    const body = await request.json();
    const validated = createPledgeCommentSchema.parse(body);

    // CAPTCHA
    if (!(await verifyRecaptcha(validated.captchaToken))) {
      return apiError("보안 문자 인증에 실패했습니다. 다시 시도해주세요.", 400);
    }

    // IP hashing
    const rawIp =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "127.0.0.1";
    const ipHash = hashIp(rawIp);

    // Rate limit: max 10 comments/hour/IP
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabaseAdmin
      .from("PledgeComment")
      .select("id", { count: "exact", head: true })
      .eq("ipHash", ipHash)
      .eq("status", "visible")
      .gte("createdAt", oneHourAgo);
    if ((recentCount ?? 0) >= 10) {
      return apiError("1시간에 최대 10개의 댓글만 작성할 수 있습니다", 429);
    }

    // Check pledge exists
    const { data: pledge } = await supabaseAdmin
      .from("Pledge")
      .select("id")
      .eq("id", pledgeId)
      .single();
    if (!pledge) return apiError("공약을 찾을 수 없습니다", 404);

    // Hash password
    const passwordHash = await bcrypt.hash(validated.password, BCRYPT_ROUNDS);

    const { data: comment, error } = await supabaseAdmin
      .from("PledgeComment")
      .insert({
        pledgeId,
        content: validated.content,
        authorName: validated.authorName,
        passwordHash,
        ipHash,
        status: "visible",
      })
      .select("id, pledgeId, content, authorName, status, createdAt")
      .single();

    if (error) {
      console.error("[POST /api/pledges/[id]/comments] insert error:", error);
      return apiError("댓글 작성에 실패했습니다", 500);
    }

    return apiSuccess(comment, 201);
  } catch (err) {
    if (err instanceof ZodError) return apiValidationError(err);
    console.error("[POST /api/pledges/[id]/comments]", err);
    return apiError("댓글 작성에 실패했습니다", 500);
  }
}
