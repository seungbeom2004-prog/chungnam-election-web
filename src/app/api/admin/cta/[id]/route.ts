import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

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
  const {
    headline,
    subtext,
    targetPages,
    triggerDelay,
    cooldownHours,
    maxShows,
    showIssues,
    ctaUrl,
    ctaLabel,
    isActive,
  } = body;

  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (headline !== undefined) updates.headline = headline;
  if (subtext !== undefined) updates.subtext = subtext;
  if (targetPages !== undefined) updates.targetPages = targetPages;
  if (triggerDelay !== undefined) updates.triggerDelay = triggerDelay;
  if (cooldownHours !== undefined) updates.cooldownHours = cooldownHours;
  if (maxShows !== undefined) updates.maxShows = maxShows;
  if (showIssues !== undefined) updates.showIssues = showIssues;
  if (ctaUrl !== undefined) updates.ctaUrl = ctaUrl;
  if (ctaLabel !== undefined) updates.ctaLabel = ctaLabel;
  if (isActive !== undefined) updates.isActive = isActive;

  const { data, error } = await supabaseAdmin
    .from("CtaConfig")
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
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { error } = await supabaseAdmin
    .from("CtaConfig")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
