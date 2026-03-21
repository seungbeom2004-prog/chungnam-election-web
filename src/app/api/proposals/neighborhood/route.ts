import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city");

  let query = supabase
    .from("ProposalPost")
    .select("city, dong, postType, latitude, longitude")
    .neq("status", "deleted")
    .not("latitude", "is", null);

  if (city) query = query.ilike("city", `${city}%`);

  const { data, error } = await query;
  if (error) {
    // Migration not applied yet
    if (["42703", "42P01", "PGRST200", "PGRST204"].includes(error.code)) {
      return NextResponse.json({ success: true, data: [] });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Count per city
  const cityMap: Record<string, { city: string; minwon: number; proposal: number; total: number }> = {};

  for (const row of (data ?? [])) {
    const key = row.city ?? "기타";
    if (!cityMap[key]) cityMap[key] = { city: key, minwon: 0, proposal: 0, total: 0 };
    if (row.postType === "민원") cityMap[key].minwon++;
    else cityMap[key].proposal++;
    cityMap[key].total++;
  }

  // Count per dong (fine-grained)
  const dongMap: Record<string, { dong: string; city: string; minwon: number; proposal: number; total: number }> = {};
  for (const row of (data ?? [])) {
    if (!row.dong) continue;
    const key = row.dong;
    if (!dongMap[key]) dongMap[key] = { dong: key, city: row.city ?? "기타", minwon: 0, proposal: 0, total: 0 };
    if (row.postType === "민원") dongMap[key].minwon++;
    else dongMap[key].proposal++;
    dongMap[key].total++;
  }

  const byCity = Object.values(cityMap).sort((a, b) => b.total - a.total);
  const byDong = Object.values(dongMap).sort((a, b) => b.total - a.total);

  return NextResponse.json({ success: true, byCity, byDong });
}
