import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { apiError } from "@/lib/api-utils";

// GET /api/categories — Public endpoint: returns visible categories only
export async function GET() {
  try {
    const { data: categories, error } = await supabase
      .from("Category")
      .select("id, name, description, emoji, color, iconImage")
      .eq("visible", true)
      .order("sortOrder");

    if (error) {
      console.error("[GET /api/categories] Supabase error:", error);
      return apiError("카테고리 목록을 불러올 수 없습니다", 500);
    }

    // Categories rarely change — cache at Vercel Edge for 5 min, stale for 10 min
    const res = NextResponse.json({ success: true, data: categories ?? [] });
    res.headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    return res;
  } catch (error) {
    console.error("[GET /api/categories]", error);
    return apiError("카테고리 목록을 불러올 수 없습니다", 500);
  }
}
