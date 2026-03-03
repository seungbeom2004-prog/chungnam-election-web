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

    return NextResponse.json({ success: true, data: elections ?? [] });
  } catch (error) {
    console.error("[GET /api/elections]", error);
    return apiError("선거 목록을 불러올 수 없습니다", 500);
  }
}
