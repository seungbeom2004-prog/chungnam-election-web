import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data: issue, error } = await supabaseAdmin
    .from("Issue")
    .select("*")
    .eq("id", id)
    .eq("status", "active")
    .single();

  if (error || !issue) {
    return NextResponse.json({ error: "Issue not found" }, { status: 404 });
  }

  // Get linked posts
  const { data: posts } = await supabaseAdmin
    .from("ProposalPost")
    .select(
      "id, title, content, authorName, postType, createdAt, latitude, longitude, dong, adminStatus"
    )
    .eq("issueId", id)
    .neq("status", "deleted")
    .order("createdAt", { ascending: false })
    .limit(50);

  const linkedPosts = posts ?? [];

  // Compute aggregate stats
  const totalPostCount = linkedPosts.length;

  const cityBreakdown: Record<string, number> = {};
  const dongBreakdown: Record<string, number> = {};

  for (const post of linkedPosts) {
    const postDong = post.dong;
    if (postDong) {
      dongBreakdown[postDong] = (dongBreakdown[postDong] || 0) + 1;
    }
  }

  // City breakdown from the issue's city or from posts (use issue city)
  if (issue.city) {
    cityBreakdown[issue.city] = totalPostCount;
  }

  return NextResponse.json({
    data: {
      ...issue,
      reportCount: totalPostCount,
      posts: linkedPosts,
      stats: {
        totalPostCount,
        cityBreakdown,
        dongBreakdown,
      },
    },
  });
}
