import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { suggestNewIssues } from "@/lib/gemini";

export const maxDuration = 30; // Allow up to 30s for Gemini retries

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

  if (suggestions.length === 0) {
    return NextResponse.json({
      suggestions: [],
      totalUnassigned: posts.length,
      message: `${posts.length}개 미배정 게시물을 분석했지만 묶을 수 있는 이슈를 찾지 못했습니다. AI 서버가 일시적으로 응답하지 않을 수 있습니다. 잠시 후 다시 시도해주세요.`,
    });
  }

  return NextResponse.json({ suggestions, totalUnassigned: posts.length });
}
