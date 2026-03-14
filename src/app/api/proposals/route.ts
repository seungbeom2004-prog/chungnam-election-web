import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createProposalSchema } from "@/lib/validations";
import { apiSuccess, apiError, apiValidationError } from "@/lib/api-utils";
import { verifyCaptchaToken } from "@/app/api/captcha/route";

const IP_HASH_SALT = process.env.IP_HASH_SALT || "reform-chungnam-salt";

function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(ip + IP_HASH_SALT).digest("hex");
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get("city");
    const candidateId = searchParams.get("candidateId");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 100);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    let query = supabaseAdmin
      .from("ProposalPost")
      .select(
        `*, candidate:Candidate!candidateId(id, name, district), likes:ProposalLike(count)`,
        { count: "exact" }
      )
      .neq("status", "deleted")
      .order("createdAt", { ascending: false })
      .range(offset, offset + limit - 1);

    if (city) query = query.eq("city", city);
    if (candidateId) query = query.eq("candidateId", candidateId);

    const { data: proposals, count, error } = await query;

    if (error) {
      console.error("[GET /api/proposals] Supabase error:", error);
      return apiError("제안 목록을 불러올 수 없습니다", 500);
    }

    const enriched = (proposals ?? []).map((p: Record<string, unknown>) => {
      const likes = p.likes as Array<{ count: number }> | null;
      const likeCount = likes?.[0]?.count ?? 0;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { likes: _likes, ...rest } = p;
      return { ...rest, likeCount };
    });

    return NextResponse.json({
      success: true,
      data: enriched,
      total: count ?? 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error("[GET /api/proposals]", error);
    return apiError("제안 목록을 불러올 수 없습니다", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createProposalSchema.parse(body);

    // Honeypot check
    if (validated.honeypot && validated.honeypot.length > 0) {
      return apiError("Invalid request", 400);
    }

    // CAPTCHA verification
    if (!verifyCaptchaToken(validated.captchaToken, validated.captchaAnswer)) {
      return apiError("보안 문자가 올바르지 않습니다. 다시 시도해주세요.", 400);
    }

    // IP hashing
    const rawIp =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      "127.0.0.1";
    const ipHash = hashIp(rawIp);

    // Rate limit: max 5 proposals per hour per IP
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentCount, error: countError } = await supabaseAdmin
      .from("ProposalPost")
      .select("id", { count: "exact", head: true })
      .eq("ipHash", ipHash)
      .neq("status", "deleted")
      .gte("createdAt", oneHourAgo);

    if (countError) {
      console.error("[POST /api/proposals] Rate limit check error:", countError);
      return apiError("제안 생성에 실패했습니다", 500);
    }

    if ((recentCount ?? 0) >= 5) {
      return apiError("1시간에 최대 5개의 제안만 작성할 수 있습니다", 429);
    }

    // Strip internal fields before inserting
    const { honeypot: _h, captchaToken: _ct, captchaAnswer: _ca, ...insertData } = validated;
    const { data: proposal, error } = await supabaseAdmin
      .from("ProposalPost")
      .insert({
        ...insertData,
        ipHash,
        status: "pending",
      })
      .select("*, candidate:Candidate!candidateId(id, name, district)")
      .single();

    if (error) {
      console.error("[POST /api/proposals] Supabase error:", error);
      return apiError("제안 생성에 실패했습니다", 500);
    }

    return apiSuccess(proposal, 201);
  } catch (error) {
    if (error instanceof ZodError) return apiValidationError(error);
    console.error("[POST /api/proposals]", error);
    return apiError("제안 생성에 실패했습니다", 500);
  }
}
