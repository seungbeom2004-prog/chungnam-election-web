import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { apiSuccess, apiError } from "@/lib/api-utils";

const IP_HASH_SALT = process.env.IP_HASH_SALT || "reform-chungnam-salt";

function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(ip + IP_HASH_SALT).digest("hex");
}

function todayStart(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
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

    // hasLiked = true only if they already liked TODAY
    const { data: todayLike } = await supabaseAdmin
      .from("CandidateLike")
      .select("id")
      .eq("candidateId", candidateId)
      .eq("ipHash", ipHash)
      .gte("createdAt", todayStart())
      .maybeSingle();

    return apiSuccess({ likeCount, hasLiked: !!todayLike });
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

    // Check for any existing row for this (candidateId, ipHash)
    const { data: existing } = await supabaseAdmin
      .from("CandidateLike")
      .select("id, createdAt")
      .eq("candidateId", candidateId)
      .eq("ipHash", ipHash)
      .maybeSingle();

    if (existing) {
      if (existing.createdAt >= todayStart()) {
        // Already liked today — reject with friendly message
        const likeCount = await getLikeCount(candidateId);
        return NextResponse.json(
          {
            success: false,
            message: "같은 후보자에게 응원은 하루에 한번만 할 수 있습니다.",
            likeCount,
          },
          { status: 429 }
        );
      }
      // Liked on a previous day → reset timestamp (unique constraint stays happy)
      const { error: updateError } = await supabaseAdmin
        .from("CandidateLike")
        .update({ createdAt: new Date().toISOString() })
        .eq("id", existing.id);

      if (updateError) {
        console.error("[POST /api/candidates/:id/like] Update error:", updateError);
        return apiError("좋아요 처리에 실패했습니다", 500);
      }
    } else {
      // First-ever like from this IP for this candidate
      const { error: insertError } = await supabaseAdmin
        .from("CandidateLike")
        .insert({ candidateId, ipHash });

      if (insertError) {
        console.error("[POST /api/candidates/:id/like] Insert error:", insertError);
        return apiError("좋아요 처리에 실패했습니다", 500);
      }
    }

    const likeCount = await getLikeCount(candidateId);
    return apiSuccess({ liked: true, likeCount });
  } catch (error) {
    console.error("[POST /api/candidates/:id/like]", error);
    return apiError("좋아요 처리에 실패했습니다", 500);
  }
}
