import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { apiError } from "@/lib/api-utils";
import { reverseGeocodeDong } from "@/lib/reverse-geocode";

/**
 * GET /api/feed?postType=&candidateId=&limit=
 *
 * AI-friendly aggregated feed for dashboards. Returns posts (불편제보·공약제안)
 * with their candidate responses, linked pledges, and best-effort
 * 행정동/법정동 enrichment (via Naver reverse geocoding).
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
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "100", 10), 500);
  const postType = searchParams.get("postType"); // "민원" | "제안" | null
  const candidateFilter = searchParams.get("candidateId"); // admin only

  // Posts query — exclude deleted, include hidden (admin can review)
  let q = supabaseAdmin
    .from("ProposalPost")
    .select("id, title, content, authorName, postType, status, adminStatus, city, dong, latitude, longitude, candidateId, parentId, createdAt")
    .neq("status", "deleted")
    .order("createdAt", { ascending: false })
    .limit(limit);

  if (postType === "민원" || postType === "제안") q = q.eq("postType", postType);
  if (user.role === "candidate") {
    // Candidate sees only posts that mention their district OR are tagged to their candidateId
    q = q.or(`candidateId.eq.${user.id},candidateId.is.null`);
  } else if (candidateFilter) {
    q = q.eq("candidateId", candidateFilter);
  }

  const { data: posts, error } = await q;
  if (error) return apiError(error.message, 500);

  const postIds = (posts ?? []).map((p) => p.id);

  // Responses
  let responses: Array<{ proposalId: string; candidateName: string; status: string; content: string; officialResponse: string | null; pledgeId: string | null; createdAt: string }> = [];
  if (postIds.length > 0) {
    const { data: respData } = await supabaseAdmin
      .from("ProposalResponse")
      .select("proposalId, candidateName, status, content, officialResponse, pledgeId, createdAt")
      .in("proposalId", postIds)
      .order("createdAt", { ascending: true });
    responses = respData ?? [];
  }

  // Linked pledges (via PledgeToMinwon)
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

  // Reverse-geocode each unique lat/lng (cached)
  const uniqueCoords = new Map<string, { lat: number; lng: number }>();
  for (const p of posts ?? []) {
    if (typeof p.latitude === "number" && typeof p.longitude === "number") {
      uniqueCoords.set(`${p.latitude},${p.longitude}`, { lat: p.latitude, lng: p.longitude });
    }
  }
  const dongMap = new Map<string, string>();
  await Promise.all(
    Array.from(uniqueCoords.entries()).map(async ([k, { lat, lng }]) => {
      const r = await reverseGeocodeDong(lat, lng);
      if (r.formatted) dongMap.set(k, r.formatted);
    })
  );

  // Compose
  const enriched = (posts ?? []).map((p) => {
    const coordKey = p.latitude != null && p.longitude != null ? `${p.latitude},${p.longitude}` : null;
    const geocodedDong = coordKey ? dongMap.get(coordKey) : undefined;
    const dongLabel = geocodedDong || p.dong || null;
    const myResponses = responses.filter((r) => r.proposalId === p.id);
    const myLinks = minwonLinks.filter((l) => l.minwonId === p.id);
    return {
      ...p,
      dongLabel,           // "봉명1동 (봉명동)" 또는 "봉명동" 또는 raw dong
      responses: myResponses,
      linkedPledges: myLinks.map((l) => l.pledge).filter((x): x is { id: string; title: string } => !!x),
    };
  });

  return NextResponse.json({ success: true, data: enriched });
}
