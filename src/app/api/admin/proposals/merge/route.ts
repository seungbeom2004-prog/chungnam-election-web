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
  const mergedContent = posts.map((p) => p.content).join("\n\n");
  const now = new Date().toISOString();

  // Update the first post with merged content
  const { error: updateErr } = await supabaseAdmin
    .from("ProposalPost")
    .update({ content: mergedContent })
    .eq("id", first.id);
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  // Delete the rest
  const restIds = ids.filter((id) => id !== first.id);
  const { error: delErr } = await supabaseAdmin
    .from("ProposalPost")
    .update({ status: "deleted", deletedAt: now })
    .in("id", restIds);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  return NextResponse.json({ success: true, mergedInto: first.id });
}
