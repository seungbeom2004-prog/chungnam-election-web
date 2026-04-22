import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { apiError, apiSuccess } from "@/lib/api-utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data: issue, error } = await supabaseAdmin
    .from("Issue")
    .select("*")
    .eq("id", id)
    .eq("status", "active")
    .single();

  if (error || !issue) {
    return NextResponse.json({ error: "Issue not found" }, { status: 404 });
  }

  // ── Linked posts (both 민원 and 제안) ──────────────────────────────────────
  const { data: posts } = await supabaseAdmin
    .from("ProposalPost")
    .select("id, title, content, authorName, postType, createdAt, latitude, longitude, dong, adminStatus")
    .eq("issueId", id)
    .neq("status", "deleted")
    .order("createdAt", { ascending: false })
    .limit(50);

  const linkedPosts = posts ?? [];

  // ── Explicitly registered pledges (IssuePledge table) ───────────────────
  type RelatedPledge = { id: string; title: string; candidateName: string; district: string; category?: string };
  let relatedPledges: RelatedPledge[] = [];

  try {
    const { data: issuePledges, error: ipErr } = await supabaseAdmin
      .from("IssuePledge")
      .select(`
        pledgeId,
        pledge:Pledge!pledgeId(
          id, title,
          candidate:Candidate!candidateId(id, name, district),
          category:Category!categoryId(name)
        )
      `)
      .eq("issueId", id)
      .order("createdAt", { ascending: true });

    if (!ipErr && issuePledges && issuePledges.length > 0) {
      relatedPledges = issuePledges.map(row => {
        const p = row.pledge as unknown as {
          id: string; title: string;
          candidate: { id: string; name: string; district: string } | null;
          category: { name: string } | null;
        } | null;
        return {
          id: p?.id ?? row.pledgeId,
          title: p?.title ?? "",
          candidateName: p?.candidate?.name ?? "후보자",
          district: p?.candidate?.district ?? "",
          category: p?.category?.name,
        };
      });
    } else {
      // Fallback: city-based matching (for issues with no explicitly registered pledges)
      const cityKeyword = issue.city ? issue.city.replace(/시$|군$/, "") : null;
      if (cityKeyword) {
        const { data: cityPledges } = await supabaseAdmin
          .from("Pledge")
          .select("id, title, candidate:Candidate!candidateId(id, name, district), category:Category!categoryId(name)")
          .eq("visible", true)
          .order("createdAt", { ascending: false })
          .limit(10);
        const filtered = (cityPledges ?? []).filter(p => {
          const cand = p.candidate as { district?: string } | null;
          return cand?.district?.includes(cityKeyword);
        }).slice(0, 5);
        relatedPledges = filtered.map(p => {
          const cand = p.candidate as unknown as { name: string; district: string } | null;
          const cat = p.category as unknown as { name: string } | null;
          return { id: p.id, title: p.title, candidateName: cand?.name ?? "후보자", district: cand?.district ?? "", category: cat?.name };
        });
      }
    }
  } catch {
    relatedPledges = [];
  }

  // ── Aggregate stats ───────────────────────────────────────────────────────
  const dongBreakdown: Record<string, number> = {};
  for (const post of linkedPosts) {
    if (post.dong) dongBreakdown[post.dong] = (dongBreakdown[post.dong] || 0) + 1;
  }
  const cityBreakdown: Record<string, number> = {};
  if (issue.city) cityBreakdown[issue.city] = linkedPosts.length;

  return NextResponse.json({
    data: {
      ...issue,
      reportCount: linkedPosts.filter(p => p.postType === "민원").length,
      posts: linkedPosts,
      relatedPledges,
      stats: { totalPostCount: linkedPosts.length, cityBreakdown, dongBreakdown },
    },
  });
}

/** PATCH /api/issues/[id] — candidates and admins can update emoji */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || !["candidate", "admin"].includes(user.role ?? "")) {
    return apiError("후보자 또는 관리자 로그인이 필요합니다", 401);
  }

  const body = await request.json().catch(() => ({}));

  // Candidates can only update emoji; admins can update more (via /api/admin/issues/[id])
  const allowedForCandidate = ["emoji"];
  const updates: Record<string, unknown> = {};

  for (const field of allowedForCandidate) {
    if (field in body) updates[field] = body[field];
  }

  if (Object.keys(updates).length === 0) {
    return apiError("수정할 필드가 없습니다 (emoji만 허용)", 400);
  }

  updates.updatedAt = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("Issue")
    .update(updates)
    .eq("id", id)
    .select("id, emoji")
    .single();

  if (error) {
    console.error("[PATCH /api/issues/[id]]", error);
    return apiError("이슈 수정에 실패했습니다", 500);
  }

  return apiSuccess(data);
}
