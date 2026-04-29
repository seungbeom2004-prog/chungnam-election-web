import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { ZodError } from "zod";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { updatePledgeSchema } from "@/lib/validations";
import { apiSuccess, apiError, apiValidationError } from "@/lib/api-utils";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { data: pledge, error } = await supabase
      .from("Pledge")
      .select("*, candidate:Candidate!candidateId(id, name, district, profileImage), category:Category!categoryId(id, name, emoji, color, iconImage), collaborators:PledgeCollaboration!pledgeId(id, candidateId, candidate:Candidate!candidateId(id, name, district, profileImage))")
      .eq("id", id)
      .eq("visible", true)
      .single();
    if (error || !pledge) return apiError("공약을 찾을 수 없습니다", 404);

    // Fetch linked complaints/proposals (정식 공약 ↔ 민원/제안 연결)
    const { supabaseAdmin: adminClient } = await import("@/lib/supabaseAdmin");
    const linkedMinwonsRes = await adminClient
      .from("PledgeToMinwon")
      .select("minwonId, createdAt")
      .eq("pledgeId", id);
    const minwonIds = (linkedMinwonsRes.data ?? []).map(r => r.minwonId);

    const linkedProposalsRes = await adminClient
      .from("PledgeToProposal")
      .select("pledgeProposalId, createdAt")
      .eq("pledgeId", id);
    const ppIds = (linkedProposalsRes.data ?? []).map(r => r.pledgeProposalId);

    // For 제안 mid-layer, follow PledgeProposalMinwon back to ProposalPost ids
    let proposalPostIds: string[] = [];
    if (ppIds.length > 0) {
      const { data: ppMinwons } = await adminClient
        .from("PledgeProposalMinwon")
        .select("minwonId")
        .in("pledgeProposalId", ppIds);
      proposalPostIds = (ppMinwons ?? []).map(r => r.minwonId);
    }

    const allLinkedPostIds = [...new Set([...minwonIds, ...proposalPostIds])];
    let linkedPosts: Array<{ id: string; title: string | null; content: string; authorName: string; postType: string | null; createdAt: string; city: string | null }> = [];
    if (allLinkedPostIds.length > 0) {
      const { data: posts } = await adminClient
        .from("ProposalPost")
        .select("id, title, content, authorName, postType, createdAt, city")
        .in("id", allLinkedPostIds)
        .neq("status", "deleted");
      linkedPosts = posts ?? [];
    }

    return apiSuccess({ ...pledge, linkedPosts });
  } catch (error) {
    console.error("[GET /api/pledges/:id]", error);
    return apiError("공약을 불러올 수 없습니다", 500);
  }
}

async function verifyOwnership(pledgeId: string, userId: string) {
  const { data } = await supabaseAdmin
    .from("Pledge")
    .select("candidateId")
    .eq("id", pledgeId)
    .single();
  return data && data.candidateId === userId;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return apiError("로그인이 필요합니다", 401);
    }

    const { id } = await params;
    const userId = (session.user as { id: string }).id;
    const isOwner = await verifyOwnership(id, userId);
    if (!isOwner) {
      return apiError("권한이 없습니다", 403);
    }

    const body = await request.json();
    const validated = updatePledgeSchema.parse(body);

    const { data: updated, error } = await supabaseAdmin
      .from("Pledge")
      .update({ ...validated, updatedAt: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[PUT /api/pledges/:id] Supabase error:", error);
      return apiError("공약 수정에 실패했습니다", 500);
    }

    return apiSuccess(updated);
  } catch (error) {
    if (error instanceof ZodError) return apiValidationError(error);
    console.error("[PUT /api/pledges/:id]", error);
    return apiError("공약 수정에 실패했습니다", 500);
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
    const userId = (session.user as { id: string }).id;
    const isOwner = await verifyOwnership(id, userId);
    if (!isOwner) {
      return apiError("권한이 없습니다", 403);
    }

    const { error } = await supabaseAdmin
      .from("Pledge")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[DELETE /api/pledges/:id] Supabase error:", error);
      return apiError("공약 삭제에 실패했습니다", 500);
    }

    return apiSuccess({ deleted: true });
  } catch (error) {
    console.error("[DELETE /api/pledges/:id]", error);
    return apiError("공약 삭제에 실패했습니다", 500);
  }
}
