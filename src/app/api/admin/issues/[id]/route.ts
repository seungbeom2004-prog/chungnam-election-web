import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const { data: issue, error } = await supabaseAdmin
    .from("Issue")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !issue) {
    return NextResponse.json({ error: "Issue not found" }, { status: 404 });
  }

  const { data: posts } = await supabaseAdmin
    .from("ProposalPost")
    .select("*")
    .eq("issueId", id)
    .neq("status", "deleted")
    .order("createdAt", { ascending: false });

  return NextResponse.json({ data: { ...issue, posts: posts ?? [] } });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const allowedFields = [
    "title",
    "summary",
    "category",
    "dong",
    "city",
    "status",
    "adminStatus",
  ];
  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 }
    );
  }

  updates.updatedAt = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("Issue")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
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

  // Unlink all posts from this issue first
  await supabaseAdmin
    .from("ProposalPost")
    .update({ issueId: null })
    .eq("issueId", id);

  // Hard delete the issue
  const { error } = await supabaseAdmin
    .from("Issue")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
