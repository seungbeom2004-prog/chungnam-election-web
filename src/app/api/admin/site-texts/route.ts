import { NextRequest } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { supabase } from "@/lib/supabase";
import { apiSuccess, apiError } from "@/lib/api-utils";
import { DEFAULT_UI_TEXTS, mergeUITexts } from "@/lib/ui-texts";

// GET /api/admin/site-texts — Admin: return current text overrides
export async function GET(request: NextRequest) {
  if (!(await isAdmin(request))) return apiError("관리자 권한이 필요합니다", 403);

  try {
    const { data } = await supabase
      .from("MapPinSettings")
      .select("uiTexts")
      .eq("id", "default")
      .single();

    const stored = (data as { uiTexts?: Record<string, string> } | null)?.uiTexts ?? {};
    return apiSuccess(mergeUITexts(stored));
  } catch {
    return apiSuccess(DEFAULT_UI_TEXTS);
  }
}

// PATCH /api/admin/site-texts — Admin: update text overrides (partial)
export async function PATCH(request: NextRequest) {
  if (!(await isAdmin(request))) return apiError("관리자 권한이 필요합니다", 403);

  try {
    const body = await request.json();
    if (typeof body !== "object" || Array.isArray(body)) {
      return apiError("잘못된 요청입니다", 400);
    }

    // Only allow known keys; trim string values; reject non-strings
    const allowed = Object.keys(DEFAULT_UI_TEXTS) as (keyof typeof DEFAULT_UI_TEXTS)[];
    const cleaned: Record<string, string> = {};
    for (const key of allowed) {
      if (key in body) {
        const val = body[key];
        if (typeof val !== "string") return apiError(`'${key}' 값은 문자열이어야 합니다`, 400);
        if (val.length > 200) return apiError(`'${key}' 값이 너무 깁니다 (최대 200자)`, 400);
        cleaned[key] = val.trim();
      }
    }

    if (Object.keys(cleaned).length === 0) return apiError("변경할 값이 없습니다", 400);

    // Read existing overrides, merge, save back
    const { data: existing } = await supabase
      .from("MapPinSettings")
      .select("uiTexts")
      .eq("id", "default")
      .single();

    const prev = (existing as { uiTexts?: Record<string, string> } | null)?.uiTexts ?? {};
    const next = { ...prev, ...cleaned };

    const { error } = await supabase
      .from("MapPinSettings")
      .update({ uiTexts: next })
      .eq("id", "default");

    if (error) return apiError("저장에 실패했습니다", 500);

    return apiSuccess(mergeUITexts(next));
  } catch (err) {
    console.error("[PATCH /api/admin/site-texts]", err);
    return apiError("저장에 실패했습니다", 500);
  }
}
