import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    // Top 10 issues by reportCount
    const { data: topIssues, error: topErr } = await supabaseAdmin
      .from("Issue")
      .select("id, title, summary, category, city, dong, reportCount, createdAt")
      .eq("status", "active")
      .order("reportCount", { ascending: false })
      .limit(10);

    if (topErr) throw topErr;

    // All active issues for aggregation
    const { data: allActive, error: allErr } = await supabaseAdmin
      .from("Issue")
      .select("id, city, category, reportCount")
      .eq("status", "active");

    if (allErr) throw allErr;

    const issues = allActive ?? [];

    // City breakdown
    const cityMap: Record<string, number> = {};
    for (const issue of issues) {
      const city = issue.city || "미지정";
      cityMap[city] = (cityMap[city] || 0) + 1;
    }
    const cityBreakdown = Object.entries(cityMap)
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count);

    // Category breakdown
    const catMap: Record<string, number> = {};
    for (const issue of issues) {
      const cat = issue.category || "기타";
      catMap[cat] = (catMap[cat] || 0) + 1;
    }
    const categoryBreakdown = Object.entries(catMap)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    // Totals
    const totalIssues = issues.length;
    const totalReports = issues.reduce((sum, i) => sum + (i.reportCount ?? 0), 0);

    // Recent 5 issues
    const { data: recentIssues, error: recentErr } = await supabaseAdmin
      .from("Issue")
      .select("id, title, category, city, dong, reportCount, createdAt")
      .eq("status", "active")
      .order("createdAt", { ascending: false })
      .limit(5);

    if (recentErr) throw recentErr;

    return NextResponse.json({
      topIssues: topIssues ?? [],
      cityBreakdown,
      categoryBreakdown,
      totalIssues,
      totalReports,
      recentIssues: recentIssues ?? [],
    });
  } catch (err: unknown) {
    console.error("[GET /api/issues/stats] Error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
