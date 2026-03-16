import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { apiError } from "@/lib/api-utils";

// GET /api/districts — Public endpoint: returns visible districts only
export async function GET() {
  try {
    const { data: districts, error } = await supabase
      .from("District")
      .select("id, name, code, centerLat, centerLng, sortOrder")
      .eq("visible", true)
      .order("sortOrder", { ascending: true });

    if (error) {
      console.error("[GET /api/districts] Supabase error:", error);
      return apiError("지역 목록을 불러올 수 없습니다", 500);
    }

    const response = NextResponse.json({ success: true, data: districts ?? [] });
    // Districts change rarely — cache for 5 minutes
    response.headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    return response;
  } catch (error) {
    console.error("[GET /api/districts]", error);
    return apiError("지역 목록을 불러올 수 없습니다", 500);
  }
}
