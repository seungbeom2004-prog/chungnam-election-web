import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    // 1. Total post counts by type
    const { data: postCounts } = await supabaseAdmin
      .from("ProposalPost")
      .select("postType")
      .is("deletedAt", null)
      .or("adminStatus.is.null,adminStatus.neq.hide_stats");

    const REPORT_TYPES = ["불편제보", "민원"];
    const PROPOSAL_TYPES = ["공약제안", "제안", "공약"];
    const allPosts = postCounts ?? [];
    const totalReports = allPosts.filter(p => REPORT_TYPES.includes(p.postType)).length;
    const totalProposals = allPosts.filter(p => PROPOSAL_TYPES.includes(p.postType)).length;

    // 2. Issue counts by adminStatus
    const { data: issues } = await supabaseAdmin
      .from("Issue")
      .select("adminStatus, status, city");

    const allIssues = issues ?? [];
    const totalIssues = allIssues.length;
    const issuesByStatus = {
      reviewing: allIssues.filter(i => !i.adminStatus).length,
      planned: allIssues.filter(i => i.adminStatus === "planned").length,
      complaint_resolved: allIssues.filter(i => i.adminStatus === "complaint_resolved").length,
      adopted: allIssues.filter(i => i.adminStatus === "adopted").length,
    };
    const resolvedIssues = issuesByStatus.complaint_resolved + issuesByStatus.adopted;

    // 3. City breakdown (cumulative)
    const { data: cityPosts } = await supabaseAdmin
      .from("ProposalPost")
      .select("city, postType")
      .is("deletedAt", null)
      .not("city", "is", null);

    const cityMap: Record<string, { reports: number; proposals: number }> = {};
    for (const p of cityPosts ?? []) {
      const city = p.city ?? "기타";
      if (!cityMap[city]) cityMap[city] = { reports: 0, proposals: 0 };
      if (REPORT_TYPES.includes(p.postType)) cityMap[city].reports++;
      else if (PROPOSAL_TYPES.includes(p.postType)) cityMap[city].proposals++;
    }
    const cityBreakdown = Object.entries(cityMap)
      .map(([city, v]) => ({ city, reports: v.reports, proposals: v.proposals, total: v.reports + v.proposals }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 15);

    // 4. Daily trend for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentPosts } = await supabaseAdmin
      .from("ProposalPost")
      .select("postType, createdAt")
      .gte("createdAt", thirtyDaysAgo.toISOString())
      .is("deletedAt", null)
      .or("adminStatus.is.null,adminStatus.neq.hide_stats");

    const dailyMap: Record<string, { reports: number; proposals: number }> = {};
    for (const p of recentPosts ?? []) {
      const day = p.createdAt.split("T")[0];
      if (!dailyMap[day]) dailyMap[day] = { reports: 0, proposals: 0 };
      if (REPORT_TYPES.includes(p.postType)) dailyMap[day].reports++;
      else if (PROPOSAL_TYPES.includes(p.postType)) dailyMap[day].proposals++;
    }
    const dailyTrend = Object.entries(dailyMap)
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Cache at Vercel Edge for 3 min — cumulative stats don't need real-time precision
    const res = NextResponse.json({
      totalReports,
      totalProposals,
      totalPosts: totalReports + totalProposals,
      totalIssues,
      resolvedIssues,
      issuesByStatus,
      cityBreakdown,
      dailyTrend,
    });
    res.headers.set("Cache-Control", "public, s-maxage=180, stale-while-revalidate=360");
    return res;
  } catch (err) {
    console.error("[GET /api/cumulative-stats]", err);
    return NextResponse.json({ error: "통계 로드 실패" }, { status: 500 });
  }
}
