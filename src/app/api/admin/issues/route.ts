import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: issues, error } = await supabaseAdmin
    .from("Issue")
    .select("*")
    .order("reportCount", { ascending: false })
    .order("createdAt", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get assigned posts for each issue
  const issueIds = (issues ?? []).map((i) => i.id);
  const postsByIssue: Record<string, { id: string; title: string | null; content: string; authorName: string; postType?: string }[]> = {};

  if (issueIds.length > 0) {
    const { data: posts, error: postError } = await supabaseAdmin
      .from("ProposalPost")
      .select("id, title, content, authorName, postType, issueId")
      .in("issueId", issueIds)
      .neq("status", "deleted");

    if (!postError && posts) {
      for (const row of posts) {
        if (row.issueId) {
          if (!postsByIssue[row.issueId]) postsByIssue[row.issueId] = [];
          postsByIssue[row.issueId].push({
            id: row.id,
            title: row.title,
            content: row.content,
            authorName: row.authorName,
            postType: row.postType ?? undefined,
          });
        }
      }
    }
  }

  const result = (issues ?? []).map((issue) => {
    const assignedPosts = postsByIssue[issue.id] || [];
    return {
      ...issue,
      reportCount: assignedPosts.length,
      postCount: assignedPosts.length,
      assignedPosts,
    };
  });

  return NextResponse.json({ data: result });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { title, summary, category, dong, city } = body;

  if (!title || typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const newIssue = {
    id: crypto.randomUUID(),
    title: title.trim(),
    summary: summary?.trim() || null,
    category: category?.trim() || null,
    dong: dong?.trim() || null,
    city: city?.trim() || null,
    status: "active",
    reportCount: 0,
    adminStatus: null,
    createdAt: now,
    updatedAt: now,
  };

  const { data, error } = await supabaseAdmin
    .from("Issue")
    .insert(newIssue)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
