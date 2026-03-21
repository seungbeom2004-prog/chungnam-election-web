import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  if (!q || q.trim().length === 0) {
    return NextResponse.json({ data: [] });
  }

  const searchTerm = `%${q.trim()}%`;

  const { data, error } = await supabaseAdmin
    .from("Issue")
    .select("id, title, summary, category, dong, city, status, reportCount")
    .eq("status", "active")
    .or(`title.ilike.${searchTerm},summary.ilike.${searchTerm}`)
    .order("reportCount", { ascending: false })
    .limit(5);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}
