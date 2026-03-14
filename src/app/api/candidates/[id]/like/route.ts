import { NextRequest } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { apiSuccess, apiError } from "@/lib/api-utils";

const IP_HASH_SALT = process.env.IP_HASH_SALT || "reform-chungnam-salt";

function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(ip + IP_HASH_SALT).digest("hex");
}

async function getLikeCount(candidateId: string): Promise<number> {
  const { count } = await supabaseAdmin
    .from("CandidateLike")
    .select("id", { count: "exact", head: true })
    .eq("candidateId", candidateId);
  return count ?? 0;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: candidateId } = await params;

    const rawIp =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      "127.0.0.1";
    const ipHash = hashIp(rawIp);

    const likeCount = await getLikeCount(candidateId);

    const { data: existing } = await supabaseAdmin
      .from("CandidateLike")
      .select("id")
      .eq("candidateId", candidateId)
      .eq("ipHash", ipHash)
      .maybeSingle();

    return apiSuccess({ likeCount, hasLiked: !!existing });
  } catch (error) {
    console.error("[GET /api/candidates/:id/like]", error);
    return apiError("좋아요 정보를 불러올 수 없습니다", 500);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: candidateId } = await params;

    const rawIp =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      "127.0.0.1";
    const ipHash = hashIp(rawIp);

    // Try to insert; if duplicate (23505) the IP already liked — no cancellation allowed
    const { error: insertError } = await supabaseAdmin
      .from("CandidateLike")
      .insert({ candidateId, ipHash });

    if (insertError) {
      if (insertError.code === "23505") {
        // Already liked — return current liked state (응원 취소 불가)
        const likeCount = await getLikeCount(candidateId);
        return apiSuccess({ liked: true, likeCount });
      }

      console.error("[POST /api/candidates/:id/like] Insert error:", insertError);
      return apiError("좋아요 처리에 실패했습니다", 500);
    }

    const likeCount = await getLikeCount(candidateId);
    return apiSuccess({ liked: true, likeCount });
  } catch (error) {
    console.error("[POST /api/candidates/:id/like]", error);
    return apiError("좋아요 처리에 실패했습니다", 500);
  }
}
