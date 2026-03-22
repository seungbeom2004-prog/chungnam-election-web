import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

function matchesPage(targetPages: string[], pathname: string): boolean {
  for (const pattern of targetPages) {
    if (pattern === "*") return true;
    if (pattern === pathname) return true;
    if (pattern.endsWith("*") && pathname.startsWith(pattern.slice(0, -1))) return true;
  }
  return false;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = searchParams.get("page") || "/";

  const { data: configs, error } = await supabaseAdmin
    .from("CtaConfig")
    .select("*")
    .eq("isActive", true)
    .order("createdAt", { ascending: false });

  if (error || !configs || configs.length === 0) {
    return NextResponse.json({ config: null });
  }

  const matching = configs.find((cfg) =>
    matchesPage(cfg.targetPages ?? ["*"], page)
  );

  if (!matching) {
    return NextResponse.json({ config: null });
  }

  let issues: { id: string; title: string; city: string | null; reportCount: number }[] = [];
  if (matching.showIssues) {
    const { data: issueData } = await supabaseAdmin
      .from("Issue")
      .select("id, title, city, reportCount")
      .eq("status", "active")
      .order("reportCount", { ascending: false })
      .limit(5);
    issues = issueData ?? [];
  }

  return NextResponse.json({ config: { ...matching, issues } });
}
