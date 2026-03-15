import { NextRequest } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { apiSuccess, apiError } from "@/lib/api-utils";

const IP_HASH_SALT = process.env.IP_HASH_SALT || "reform-chungnam-salt";

function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(ip + IP_HASH_SALT).digest("hex");
}

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
    const { data: pledge } = await supabaseAdmin
      .from("Pledge")
      .select("id")
      .eq("id", pledgeId)
      .single();
    if (!pledge) return apiError("공약을 찾을 수 없습니다", 404);

    // Toggle like
    const { data: existing } = await supabaseAdmin
      .from("PledgeLike")
      .select("id")
      .eq("pledgeId", pledgeId)
      .eq("ipHash", ipHash)
      .maybeSingle();

    if (existing) {
      // Unlike
      await supabaseAdmin.from("PledgeLike").delete().eq("id", existing.id);
      const { count } = await supabaseAdmin
        .from("PledgeLike")
        .select("id", { count: "exact", head: true })
        .eq("pledgeId", pledgeId);
      return apiSuccess({ hasLiked: false, likeCount: count ?? 0 });
    } else {
      // Like
      await supabaseAdmin.from("PledgeLike").insert({ pledgeId, ipHash });
      const { count } = await supabaseAdmin
        .from("PledgeLike")
        .select("id", { count: "exact", head: true })
        .eq("pledgeId", pledgeId);
      return apiSuccess({ hasLiked: true, likeCount: count ?? 0 });
    }
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
    const [{ count }, { data: myLike }] = await Promise.all([
      supabaseAdmin
        .from("PledgeLike")
        .select("id", { count: "exact", head: true })
        .eq("pledgeId", pledgeId),
      supabaseAdmin
        .from("PledgeLike")
        .select("id")
        .eq("pledgeId", pledgeId)
        .eq("ipHash", ipHash)
        .maybeSingle(),
    ]);
    return apiSuccess({ likeCount: count ?? 0, hasLiked: !!myLike });
  } catch (err) {
    console.error("[GET /api/pledges/[id]/like]", err);
    return apiError("좋아요 정보를 불러올 수 없습니다", 500);
  }
}
