import { NextRequest } from "next/server";
import crypto from "crypto";
import { supabase } from "@/lib/supabase";
import { apiSuccess, apiError } from "@/lib/api-utils";

const IP_HASH_SALT = process.env.IP_HASH_SALT || "reform-chungnam-salt";

function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(ip + IP_HASH_SALT).digest("hex");
}

const TABLE_MISSING = (code: string) =>
  code === "42P01" || code === "PGRST200" || code === "PGRST204" || code === "PGRST205";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: pledgeId } = await params;
  if (!pledgeId) return apiError("Invalid pledge ID", 400);

  const rawIp =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "127.0.0.1";
  const ipHash = hashIp(rawIp);

  try {
    // Check if pledge exists
    const { data: pledge } = await supabase
      .from("Pledge")
      .select("id")
      .eq("id", pledgeId)
      .single();
    if (!pledge) return apiError("공약을 찾을 수 없습니다", 404);

    // Try to insert a like (toggle via unique constraint)
    const { error: insertError } = await supabase
      .from("PledgeLike")
      .insert({ pledgeId, ipHash });

    if (insertError) {
      // PledgeLike table not yet created
      if (TABLE_MISSING(insertError.code)) {
        return apiSuccess({ hasLiked: false, likeCount: 0 });
      }

      if (insertError.code === "23505") {
        // Already liked — remove the like
        const { error: deleteError } = await supabase
          .from("PledgeLike")
          .delete()
          .eq("pledgeId", pledgeId)
          .eq("ipHash", ipHash);

        if (deleteError) {
          console.error("[POST /api/pledges/[id]/like] Delete error:", deleteError);
          return apiError("좋아요 처리에 실패했습니다", 500);
        }

        const { count } = await supabase
          .from("PledgeLike")
          .select("id", { count: "exact", head: true })
          .eq("pledgeId", pledgeId);
        return apiSuccess({ hasLiked: false, likeCount: count ?? 0 });
      }

      console.error("[POST /api/pledges/[id]/like] Insert error:", insertError);
      return apiError("좋아요 처리에 실패했습니다", 500);
    }

    const { count } = await supabase
      .from("PledgeLike")
      .select("id", { count: "exact", head: true })
      .eq("pledgeId", pledgeId);
    return apiSuccess({ hasLiked: true, likeCount: count ?? 0 });
  } catch (err) {
    console.error("[POST /api/pledges/[id]/like]", err);
    return apiError("좋아요 처리에 실패했습니다", 500);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: pledgeId } = await params;
  const rawIp =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "127.0.0.1";
  const ipHash = hashIp(rawIp);

  try {
    const [likeCountRes, myLikeRes] = await Promise.all([
      supabase
        .from("PledgeLike")
        .select("id", { count: "exact", head: true })
        .eq("pledgeId", pledgeId),
      supabase
        .from("PledgeLike")
        .select("id")
        .eq("pledgeId", pledgeId)
        .eq("ipHash", ipHash)
        .maybeSingle(),
    ]);

    // Graceful fallback if table doesn't exist
    if (likeCountRes.error && TABLE_MISSING(likeCountRes.error.code)) {
      return apiSuccess({ likeCount: 0, hasLiked: false });
    }

    return apiSuccess({
      likeCount: likeCountRes.count ?? 0,
      hasLiked: !!myLikeRes.data,
    });
  } catch (err) {
    console.error("[GET /api/pledges/[id]/like]", err);
    return apiError("좋아요 정보를 불러올 수 없습니다", 500);
  }
}
