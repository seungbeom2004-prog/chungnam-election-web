import { supabase } from "@/lib/supabase";
import { apiSuccess, apiError } from "@/lib/api-utils";

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

    return apiSuccess(districts ?? []);
  } catch (error) {
    console.error("[GET /api/districts]", error);
    return apiError("지역 목록을 불러올 수 없습니다", 500);
  }
}
