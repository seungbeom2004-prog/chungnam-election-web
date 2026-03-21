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

  if (city) {
    query = query.eq("city", city);
  }
  if (dong) {
    query = query.eq("dong", dong);
  }

  const { data: issues, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Compute actual reportCount from linked posts
  const issueIds = (issues ?? []).map((i) => i.id);
  let postCounts: Record<string, number> = {};

  if (issueIds.length > 0) {
    const { data: counts } = await supabaseAdmin
      .from("ProposalPost")
      .select("issueId")
      .in("issueId", issueIds)
      .neq("status", "deleted");

    if (counts) {
      for (const row of counts) {
        if (row.issueId) {
          postCounts[row.issueId] = (postCounts[row.issueId] || 0) + 1;
        }
      }
    }
  }

  const result = (issues ?? []).map((issue) => ({
    ...issue,
    reportCount: postCounts[issue.id] || 0,
  }));

  return NextResponse.json({ data: result });
}
