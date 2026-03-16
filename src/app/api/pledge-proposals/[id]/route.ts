import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { apiSuccess, apiError } from "@/lib/api-utils";

/**
 * GET /api/pledge-proposals/[id]
 * Fetch a single 공약 제안 with its linked 민원 IDs.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { data, error } = await supabase
      .from("PledgeProposal")
      .select(
        `id, title, content, authorName, authorType, candidateId, status, createdAt,
         minwonLinks:PledgeProposalMinwon(minwonId),
         candidate:Candidate!candidateId(id, name, district)`
      )
      .eq("id", id)
      .neq("status", "deleted")
      .single();

    if (error || !data) return apiError("공약 제안을 찾을 수 없습니다", 404);
    return apiSuccess(data);
  } catch (err) {
    console.error("[GET /api/pledge-proposals/[id]]", err);
    return apiError("공약 제안을 불러올 수 없습니다", 500);
  }
}

/**
 * PATCH /api/pledge-proposals/[id]
 * Candidates (and admins) can accept or delete a 공약 제안 linked to them.
 * Body: { action: "accept" | "delete" }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session) return apiError("로그인이 필요합니다", 401);

    const candidateId = (session.user as { id?: string })?.id;
    const role        = (session.user as { role?: string })?.role;

    const { data: proposal, error: fetchErr } = await supabase
      .from("PledgeProposal")
      .select("id, candidateId, status")
      .eq("id", id)
      .single();

    if (fetchErr || !proposal) return apiError("공약 제안을 찾을 수 없습니다", 404);

    // Only the targeted candidate or an admin may manage
    if (role !== "admin" && proposal.candidateId !== candidateId) {
      return apiError("권한이 없습니다", 403);
    }

    const { action } = (await request.json()) as { action: "accept" | "delete" };
    if (action !== "accept" && action !== "delete") {
      return apiError("잘못된 action 값입니다", 400);
    }

    const newStatus = action === "accept" ? "accepted" : "deleted";
    const { error: updateErr } = await supabaseAdmin
      .from("PledgeProposal")
      .update({ status: newStatus })
      .eq("id", id);

    if (updateErr) {
      console.error("[PATCH /api/pledge-proposals/[id]] update:", updateErr);
      return apiError("공약 제안 처리에 실패했습니다", 500);
    }

    return apiSuccess({ id, status: newStatus });
  } catch (err) {
    console.error("[PATCH /api/pledge-proposals/[id]]", err);
    return apiError("공약 제안 처리에 실패했습니다", 500);
  }
}
