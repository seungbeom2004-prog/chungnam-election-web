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

  const prevStart = addDays(weekStart, -7);
  prevStart.setHours(0, 0, 0, 0);
  const prevEnd = addDays(weekStart, -1);
  prevEnd.setHours(23, 59, 59, 999);

  const startISO = weekStart.toISOString();
  const endISO = weekEnd.toISOString();

  // ─── 1. Posts this week ───────────────────────────────────────────────────
  // Try to fetch with dong; fall back gracefully
  let posts: {
    id: string;
    postType: string;
    city: string | null;
    dong?: string | null;
    issueId?: string | null;
    createdAt: string;
  }[] = [];

  {
    const { data, error } = await supabaseAdmin
      .from("ProposalPost")
      .select("id, postType, city, dong, issueId, createdAt")
      .gte("createdAt", startISO)
      .lte("createdAt", endISO)
      .is("deletedAt", null);

    if (!error && data) {
      posts = data;
    } else {
      // Fallback without dong/issueId
      const { data: d2 } = await supabaseAdmin
        .from("ProposalPost")
        .select("id, postType, city, createdAt")
        .gte("createdAt", startISO)
        .lte("createdAt", endISO)
        .is("deletedAt", null);
      posts = d2 ?? [];
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
    .is("deletedAt", null);

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
  // ProposalPost doesn't have viewCount, so we get views from Issue table
  const { data: issueViews } = await supabaseAdmin
    .from("Issue")
    .select("viewCount")
    .not("viewCount", "is", null);
  const totalViews = (issueViews ?? []).reduce((s, r) => s + (r.viewCount ?? 0), 0);

  return NextResponse.json({
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
  });
}
