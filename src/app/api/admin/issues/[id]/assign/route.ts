import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { postIds } = body;

  if (!Array.isArray(postIds) || postIds.length === 0) {
    return NextResponse.json(
      { error: "postIds must be a non-empty array" },
      { status: 400 }
    );
  }

  // Verify issue exists
  const { data: issue, error: issueError } = await supabaseAdmin
    .from("Issue")
    .select("id")
    .eq("id", id)
    .single();

  if (issueError || !issue) {
    return NextResponse.json({ error: "Issue not found" }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin
    .from("ProposalPost")
    .update({ issueId: id })
    .in("id", postIds)
    .select("id, title, issueId");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update reportCount on the issue
  const { count } = await supabaseAdmin
    .from("ProposalPost")
    .select("id", { count: "exact", head: true })
    .eq("issueId", id)
    .neq("status", "deleted");

  await supabaseAdmin
    .from("Issue")
    .update({ reportCount: count ?? 0, updatedAt: new Date().toISOString() })
    .eq("id", id);

  return NextResponse.json({ data: data ?? [], updatedCount: count ?? 0 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { postIds } = body;

  if (!Array.isArray(postIds) || postIds.length === 0) {
    return NextResponse.json(
      { error: "postIds must be a non-empty array" },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("ProposalPost")
    .update({ issueId: null })
    .in("id", postIds)
    .eq("issueId", id)
    .select("id, title, issueId");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update reportCount on the issue
  const { count } = await supabaseAdmin
    .from("ProposalPost")
    .select("id", { count: "exact", head: true })
    .eq("issueId", id)
    .neq("status", "deleted");

  await supabaseAdmin
    .from("Issue")
    .update({ reportCount: count ?? 0, updatedAt: new Date().toISOString() })
    .eq("id", id);

  return NextResponse.json({ data: data ?? [], updatedCount: count ?? 0 });
}
