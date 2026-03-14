import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { apiSuccess, apiError } from "@/lib/api-utils";

async function resolveProposal(proposalId: string) {
  const { data, error } = await supabaseAdmin
    .from("ProposalPost")
    .select("id, candidateId, status")
    .eq("id", proposalId)
    .single();
  if (error || !data) return null;
  return data;
}

async function canManage(
  session: { user: { id: string; role?: string } },
  proposal: { candidateId: string | null }
): Promise<boolean> {
  const userId = session.user.id;
  const userRole = session.user.role;
  if (userRole === "admin") return true;
  return proposal.candidateId === userId;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return apiError("로그인이 필요합니다", 401);
    }

    const { id } = await params;
    const proposal = await resolveProposal(id);
    if (!proposal) {
      return apiError("제안을 찾을 수 없습니다", 404);
    }

    const user = session.user as { id: string; role?: string };
    if (!(await canManage({ user }, proposal))) {
      return apiError("권한이 없습니다", 403);
    }

    const body = await request.json();
    const action: string = body.action;

    if (action !== "accept" && action !== "delete") {
      return apiError("올바른 action을 지정해주세요 (accept 또는 delete)", 400);
    }

    const now = new Date().toISOString();
    const updatePayload =
      action === "accept"
        ? { status: "accepted", acceptedAt: now }
        : { status: "deleted", deletedAt: now };

    const { data: updated, error } = await supabaseAdmin
      .from("ProposalPost")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[PATCH /api/proposals/:id] Supabase error:", error);
      return apiError("제안 상태 변경에 실패했습니다", 500);
    }

    return apiSuccess(updated);
  } catch (error) {
    console.error("[PATCH /api/proposals/:id]", error);
    return apiError("제안 상태 변경에 실패했습니다", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return apiError("로그인이 필요합니다", 401);
    }

    const { id } = await params;
    const proposal = await resolveProposal(id);
    if (!proposal) {
      return apiError("제안을 찾을 수 없습니다", 404);
    }

    const user = session.user as { id: string; role?: string };
    if (!(await canManage({ user }, proposal))) {
      return apiError("권한이 없습니다", 403);
    }

    const now = new Date().toISOString();
    const { data: updated, error } = await supabaseAdmin
      .from("ProposalPost")
      .update({ status: "deleted", deletedAt: now })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[DELETE /api/proposals/:id] Supabase error:", error);
      return apiError("제안 삭제에 실패했습니다", 500);
    }

    return apiSuccess(updated);
  } catch (error) {
    console.error("[DELETE /api/proposals/:id]", error);
    return apiError("제안 삭제에 실패했습니다", 500);
  }
}
