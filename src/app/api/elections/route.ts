import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { apiError } from "@/lib/api-utils";

// GET /api/elections — List visible elections (public)
export async function GET(_request: NextRequest) {
  try {
    const { data: elections, error } = await supabase
      .from("Election")
      .select("id, name, type, description, sortOrder")
      .eq("visible", true)
      .order("sortOrder", { ascending: true });

    if (error) {
      console.error("[GET /api/elections] Supabase error:", error);
      return apiError("선거 목록을 불러올 수 없습니다", 500);
    }

    // Elections are essentially static — cache at Vercel Edge for 1 hour, stale for 2 hours
    const res = NextResponse.json({ success: true, data: elections ?? [] });
    res.headers.set("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=7200");
    return res;
  } catch (error) {
    console.error("[GET /api/elections]", error);
    return apiError("선거 목록을 불러올 수 없습니다", 500);
  }
}
