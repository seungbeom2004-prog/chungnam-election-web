import { NextRequest } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { supabase } from "@/lib/supabase";
import { apiSuccess, apiError } from "@/lib/api-utils";

// GET /api/admin/districts — List all districts with visibility and sortOrder
export async function GET(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return apiError("관리자 권한이 필요합니다", 403);
    }

    const { data: districts, error } = await supabase
      .from("District")
      .select("id, name, code, centerLat, centerLng, visible, sortOrder")
      .order("sortOrder", { ascending: true });

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

// PATCH /api/admin/districts — Toggle visibility or bulk-update sortOrder
export async function PATCH(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return apiError("관리자 권한이 필요합니다", 403);
    }

    const body = await request.json();

    // Bulk sortOrder update: [{ id, sortOrder }]
    if (Array.isArray(body)) {
      const updates = body as { id: string; sortOrder: number }[];
      await Promise.all(
        updates.map(({ id, sortOrder }) =>
          supabase.from("District").update({ sortOrder }).eq("id", id)
        )
      );
      return apiSuccess({ updated: updates.length });
    }

    // Single district update
    const { districtId, visible, sortOrder } = body;

    if (!districtId) {
      return apiError("districtId가 필요합니다", 400);
    }

    const updateData: Record<string, unknown> = {};
    if (typeof visible === "boolean") updateData.visible = visible;
    if (typeof sortOrder === "number") updateData.sortOrder = sortOrder;

    if (Object.keys(updateData).length === 0) {
      return apiError("변경할 값이 없습니다", 400);
    }

    const { data: district, error } = await supabase
      .from("District")
      .update(updateData)
      .eq("id", districtId)
      .select("id, name, code, visible, sortOrder")
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
