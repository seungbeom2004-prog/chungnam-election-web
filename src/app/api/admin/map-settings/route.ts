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
      .select("emoji, color")
      .eq("id", "default")
      .single();

    if (error || !data) {
      return apiSuccess({ emoji: "📍", color: "#FF5A00" });
    }

    return apiSuccess({ emoji: data.emoji, color: data.color });
  } catch (error) {
    console.error("[GET /api/admin/map-settings]", error);
    return apiError("설정을 불러올 수 없습니다", 500);
  }
}

// PATCH /api/admin/map-settings — Admin: update pin emoji and/or color
export async function PATCH(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return apiError("관리자 권한이 필요합니다", 403);
    }

    const body = await request.json();
    const { emoji, color } = body;

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

    const updateData: Record<string, string> = {};
    if (emoji !== undefined) updateData.emoji = emoji.trim();
    if (color !== undefined) updateData.color = color;

    if (Object.keys(updateData).length === 0) {
      return apiError("변경할 값이 없습니다", 400);
    }

    const { data, error } = await supabase
      .from("MapPinSettings")
      .update(updateData)
      .eq("id", "default")
      .select("emoji, color")
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
