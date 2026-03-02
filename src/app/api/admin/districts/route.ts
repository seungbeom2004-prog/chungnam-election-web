import { NextRequest } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { supabase } from "@/lib/supabase";
import { apiSuccess, apiError } from "@/lib/api-utils";

// GET /api/admin/districts — List all districts with visibility
export async function GET(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return apiError("관리자 권한이 필요합니다", 403);
    }

    const { data: districts, error } = await supabase
      .from("District")
      .select("id, name, code, centerLat, centerLng, visible")
      .order("name");

    if (error) {
      console.error("[GET /api/admin/districts] Supabase error:", error);
      return apiError("지역 목록을 불러올 수 없습니다", 500);
    }

    return apiSuccess(districts ?? []);
  } catch (error) {
    console.error("[GET /api/admin/districts]", error);
    return apiError("지역 목록을 불러올 수 없습니다", 500);
  }
}

// PATCH /api/admin/districts — Toggle district visibility
export async function PATCH(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return apiError("관리자 권한이 필요합니다", 403);
    }

    const body = await request.json();
    const { districtId, visible } = body;

    if (!districtId || typeof visible !== "boolean") {
      return apiError("districtId와 visible이 필요합니다", 400);
    }

    const { data: district, error } = await supabase
      .from("District")
      .update({ visible })
      .eq("id", districtId)
      .select("id, name, code, visible")
      .single();

    if (error) {
      console.error("[PATCH /api/admin/districts] Supabase error:", error);
      return apiError("지역 상태 변경에 실패했습니다", 500);
    }

    return apiSuccess(district);
  } catch (error) {
    console.error("[PATCH /api/admin/districts]", error);
    return apiError("지역 상태 변경에 실패했습니다", 500);
  }
}
