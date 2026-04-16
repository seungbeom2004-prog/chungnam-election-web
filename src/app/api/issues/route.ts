import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city");
  const dong = searchParams.get("dong");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 100);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);

  // Get active issues
  let query = supabaseAdmin
    .from("Issue")
    .select("*")
    .eq("status", "active")
    .order("reportCount", { ascending: false })
    .range(offset, offset + limit - 1);

  if (city) query = query.eq("city", city);
  if (dong) query = query.eq("dong", dong);

  const { data: issues, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Compute actual reportCount (민원) and proposalCount (제안) from linked posts
  const issueIds = (issues ?? []).map((i) => i.id);
  const reportCounts: Record<string, number> = {};
  const proposalCounts: Record<string, number> = {};

  if (issueIds.length > 0) {
    const { data: counts } = await supabaseAdmin
      .from("ProposalPost")
      .select("issueId, postType")
      .in("issueId", issueIds)
      .neq("status", "deleted");

    if (counts) {
      for (const row of counts) {
        if (!row.issueId) continue;
        if (row.postType === "민원") {
          reportCounts[row.issueId] = (reportCounts[row.issueId] ?? 0) + 1;
        } else {
          proposalCounts[row.issueId] = (proposalCounts[row.issueId] ?? 0) + 1;
        }
      }
    }
  }

  const result = (issues ?? []).map((issue) => ({
    ...issue,
    reportCount: reportCounts[issue.id] ?? 0,
    proposalCount: proposalCounts[issue.id] ?? 0,
  }));

  const res = NextResponse.json({ data: result });
  // Issues change infrequently — cache at CDN for 60 s
  res.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=120");
  return res;
}
