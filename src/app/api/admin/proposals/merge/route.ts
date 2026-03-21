import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { ids } = body as { ids?: string[] };

  if (!ids || ids.length < 2) {
    return NextResponse.json({ error: "2개 이상의 게시물을 선택해주세요" }, { status: 400 });
  }

  // Fetch all posts in order
  const { data: posts, error: fetchErr } = await supabaseAdmin
    .from("ProposalPost")
    .select("*")
    .in("id", ids)
    .order("createdAt", { ascending: true });

  if (fetchErr || !posts || posts.length < 2) {
    return NextResponse.json({ error: "게시물을 찾을 수 없습니다" }, { status: 404 });
  }

  const first = posts[0]!;
  const mergedContent = posts.map((p) => p.content ?? "").join("\n\n");
  const now = new Date().toISOString();

  // Update the first post with merged content
  const { error: updateErr } = await supabaseAdmin
    .from("ProposalPost")
    .update({ content: mergedContent })
    .eq("id", first.id);
  if (updateErr) return NextResponse.json({ error: `병합 내용 저장 실패: ${updateErr.message}` }, { status: 500 });

  // Delete the rest — use posts array (not original ids) to avoid stale references
  const restIds = posts.slice(1).map((p) => p.id);
  if (restIds.length === 0) {
    return NextResponse.json({ error: "삭제할 게시물이 없습니다" }, { status: 400 });
  }
  const { error: delErr } = await supabaseAdmin
    .from("ProposalPost")
    .update({ status: "deleted", deletedAt: now })
    .in("id", restIds);
  if (delErr) return NextResponse.json({ error: `나머지 게시물 삭제 실패: ${delErr.message}` }, { status: 500 });

  return NextResponse.json({ success: true, mergedInto: first.id });
}
