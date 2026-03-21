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

  // Get post counts for each issue
  const issueIds = (issues ?? []).map((i) => i.id);
  let postCounts: Record<string, number> = {};

  if (issueIds.length > 0) {
    const { data: counts, error: countError } = await supabaseAdmin
      .from("ProposalPost")
      .select("issueId")
      .in("issueId", issueIds)
      .neq("status", "deleted");

    if (!countError && counts) {
      for (const row of counts) {
        if (row.issueId) {
          postCounts[row.issueId] = (postCounts[row.issueId] || 0) + 1;
        }
      }
    }
  }

  const result = (issues ?? []).map((issue) => ({
    ...issue,
    postCount: postCounts[issue.id] || 0,
  }));

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
