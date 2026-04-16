import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

/** Returns the Monday 00:00:00 of the week containing `d` */
function getMondayOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const weekStartParam = searchParams.get("weekStart");

  let weekStart: Date;
  if (weekStartParam) {
    const parsed = new Date(weekStartParam);
    weekStart = isNaN(parsed.getTime()) ? getMondayOfWeek(new Date()) : parsed;
  } else {
    weekStart = getMondayOfWeek(new Date());
  }
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = addDays(weekStart, 6);
  weekEnd.setHours(23, 59, 59, 999);

  // Check Supabase cache for past weeks
  const cacheKey = `weekly-${weekStart.toISOString().split("T")[0]}`;
  const isPastWeek = weekEnd < new Date();
  if (isPastWeek) {
    const { data: cached } = await supabaseAdmin
      .from("StatsCache")
      .select("data")
      .eq("cacheKey", cacheKey)
      .single();
    if (cached?.data) {
      return NextResponse.json(cached.data);
    }
  }

  const prevStart = addDays(weekStart, -7);
  prevStart.setHours(0, 0, 0, 0);
  const prevEnd = addDays(weekStart, -1);
  prevEnd.setHours(23, 59, 59, 999);

  const startISO = weekStart.toISOString();
  const endISO = weekEnd.toISOString();

  // ─── 1. Posts this week ───────────────────────────────────────────────────
  let posts: {
    id: string;
    postType: string;
    city: string | null;
    dong?: string | null;
    issueId?: string | null;
    createdAt: string;
    title?: string | null;
    content?: string;
    authorName?: string;
    likeCount?: number;
    viewCount?: number;
  }[] = [];

  {
    // Try with extended fields (viewCount may not exist in older DBs)
    const { data: d1, error: e1 } = await supabaseAdmin
      .from("ProposalPost")
      .select("id, postType, city, dong, issueId, createdAt, title, content, authorName, viewCount")
      .gte("createdAt", startISO)
      .lte("createdAt", endISO)
      .is("deletedAt", null)
      .or("adminStatus.is.null,adminStatus.neq.hide_stats");

    if (!e1 && d1) {
      posts = d1;
    } else {
      // Fallback: without viewCount/dong/issueId
      const { data: d2, error: e2 } = await supabaseAdmin
        .from("ProposalPost")
        .select("id, postType, city, createdAt, title, content, authorName")
        .gte("createdAt", startISO)
        .lte("createdAt", endISO)
        .is("deletedAt", null)
        .or("adminStatus.is.null,adminStatus.neq.hide_stats");

      if (!e2 && d2) {
        posts = d2;
      } else {
        // Ultimate fallback: no adminStatus filter
        const { data: d3 } = await supabaseAdmin
          .from("ProposalPost")
          .select("id, postType, city, createdAt")
          .gte("createdAt", startISO)
          .lte("createdAt", endISO)
          .is("deletedAt", null);
        posts = d3 ?? [];
      }
    }
  }

  // ─── 2. Type counts ───────────────────────────────────────────────────────
  const REPORT_TYPES = ["불편제보", "민원"];
  const PROPOSAL_TYPES = ["공약제안", "제안", "공약"];

  const newReports = posts.filter((p) => REPORT_TYPES.includes(p.postType)).length;
  const newProposals = posts.filter((p) => PROPOSAL_TYPES.includes(p.postType)).length;
  const totalPosts = posts.length;

  // ─── 3. Prev-week comparison ──────────────────────────────────────────────
  const { data: prevPosts } = await supabaseAdmin
    .from("ProposalPost")
    .select("id, postType")
    .gte("createdAt", prevStart.toISOString())
    .lte("createdAt", prevEnd.toISOString())
    .is("deletedAt", null)
    .or("adminStatus.is.null,adminStatus.neq.hide_stats");

  const prevWeekReports = (prevPosts ?? []).filter((p) => REPORT_TYPES.includes(p.postType)).length;
  const prevWeekProposals = (prevPosts ?? []).filter((p) => PROPOSAL_TYPES.includes(p.postType)).length;

  // ─── 4. City breakdown ────────────────────────────────────────────────────
  const cityMap: Record<string, { reports: number; proposals: number }> = {};
  for (const p of posts) {
    const city = p.city ?? "기타";
    if (!cityMap[city]) cityMap[city] = { reports: 0, proposals: 0 };
    if (REPORT_TYPES.includes(p.postType)) cityMap[city].reports++;
    else if (PROPOSAL_TYPES.includes(p.postType)) cityMap[city].proposals++;
    else cityMap[city].proposals++; // fallback
  }
  const cityBreakdown = Object.entries(cityMap)
    .map(([city, c]) => ({ city, total: c.reports + c.proposals, reports: c.reports, proposals: c.proposals }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // ─── 5. Dong breakdown ────────────────────────────────────────────────────
  const dongMap: Record<string, number> = {};
  for (const p of posts) {
    const dong = (p as { dong?: string | null }).dong;
    if (dong) dongMap[dong] = (dongMap[dong] ?? 0) + 1;
  }
  let dongBreakdown = Object.entries(dongMap)
    .map(([dong, count]) => ({ dong, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // If no dong data from posts, use Issue.dong for active issues
  if (dongBreakdown.length === 0) {
    const { data: issueDong } = await supabaseAdmin
      .from("Issue")
      .select("dong, reportCount")
      .eq("status", "active")
      .not("dong", "is", null)
      .order("reportCount", { ascending: false })
      .limit(50);

    const dongFromIssues: Record<string, number> = {};
    for (const row of issueDong ?? []) {
      if (row.dong) dongFromIssues[row.dong] = (dongFromIssues[row.dong] ?? 0) + (row.reportCount ?? 1);
    }
    dongBreakdown = Object.entries(dongFromIssues)
      .map(([dong, count]) => ({ dong, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }

  // ─── 6. Hot issues this week ──────────────────────────────────────────────
  const issueCountMap: Record<string, number> = {};
  for (const p of posts) {
    const issueId = (p as { issueId?: string | null }).issueId;
    if (issueId) issueCountMap[issueId] = (issueCountMap[issueId] ?? 0) + 1;
  }
  const topIssueIds = Object.entries(issueCountMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);

  type HotIssue = {
    id: string;
    title: string;
    category: string | null;
    city: string | null;
    dong: string | null;
    reportCount: number;
    weekReports: number;
  };

  let hotIssues: HotIssue[] = [];
  if (topIssueIds.length > 0) {
    const { data: issueData } = await supabaseAdmin
      .from("Issue")
      .select("id, title, category, city, dong, reportCount")
      .in("id", topIssueIds);

    hotIssues = (issueData ?? [])
      .map((i) => ({ ...i, weekReports: issueCountMap[i.id] ?? 0 }))
      .sort((a, b) => b.weekReports - a.weekReports);
  }

  // Fallback: overall top issues
  if (hotIssues.length < 3) {
    const { data: topData } = await supabaseAdmin
      .from("Issue")
      .select("id, title, category, city, dong, reportCount")
      .eq("status", "active")
      .order("reportCount", { ascending: false })
      .limit(5);

    const fallbackIssues = (topData ?? [])
      .filter((i) => !hotIssues.some((h) => h.id === i.id))
      .map((i) => ({ ...i, weekReports: 0 }));
    hotIssues = [...hotIssues, ...fallbackIssues].slice(0, 5);
  }

  // ─── 7. Total views from Issue (viewCount if exists) ─────────────────────
  const { data: issueViews } = await supabaseAdmin
    .from("Issue")
    .select("viewCount")
    .not("viewCount", "is", null);
  const totalViews = (issueViews ?? []).reduce((s, r) => s + (r.viewCount ?? 0), 0);

  // ─── 8. Top liked posts (via ProposalLike for accurate counts) ───────────
  const postIds = posts.map(p => p.id);
  let likeCountMap: Record<string, number> = {};
  if (postIds.length > 0) {
    const { data: likeRows } = await supabaseAdmin
      .from("ProposalLike")
      .select("proposalId")
      .in("proposalId", postIds);
    for (const row of likeRows ?? []) {
      if (row.proposalId) likeCountMap[row.proposalId] = (likeCountMap[row.proposalId] ?? 0) + 1;
    }
  }

  // Merge real like counts into posts
  const postsWithLikes = posts.map(p => ({
    ...p,
    likeCount: likeCountMap[p.id] ?? (p.likeCount ?? 0),
  }));

  interface TopLikedPost {
    id: string;
    title: string | null;
    content: string;
    authorName: string;
    city: string | null;
    dong: string | null;
    postType: string;
    likeCount: number;
    viewCount: number;
  }

  const topLikedPosts: TopLikedPost[] = postsWithLikes
    .sort((a, b) => {
      const likeDiff = (b.likeCount ?? 0) - (a.likeCount ?? 0);
      if (likeDiff !== 0) return likeDiff;
      return (b.viewCount ?? 0) - (a.viewCount ?? 0);
    })
    .slice(0, 5)
    .map((p) => ({
      id: p.id,
      title: p.title ?? null,
      content: p.content ?? "",
      authorName: p.authorName ?? "",
      city: p.city ?? null,
      dong: (p as { dong?: string | null }).dong ?? null,
      postType: p.postType,
      likeCount: p.likeCount ?? 0,
      viewCount: p.viewCount ?? 0,
    }));

  const responsePayload = {
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    newReports,
    newProposals,
    totalPosts,
    totalViews,
    hotIssues,
    cityBreakdown,
    dongBreakdown,
    prevWeekReports,
    prevWeekProposals,
    topLikedPosts,
  };

  // Cache the result for past weeks
  if (isPastWeek) {
    try {
      await supabaseAdmin.from("StatsCache").upsert({
        cacheKey,
        data: responsePayload,
        createdAt: new Date().toISOString(),
      }, { onConflict: "cacheKey" });
    } catch { /* ignore cache write failures */ }
  }

  const res = NextResponse.json(responsePayload);
  if (isPastWeek) {
    // Past weeks never change — cache at Vercel Edge for 24h
    res.headers.set("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
  } else {
    // Current week — short cache (2 min) so fresh data shows quickly
    res.headers.set("Cache-Control", "public, s-maxage=120, stale-while-revalidate=300");
  }
  return res;
}
