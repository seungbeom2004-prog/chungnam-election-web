import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { generateIssueSummary } from "@/lib/gemini";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== "admin") {
      return NextResponse.json({ error: "관리자 권한이 필요합니다" }, { status: 403 });
    }

    const { issueId } = await req.json();
    if (!issueId || typeof issueId !== "string") {
      return NextResponse.json({ error: "issueId is required" }, { status: 400 });
    }

    // Fetch issue
    const { data: issue } = await supabaseAdmin
      .from("Issue")
      .select("id, title")
      .eq("id", issueId)
      .single();

    if (!issue) {
      return NextResponse.json({ error: "Issue not found" }, { status: 404 });
    }

    // Fetch linked posts
    const { data: posts } = await supabaseAdmin
      .from("ProposalPost")
      .select("title, content")
      .eq("issueId", issueId)
      .neq("status", "deleted")
      .limit(10);

    if (!posts || posts.length === 0) {
      return NextResponse.json({ error: "No linked posts to summarize" }, { status: 400 });
    }

    const summary = await generateIssueSummary(issue.title, posts);
    return NextResponse.json({ summary });
  } catch (err) {
    console.error("[AI/summarize-issue] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
