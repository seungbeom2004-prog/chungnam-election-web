import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { suggestIssueMatch } from "@/lib/gemini";

export async function POST(req: Request) {
  try {
    const { content, city } = await req.json();
    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }

    // Fetch active issues
    let query = supabaseAdmin
      .from("Issue")
      .select("id, title, summary")
      .eq("status", "active")
      .order("reportCount", { ascending: false })
      .limit(20);

    if (city) {
      query = query.eq("city", city);
    }

    const { data: issues } = await query;
    if (!issues || issues.length === 0) {
      return NextResponse.json({ suggestions: [] });
    }

    const suggestions = await suggestIssueMatch(content, issues);

    // Enrich with titles
    const enriched = suggestions.map((s) => {
      const issue = issues.find((i) => i.id === s.issueId);
      return {
        issueId: s.issueId,
        title: issue?.title ?? "",
        confidence: s.confidence,
      };
    });

    return NextResponse.json({ suggestions: enriched });
  } catch (err) {
    console.error("[AI/suggest-issue] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
