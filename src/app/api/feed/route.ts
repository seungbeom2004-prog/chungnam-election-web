import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { apiError } from "@/lib/api-utils";

/**
 * GET /api/feed?postType=&candidateId=&city=&dong=&issueId=&limit=
 *
 * AI-friendly aggregated feed for dashboards. Reads legalDong/admDong directly
 * from DB (populated at insert time via reverse-geocode + 006 backfill) — no
 * runtime API calls, so this is fast even at 200+ posts.
 *
 * Auth: candidate or admin only.
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || (user.role !== "admin" && user.role !== "candidate")) {
    return apiError("로그인이 필요합니다", 401);
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "200", 10), 500);
  const postType = searchParams.get("postType");      // "민원" | "제안" | null
  const candidateFilter = searchParams.get("candidateId"); // admin only
  const cityFilter = searchParams.get("city");         // 시군구
  const dongFilter = searchParams.get("dong");         // 읍면동 (legal or adm 매칭)
  const issueFilter = searchParams.get("issueId");

  // Posts query — exclude deleted, include hidden (dashboards can audit them)
  let q = supabaseAdmin
    .from("ProposalPost")
    .select("id, title, content, authorName, postType, status, adminStatus, city, dong, legalDong, admDong, latitude, longitude, candidateId, parentId, issueId, createdAt")
    .neq("status", "deleted")
    .order("createdAt", { ascending: false })
    .limit(limit);

  if (postType === "민원" || postType === "제안") q = q.eq("postType", postType);
  if (cityFilter) q = q.eq("city", cityFilter);
  if (dongFilter) q = q.or(`legalDong.eq.${dongFilter},admDong.eq.${dongFilter},dong.eq.${dongFilter}`);
  if (issueFilter) q = q.eq("issueId", issueFilter);

  if (user.role === "candidate") {
    q = q.or(`candidateId.eq.${user.id},candidateId.is.null`);
  } else if (candidateFilter) {
    q = q.eq("candidateId", candidateFilter);
  }

  const { data: posts, error } = await q;
  if (error) return apiError(error.message, 500);

  const postIds = (posts ?? []).map((p) => p.id);

  // Responses (multi-stage, ordered)
  let responses: Array<{ proposalId: string; candidateName: string; status: string; content: string; officialResponse: string | null; pledgeId: string | null; createdAt: string }> = [];
  if (postIds.length > 0) {
    const { data: respData } = await supabaseAdmin
      .from("ProposalResponse")
      .select("proposalId, candidateName, status, content, officialResponse, pledgeId, createdAt")
      .in("proposalId", postIds)
      .order("createdAt", { ascending: true });
    responses = respData ?? [];
  }

  // Linked pledges (정식 공약 ↔ 민원/제안)
  let minwonLinks: Array<{ minwonId: string; pledgeId: string; pledge: { id: string; title: string } | null }> = [];
  if (postIds.length > 0) {
    const { data: linkData } = await supabaseAdmin
      .from("PledgeToMinwon")
      .select("minwonId, pledgeId, pledge:Pledge!pledgeId(id, title)")
      .in("minwonId", postIds);
    minwonLinks = (linkData ?? []).map((r) => ({
      minwonId: r.minwonId as string,
      pledgeId: r.pledgeId as string,
      pledge: Array.isArray(r.pledge) ? r.pledge[0] : (r.pledge as { id: string; title: string } | null),
    }));
  }

  // Issues
  const issueIds = Array.from(new Set((posts ?? []).map((p) => p.issueId).filter(Boolean))) as string[];
  const issueMap = new Map<string, { id: string; title: string; category: string | null; emoji: string | null }>();
  if (issueIds.length > 0) {
    const { data: issues } = await supabaseAdmin
      .from("Issue")
      .select("id, title, category, emoji")
      .in("id", issueIds);
    for (const i of issues ?? []) issueMap.set(i.id as string, i as { id: string; title: string; category: string | null; emoji: string | null });
  }

  // Compose
  const enriched = (posts ?? []).map((p) => {
    const adm = (p as { admDong?: string | null }).admDong ?? null;
    const legal = (p as { legalDong?: string | null }).legalDong ?? null;
    const dongLabel = adm && legal
      ? (adm === legal ? adm : `${adm} (${legal})`)
      : (adm ?? legal ?? p.dong ?? null);
    const myResponses = responses.filter((r) => r.proposalId === p.id);
    const myLinks = minwonLinks.filter((l) => l.minwonId === p.id);
    const issue = p.issueId ? (issueMap.get(p.issueId as string) ?? null) : null;
    return {
      ...p,
      dongLabel,
      issue,                     // {id, title, category, emoji} | null
      responses: myResponses,
      linkedPledges: myLinks.map((l) => l.pledge).filter((x): x is { id: string; title: string } => !!x),
    };
  });

  // Distinct facets (cities, dongs, issues) for filter UI population
  const facets = {
    cities: Array.from(new Set((posts ?? []).map((p) => p.city).filter(Boolean))) as string[],
    dongs: Array.from(new Set((posts ?? []).flatMap((p) => [
      (p as { admDong?: string | null }).admDong,
      (p as { legalDong?: string | null }).legalDong,
      p.dong,
    ]).filter(Boolean))) as string[],
    issues: Array.from(issueMap.values()),
  };

  return NextResponse.json({ success: true, data: enriched, facets });
}
