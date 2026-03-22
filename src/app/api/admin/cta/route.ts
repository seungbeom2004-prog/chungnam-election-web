import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("CtaConfig")
    .select("*")
    .order("createdAt", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  if (!headline || typeof headline !== "string" || headline.trim().length === 0) {
    return NextResponse.json({ error: "headline is required" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const newConfig = {
    id: crypto.randomUUID(),
    headline: headline.trim(),
    subtext: subtext?.trim() || null,
    targetPages: Array.isArray(targetPages) ? targetPages : ["*"],
    triggerDelay: typeof triggerDelay === "number" ? triggerDelay : 30,
    cooldownHours: typeof cooldownHours === "number" ? cooldownHours : 24,
    maxShows: typeof maxShows === "number" ? maxShows : 3,
    showIssues: typeof showIssues === "boolean" ? showIssues : true,
    ctaUrl: ctaUrl?.trim() || "/proposals",
    ctaLabel: ctaLabel?.trim() || "나도 제보하러 가기",
    isActive: typeof isActive === "boolean" ? isActive : true,
    createdAt: now,
    updatedAt: now,
  };

  const { data, error } = await supabaseAdmin
    .from("CtaConfig")
    .insert(newConfig)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
