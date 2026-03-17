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
    return NextResponse.json({ count: count ?? 0 });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
