import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { apiError, apiSuccess } from "@/lib/api-utils";

type RouteContext = { params: Promise<{ id: string }> };

/** POST /api/pledge-proposals/[id]/merge — 머지 (후보자 본인 또는 관리자) */
export async function POST(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;

  if (!user?.id) return apiError("로그인이 필요합니다", 401);

  const isAdmin = user.role === "admin";
  const isCandidate = user.role === "candidate";
  if (!isAdmin && !isCandidate) return apiError("권한이 없습니다", 403);

  // 제안 조회
  const { data: proposal, error: fetchErr } = await supabase
    .from("PledgeProposal")
    .select("id, status, candidateId")
    .eq("id", id)
    .single();

  if (fetchErr || !proposal) return apiError("공약 제안을 찾을 수 없습니다", 404);
  if (proposal.status === "deleted") return apiError("삭제된 제안입니다", 400);

  // 후보자는 본인 제안만 머지 가능
  if (isCandidate && proposal.candidateId !== user.id) {
    return apiError("본인의 제안만 머지할 수 있습니다", 403);
  }

  const body = await req.json().catch(() => ({})) as { pledgeId?: string };

  const now = new Date().toISOString();
  const { error: updateErr } = await supabaseAdmin
    .from("PledgeProposal")
    .update({
      status: "accepted",
      mergedAt: now,
      mergedBy: user.id,
      mergedPledgeId: body.pledgeId ?? null,
    })
    .eq("id", id);

  if (updateErr) return apiError("머지에 실패했습니다", 500);

  // pledgeId 있으면 PledgeToProposal 연결
  if (body.pledgeId) {
    await supabaseAdmin
      .from("PledgeToProposal")
      .upsert({ pledgeId: body.pledgeId, pledgeProposalId: id })
      .select();
  }

  return apiSuccess({ merged: true, pledgeId: body.pledgeId ?? null });
}
