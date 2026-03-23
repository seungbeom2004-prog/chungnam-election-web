import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

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

  // ── Related pledges by city / candidate district ──────────────────────────
  type RelatedPledge = { id: string; title: string; candidateName: string; district: string; category?: string };
  let relatedPledges: RelatedPledge[] = [];

  try {
    // Try to find pledges from candidates in the same city
    const cityKeyword = issue.city ? issue.city.replace(/시$|군$/, "") : null;

    let pledgeQuery = supabaseAdmin
      .from("Pledge")
      .select("id, title, candidate:Candidate!candidateId(id, name, district), category:Category!categoryId(name)")
      .eq("visible", true)
      .order("createdAt", { ascending: false })
      .limit(5);

    if (cityKeyword) {
      const { data: cityPledges } = await pledgeQuery;
      const filtered = (cityPledges ?? []).filter(p => {
        const cand = p.candidate as { district?: string } | null;
        return cand?.district?.includes(cityKeyword);
      });
      if (filtered.length > 0) {
        relatedPledges = filtered.map(p => {
          const cand = p.candidate as unknown as { id: string; name: string; district: string } | null;
          const cat = p.category as unknown as { name: string } | null;
          return { id: p.id, title: p.title, candidateName: cand?.name ?? "후보자", district: cand?.district ?? "", category: cat?.name };
        });
      }
    }

    // Fallback: recent pledges
    if (relatedPledges.length === 0) {
      const { data: recentPledges } = await supabaseAdmin
        .from("Pledge")
        .select("id, title, candidate:Candidate!candidateId(id, name, district)")
        .eq("visible", true)
        .order("createdAt", { ascending: false })
        .limit(3);
      relatedPledges = (recentPledges ?? []).map(p => {
        const cand = p.candidate as unknown as { name: string; district: string } | null;
        return { id: p.id, title: p.title, candidateName: cand?.name ?? "후보자", district: cand?.district ?? "" };
      });
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
