import { NextRequest } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { supabase } from "@/lib/supabase";
import { apiSuccess, apiError } from "@/lib/api-utils";

// GET /api/admin/map-settings — Admin: get current pin settings
export async function GET(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return apiError("관리자 권한이 필요합니다", 403);
    }

    const { data, error } = await supabase
      .from("MapPinSettings")
      .select("emoji, color, defaultZoom")
      .eq("id", "default")
      .single();

    if (error || !data) {
      return apiSuccess({ emoji: "📍", color: "#FF5A00", defaultZoom: 9 });
    }

    return apiSuccess({
      emoji: data.emoji,
      color: data.color,
      defaultZoom: (data as { defaultZoom?: number }).defaultZoom ?? 9,
    });
  } catch (error) {
    console.error("[GET /api/admin/map-settings]", error);
    return apiError("설정을 불러올 수 없습니다", 500);
  }
}

// PATCH /api/admin/map-settings — Admin: update pin emoji, color, and/or defaultZoom
export async function PATCH(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return apiError("관리자 권한이 필요합니다", 403);
    }

    const body = await request.json();
    const { emoji, color, defaultZoom } = body;

    // Validate emoji
    if (emoji !== undefined) {
      if (typeof emoji !== "string" || emoji.trim() === "") {
        return apiError("유효한 이모지를 입력하세요", 400);
      }
    }

    // Validate hex color (#RRGGBB format)
    if (color !== undefined) {
      if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
        return apiError("유효한 색상 코드를 입력하세요 (예: #FF5A00)", 400);
      }
    }

    // Validate defaultZoom (integer 3–18)
    if (defaultZoom !== undefined) {
      const z = Number(defaultZoom);
      if (!Number.isInteger(z) || z < 3 || z > 18) {
        return apiError("유효한 배율을 입력하세요 (3~18)", 400);
      }
    }

    const updateData: Record<string, string | number> = {};
    if (emoji !== undefined) updateData.emoji = emoji.trim();
    if (color !== undefined) updateData.color = color;
    if (defaultZoom !== undefined) updateData.defaultZoom = Number(defaultZoom);

    if (Object.keys(updateData).length === 0) {
      return apiError("변경할 값이 없습니다", 400);
    }

    const { data, error } = await supabase
      .from("MapPinSettings")
      .update(updateData)
      .eq("id", "default")
      .select("emoji, color, defaultZoom")
      .single();

    if (error) {
      console.error("[PATCH /api/admin/map-settings] Supabase error:", error);
      return apiError("설정 저장에 실패했습니다", 500);
    }

    return apiSuccess(data);
  } catch (error) {
    console.error("[PATCH /api/admin/map-settings]", error);
    return apiError("설정 저장에 실패했습니다", 500);
  }
}
