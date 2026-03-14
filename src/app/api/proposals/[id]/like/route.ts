import { NextRequest } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { apiSuccess, apiError } from "@/lib/api-utils";

const IP_HASH_SALT = process.env.IP_HASH_SALT || "reform-chungnam-salt";

function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(ip + IP_HASH_SALT).digest("hex");
}

async function getLikeCount(proposalId: string): Promise<number> {
  const { count } = await supabaseAdmin
    .from("ProposalLike")
    .select("id", { count: "exact", head: true })
    .eq("proposalId", proposalId);
  return count ?? 0;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: proposalId } = await params;

    const rawIp =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      "127.0.0.1";
    const ipHash = hashIp(rawIp);

    // Try to insert; if duplicate (23505) then delete (toggle off)
    const { error: insertError } = await supabaseAdmin
      .from("ProposalLike")
      .insert({ proposalId, ipHash });

    if (insertError) {
      if (insertError.code === "23505") {
        // Already liked — remove the like
        const { error: deleteError } = await supabaseAdmin
          .from("ProposalLike")
          .delete()
          .eq("proposalId", proposalId)
          .eq("ipHash", ipHash);

        if (deleteError) {
          console.error("[POST /api/proposals/:id/like] Delete error:", deleteError);
          return apiError("좋아요 처리에 실패했습니다", 500);
        }

        const likeCount = await getLikeCount(proposalId);
        return apiSuccess({ liked: false, likeCount });
      }

      console.error("[POST /api/proposals/:id/like] Insert error:", insertError);
      return apiError("좋아요 처리에 실패했습니다", 500);
    }

    const likeCount = await getLikeCount(proposalId);
    return apiSuccess({ liked: true, likeCount });
  } catch (error) {
    console.error("[POST /api/proposals/:id/like]", error);
    return apiError("좋아요 처리에 실패했습니다", 500);
  }
}
