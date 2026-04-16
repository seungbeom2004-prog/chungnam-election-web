import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Return ALL active CTA configs + their issues in one cached response.
// Page-matching is done client-side, so this endpoint has a single cache key
// instead of one per URL — dramatically reducing Fluid Active CPU usage.
export async function GET() {
  const { data: configs, error } = await supabaseAdmin
    .from("CtaConfig")
    .select("*")
    .eq("isActive", true)
    .order("createdAt", { ascending: false });

  if (error || !configs || configs.length === 0) {
    const res = NextResponse.json({ configs: [] });
    res.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=120");
    return res;
  }

  // Fetch issues for configs that need them (single query, all issue IDs)
  const needsIssues = configs.some((c) => c.showIssues);
  let issues: { id: string; title: string; city: string | null; reportCount: number }[] = [];
  if (needsIssues) {
    const { data: issueData } = await supabaseAdmin
      .from("Issue")
      .select("id, title, city, reportCount")
      .eq("status", "active")
      .order("reportCount", { ascending: false })
      .limit(5);
    issues = issueData ?? [];
  }

  const result = configs.map((cfg) => ({
    ...cfg,
    issues: cfg.showIssues ? issues : [],
  }));

  const res = NextResponse.json({ configs: result });
  // Cache at CDN for 60 s — single cache key for all pages
  res.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=120");
  return res;
}
