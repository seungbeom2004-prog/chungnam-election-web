import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { apiError, apiSuccess } from "@/lib/api-utils";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/proposals/[id]/link-pledge
 * Body: { pledgeId: string | null }   // null = unlink
 *
 * Links a 불편제보 / 공약제안 (ProposalPost) to an official Pledge.
 * - 민원(postType='민원') → PledgeToMinwon
 * - 제안(postType='제안') → uses PledgeProposal middle-layer (creates one if needed)
 *
 * Side effects on link:
 *   - ProposalPost.adminStatus = 'adopted' (자동 "공약 반영" 상태로 변환)
 *   - ProposalResponse — 후보자가 "공약 반영 완료" 단계 답변을 자동 추가 (없을 때만)
 *
 * Auth: candidate or admin only.
 */
export async function POST(req: NextRequest, { params }: RouteContext) {
  const { id: proposalId } = await params;
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; name?: string; role?: string } | undefined;

  if (!user?.id || (user.role !== "candidate" && user.role !== "admin")) {
    return apiError("로그인이 필요합니다", 401);
  }

  const body = await req.json().catch(() => ({}));
  const pledgeId = typeof body.pledgeId === "string" ? body.pledgeId : null;

  // Fetch the proposal post
  const { data: post, error: postErr } = await supabaseAdmin
    .from("ProposalPost")
    .select("id, postType, candidateId")
    .eq("id", proposalId)
    .single();
  if (postErr || !post) return apiError("게시글을 찾을 수 없습니다", 404);

  const isMinwon = post.postType === "민원";

  // ───── UNLINK ─────
  if (!pledgeId) {
    if (isMinwon) {
      await supabaseAdmin.from("PledgeToMinwon").delete().eq("minwonId", proposalId);
    } else {
      // Unlink all PledgeToProposal rows whose pledgeProposal points at this post.
      // The post is referenced via PledgeProposalMinwon (post is a 민원 row) — for 제안 posts,
      // the link is direct via a synthesized PledgeProposal. Look up the proposal mapping.
      const { data: pp } = await supabaseAdmin
        .from("PledgeProposalMinwon")
        .select("pledgeProposalId")
        .eq("minwonId", proposalId);
      const ids = (pp ?? []).map(r => r.pledgeProposalId);
      if (ids.length > 0) {
        await supabaseAdmin.from("PledgeToProposal").delete().in("pledgeProposalId", ids);
      }
    }
    // Reset adminStatus
    await supabaseAdmin.from("ProposalPost").update({ adminStatus: null }).eq("id", proposalId);
    return apiSuccess({ unlinked: true });
  }

  // ───── LINK ─────
  // Verify pledge exists & belongs to (or is owned by) the requester if candidate
  const { data: pledge, error: pErr } = await supabaseAdmin
    .from("Pledge")
    .select("id, candidateId")
    .eq("id", pledgeId)
    .single();
  if (pErr || !pledge) return apiError("공약을 찾을 수 없습니다", 404);

  if (user.role === "candidate" && pledge.candidateId !== user.id) {
    return apiError("본인의 공약만 연결할 수 있습니다", 403);
  }

  if (isMinwon) {
    // PledgeToMinwon: 민원 1개 → 공약 1개 (unique on minwonId)
    await supabaseAdmin.from("PledgeToMinwon").delete().eq("minwonId", proposalId);
    const { error: linkErr } = await supabaseAdmin
      .from("PledgeToMinwon")
      .insert({ id: crypto.randomUUID(), pledgeId, minwonId: proposalId });
    if (linkErr) return apiError(linkErr.message, 500);
  } else {
    // 제안 → PledgeProposal middle-layer
    let { data: pp } = await supabaseAdmin
      .from("PledgeProposalMinwon")
      .select("pledgeProposalId")
      .eq("minwonId", proposalId)
      .maybeSingle();

    let pledgeProposalId = pp?.pledgeProposalId;

    if (!pledgeProposalId) {
      // Create a PledgeProposal that wraps this post
      const { data: postFull } = await supabaseAdmin
        .from("ProposalPost")
        .select("title, content, authorName, candidateId, ipHash")
        .eq("id", proposalId)
        .single();
      const newId = crypto.randomUUID();
      const { error: ppErr } = await supabaseAdmin.from("PledgeProposal").insert({
        id: newId,
        title: postFull?.title || "공약 제안",
        content: postFull?.content || "",
        authorName: postFull?.authorName || "방문자",
        authorType: postFull?.candidateId ? "candidate" : "visitor",
        candidateId: postFull?.candidateId ?? null,
        ipHash: postFull?.ipHash ?? null,
        status: "accepted",
        createdAt: new Date().toISOString(),
      });
      if (ppErr) return apiError(ppErr.message, 500);

      await supabaseAdmin.from("PledgeProposalMinwon").insert({
        id: crypto.randomUUID(),
        pledgeProposalId: newId,
        minwonId: proposalId,
        createdAt: new Date().toISOString(),
      });
      pledgeProposalId = newId;
    }

    // Now link PledgeToProposal (unique on pledgeProposalId)
    await supabaseAdmin.from("PledgeToProposal").delete().eq("pledgeProposalId", pledgeProposalId);
    const { error: linkErr } = await supabaseAdmin
      .from("PledgeToProposal")
      .insert({
        id: crypto.randomUUID(),
        pledgeId,
        pledgeProposalId,
        createdAt: new Date().toISOString(),
      });
    if (linkErr) return apiError(linkErr.message, 500);
  }

  // Side-effect: set adminStatus to 'adopted' (= "공약 반영")
  await supabaseAdmin.from("ProposalPost").update({ adminStatus: "adopted" }).eq("id", proposalId);

  // Side-effect: auto-add a "공약 반영 완료" response from the candidate (if they don't have one yet)
  if (user.role === "candidate") {
    const { data: existing } = await supabaseAdmin
      .from("ProposalResponse")
      .select("id")
      .eq("proposalId", proposalId)
      .eq("candidateId", user.id)
      .eq("status", "공약 반영 완료")
      .maybeSingle();
    if (!existing) {
      const { data: candidateRow } = await supabaseAdmin
        .from("Candidate")
        .select("name, profileImage")
        .eq("id", user.id)
        .single();
      const now = new Date().toISOString();
      await supabaseAdmin.from("ProposalResponse").insert({
        id: crypto.randomUUID(),
        proposalId,
        candidateId: user.id,
        candidateName: candidateRow?.name ?? user.name ?? "후보자",
        candidateProfileImage: candidateRow?.profileImage ?? null,
        status: "공약 반영 완료",
        content: "정식 공약과 연결되었습니다.",
        pledgeId,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  return apiSuccess({ linked: true, pledgeId });
}
