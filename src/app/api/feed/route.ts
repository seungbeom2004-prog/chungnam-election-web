import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { apiError } from "@/lib/api-utils";
import { isCityCenterOnly, makeLocationLabel } from "@/lib/city-coordinates";

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
  // Multi-select: comma-separated values
  const cityList  = (searchParams.get("city") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const dongList  = (searchParams.get("dong") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  // dongType: "adm" | "legal" — null이면 둘 다 매칭
  const dongType  = searchParams.get("dongType");
  const issueFilter = searchParams.get("issueId");

  // Posts query — exclude deleted, include hidden (dashboards can audit them)
  let q = supabaseAdmin
    .from("ProposalPost")
    .select("id, title, content, authorName, postType, status, adminStatus, city, dong, legalDong, admDong, latitude, longitude, candidateId, parentId, issueId, createdAt")
    .neq("status", "deleted")
    .order("createdAt", { ascending: false })
    .limit(limit);

  if (postType === "민원" || postType === "제안") q = q.eq("postType", postType);
  if (cityList.length === 1) q = q.eq("city", cityList[0]);
  else if (cityList.length > 1) q = q.in("city", cityList);

  if (dongList.length > 0) {
    if (dongType === "adm") {
      q = dongList.length === 1 ? q.eq("admDong", dongList[0]) : q.in("admDong", dongList);
    } else if (dongType === "legal") {
      q = dongList.length === 1 ? q.eq("legalDong", dongList[0]) : q.in("legalDong", dongList);
    } else {
      // either column matches — use Supabase 'or' with quoted .in.()
      const quoted = dongList.map((d) => `"${d.replace(/"/g, '\\"')}"`).join(",");
      q = q.or(`admDong.in.(${quoted}),legalDong.in.(${quoted}),dong.in.(${quoted})`);
    }
  }
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
    const cityCenter = isCityCenterOnly(p.city, p.latitude, p.longitude);
    const dongLabel = cityCenter
      ? `${p.city} 전체`
      : (adm && legal
          ? (adm === legal ? adm : `${adm} (${legal})`)
          : (adm ?? legal ?? p.dong ?? null));
    const locationLabel = makeLocationLabel({
      city: p.city,
      admDong: adm,
      legalDong: legal,
      fallbackDong: p.dong,
      latitude: p.latitude,
      longitude: p.longitude,
    });
    const myResponses = responses.filter((r) => r.proposalId === p.id);
    const myLinks = minwonLinks.filter((l) => l.minwonId === p.id);
    const issue = p.issueId ? (issueMap.get(p.issueId as string) ?? null) : null;
    return {
      ...p,
      dongLabel,
      locationLabel,             // 시군구청 좌표면 "OO시 전체", 아니면 "city + dong"
      isCityCenterOnly: cityCenter,
      issue,                     // {id, title, category, emoji} | null
      responses: myResponses,
      linkedPledges: myLinks.map((l) => l.pledge).filter((x): x is { id: string; title: string } => !!x),
    };
  });

  // Distinct facets — fetched separately so the lists don't shrink as filters are applied.
  // For candidates, we restrict facet space to their accessible posts; for admin, full DB.
  let facetsQuery = supabaseAdmin
    .from("ProposalPost")
    .select("city, admDong, legalDong, dong, latitude, longitude")
    .neq("status", "deleted");
  if (user.role === "candidate") {
    facetsQuery = facetsQuery.or(`candidateId.eq.${user.id},candidateId.is.null`);
  }
  const { data: facetRows } = await facetsQuery.limit(5000);

  const facetCities    = new Set<string>();
  const facetAdmDongs  = new Set<string>();
  const facetLegalDongs= new Set<string>();
  const facetRawDongs  = new Set<string>();
  // city → 그 시군구에 속한 동들 (행정동/법정동 분리)
  const admDongsByCity:   Record<string, Set<string>> = {};
  const legalDongsByCity: Record<string, Set<string>> = {};

  for (const r of facetRows ?? []) {
    const c   = r.city as string | null;
    const adm = (r as { admDong?: string | null }).admDong;
    const leg = (r as { legalDong?: string | null }).legalDong;
    const lat = (r as { latitude?: number | null }).latitude;
    const lng = (r as { longitude?: number | null }).longitude;
    // 시군구청 기본 좌표만 찍힌 게시글의 동은 facet에서 제외 (사용자가 따로 위치 안 잡은 거)
    const cityCenter = isCityCenterOnly(c, lat, lng);
    if (c) facetCities.add(c);
    if (!cityCenter) {
      if (adm)  facetAdmDongs.add(adm);
      if (leg)  facetLegalDongs.add(leg);
      if (r.dong && !adm && !leg) facetRawDongs.add(r.dong as string);
      if (c && adm) {
        if (!admDongsByCity[c]) admDongsByCity[c] = new Set();
        admDongsByCity[c].add(adm);
      }
      if (c && leg) {
        if (!legalDongsByCity[c]) legalDongsByCity[c] = new Set();
        legalDongsByCity[c].add(leg);
      }
    }
  }

  const facets = {
    cities: Array.from(facetCities).sort((a, b) => a.localeCompare(b, "ko")),
    admDongs: Array.from(facetAdmDongs).sort((a, b) => a.localeCompare(b, "ko")),
    legalDongs: Array.from(facetLegalDongs).sort((a, b) => a.localeCompare(b, "ko")),
    rawDongs: Array.from(facetRawDongs).sort((a, b) => a.localeCompare(b, "ko")),
    admDongsByCity: Object.fromEntries(
      Object.entries(admDongsByCity).map(([k, s]) => [k, Array.from(s).sort((a, b) => a.localeCompare(b, "ko"))])
    ),
    legalDongsByCity: Object.fromEntries(
      Object.entries(legalDongsByCity).map(([k, s]) => [k, Array.from(s).sort((a, b) => a.localeCompare(b, "ko"))])
    ),
    issues: Array.from(issueMap.values()),
  };

  return NextResponse.json({ success: true, data: enriched, facets });
}
