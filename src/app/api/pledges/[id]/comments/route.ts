import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { ZodError } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { createPledgeCommentSchema } from "@/lib/validations";
import { apiSuccess, apiError, apiValidationError } from "@/lib/api-utils";
import { verifyRecaptcha } from "@/app/api/captcha/route";

const IP_HASH_SALT = process.env.IP_HASH_SALT || "reform-chungnam-salt";
const BCRYPT_ROUNDS = 10;

function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(ip + IP_HASH_SALT).digest("hex");
}

const TABLE_MISSING = (code: string) =>
  code === "42P01" || code === "PGRST200" || code === "PGRST204" || code === "PGRST205";

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
    // Try with candidateId column first, fall back if column doesn't exist
    let { data, count, error } = await supabase
      .from("PledgeComment")
      .select("id, pledgeId, content, authorName, status, createdAt, candidateId", {
        count: "exact",
      })
      .eq("pledgeId", pledgeId)
      .eq("status", "visible")
      .order("createdAt", { ascending: true })
      .range(offset, offset + limit - 1);

    if (error && TABLE_MISSING(error.code)) {
      // candidateId column may not exist yet — retry without it
      const fallback = await supabase
        .from("PledgeComment")
        .select("id, pledgeId, content, authorName, status, createdAt", { count: "exact" })
        .eq("pledgeId", pledgeId)
        .eq("status", "visible")
        .order("createdAt", { ascending: true })
        .range(offset, offset + limit - 1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data = fallback.data as any;
      count = fallback.count;
      error = fallback.error;
    }

    if (error) {
      // Table not created yet — return empty gracefully
      if (TABLE_MISSING(error.code)) {
        return NextResponse.json({ success: true, data: [], total: 0 });
      }
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

    // Session check: logged-in candidates skip CAPTCHA and password
    const session = await getServerSession(authOptions);
    const sessionUser = session
      ? {
          id: (session.user as { id?: string })?.id ?? null,
          name: session.user?.name ?? null,
        }
      : null;

    // CAPTCHA (only for non-authenticated users)
    if (!sessionUser) {
      if (!validated.captchaToken || !(await verifyRecaptcha(validated.captchaToken))) {
        return apiError("보안 문자 인증에 실패했습니다. 다시 시도해주세요.", 400);
      }
      if (!validated.authorName) {
        return apiError("이름을 입력해주세요.", 400);
      }
      if (!validated.password) {
        return apiError("비밀번호를 입력해주세요.", 400);
      }
    }

    // IP hashing
    const rawIp =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "127.0.0.1";
    const ipHash = hashIp(rawIp);

    // Rate limit: max 10 comments/hour/IP (skip for logged-in candidates)
    if (!sessionUser) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count: recentCount, error: rateError } = await supabase
        .from("PledgeComment")
        .select("id", { count: "exact", head: true })
        .eq("ipHash", ipHash)
        .eq("status", "visible")
        .gte("createdAt", oneHourAgo);

      if (!rateError && (recentCount ?? 0) >= 10) {
        return apiError("1시간에 최대 10개의 댓글만 작성할 수 있습니다", 429);
      }
    }

    // Check pledge exists
    const { data: pledge } = await supabase
      .from("Pledge")
      .select("id")
      .eq("id", pledgeId)
      .single();
    if (!pledge) return apiError("공약을 찾을 수 없습니다", 404);

    // Password hash (only for non-authenticated users)
    const passwordHash = sessionUser
      ? null
      : await bcrypt.hash(validated.password!, BCRYPT_ROUNDS);

    const authorName = sessionUser?.name ?? validated.authorName ?? "익명";
    const candidateId = sessionUser?.id ?? null;

    // Try insert with candidateId, fall back if column doesn't exist
    const baseInsert = {
      pledgeId,
      content: validated.content,
      authorName,
      passwordHash,
      ipHash,
      status: "visible",
    };

    let { data: comment, error } = await supabase
      .from("PledgeComment")
      .insert({ ...baseInsert, candidateId })
      .select("id, pledgeId, content, authorName, status, createdAt, candidateId")
      .single();

    if (error && TABLE_MISSING(error.code)) {
      // candidateId column doesn't exist yet — retry without it
      ({ data: comment, error } = await supabase
        .from("PledgeComment")
        .insert(baseInsert)
        .select("id, pledgeId, content, authorName, status, createdAt")
        .single());
    }

    if (error) {
      if (TABLE_MISSING(error.code)) {
        return apiError(
          "댓글 기능이 아직 준비 중입니다. 잠시 후 다시 시도해 주세요.",
          503
        );
      }
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
