import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { paragraphIndices } = body as { paragraphIndices?: number[] };

  // Fetch the original post
  const { data: original, error: fetchErr } = await supabaseAdmin
    .from("ProposalPost")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchErr || !original) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const content: string = original.content ?? "";
  const paragraphs = content.split(/\n\n+/);

  if (!paragraphIndices || paragraphIndices.length < 1) {
    return NextResponse.json({ error: "분할 위치를 1개 이상 선택해주세요" }, { status: 400 });
  }

  // Build groups of paragraphs for each new post
  const splitPoints = [...new Set([0, ...paragraphIndices])].sort((a, b) => a - b);
  const groups: string[][] = [];
  for (let i = 0; i < splitPoints.length; i++) {
    const start = splitPoints[i]!;
    const end = splitPoints[i + 1] ?? paragraphs.length;
    groups.push(paragraphs.slice(start, end));
  }

  if (groups.length < 2) {
    return NextResponse.json({ error: "분할 결과가 2개 이상이어야 합니다" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const newPosts = groups.map((g, i) => ({
    id: crypto.randomUUID(),
    title: original.title ? `${original.title} (${i + 1}/${groups.length})` : null,
    content: g.join("\n\n"),
    authorName: original.authorName,
    city: original.city ?? null,
    candidateId: original.candidateId ?? null,
    ipHash: original.ipHash ?? "",
    status: original.status ?? "pending",
    postType: original.postType ?? "제안",
    latitude: original.latitude ?? null,
    longitude: original.longitude ?? null,
    categoryId: original.categoryId ?? null,
    createdAt: now,
  }));

  // Insert new posts
  const { error: insertErr } = await supabaseAdmin.from("ProposalPost").insert(newPosts);
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  // Delete the original
  const { error: delErr } = await supabaseAdmin.from("ProposalPost").update({ status: "deleted", deletedAt: now }).eq("id", id);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  return NextResponse.json({ success: true, created: newPosts.length });
}
