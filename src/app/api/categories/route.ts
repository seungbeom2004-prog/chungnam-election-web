import { supabase } from "@/lib/supabase";
import { apiSuccess, apiError } from "@/lib/api-utils";

// GET /api/categories — Public endpoint: returns visible categories only
export async function GET() {
  try {
    const { data: categories, error } = await supabase
      .from("Category")
      .select("id, name, description")
      .eq("visible", true)
      .order("sortOrder");

    if (error) {
      console.error("[GET /api/categories] Supabase error:", error);
      return apiError("카테고리 목록을 불러올 수 없습니다", 500);
    }

    return apiSuccess(categories ?? []);
  } catch (error) {
    console.error("[GET /api/categories]", error);
    return apiError("카테고리 목록을 불러올 수 없습니다", 500);
  }
}
