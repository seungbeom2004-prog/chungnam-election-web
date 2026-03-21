import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { suggestNewIssues } from "@/lib/gemini";

export async function POST() {
  // Fetch unassigned, non-deleted posts
  const { data: posts, error } = await supabaseAdmin
    .from("ProposalPost")
    .select("id, title, content, city")
    .is("issueId", null)
    .neq("status", "deleted")
    .order("createdAt", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!posts || posts.length === 0) {
    return NextResponse.json({ suggestions: [], message: "배정되지 않은 게시물이 없습니다." });
  }

  const suggestions = await suggestNewIssues(
    posts.map((p) => ({
      id: p.id,
      title: p.title ?? "",
      content: p.content ?? "",
      city: p.city ?? null,
    }))
  );

  return NextResponse.json({ suggestions, totalUnassigned: posts.length });
}
