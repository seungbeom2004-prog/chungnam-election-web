import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/** Public endpoint — returns today's total page-view count (no auth required). */
export async function GET() {
  try {
    const today = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"
    const { count, error } = await supabaseAdmin
      .from("PageView")
      .select("*", { count: "exact", head: true })
      .gte("createdAt", `${today}T00:00:00.000Z`);
    if (error) return NextResponse.json({ count: 0 });
    // Cache for 15s — visitor count doesn't need sub-second freshness
    const res = NextResponse.json({ count: count ?? 0 });
    res.headers.set("Cache-Control", "public, s-maxage=15, stale-while-revalidate=30");
    return res;
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
