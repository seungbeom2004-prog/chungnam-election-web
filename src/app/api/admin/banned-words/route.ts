import { NextRequest } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";
import { apiSuccess, apiError } from "@/lib/api-utils";

const DEFAULT_REDIRECT = "https://check.junseok.kr/";
const BANNED_WORDS_KEY = "_bannedWords";
const REDIRECT_URL_KEY = "_bannedWordRedirectUrl";

// GET /api/admin/banned-words — Admin: return current banned words config
export async function GET(request: NextRequest) {
  if (!(await isAdmin(request))) return apiError("관리자 권한이 필요합니다", 403);

  try {
    const { data } = await supabase
      .from("MapPinSettings")
      .select("uiTexts")
      .eq("id", "default")
      .single();

    const stored = (data as { uiTexts?: Record<string, unknown> } | null)?.uiTexts ?? {};
    const bannedWords = Array.isArray(stored[BANNED_WORDS_KEY])
      ? (stored[BANNED_WORDS_KEY] as string[])
      : [];
    const redirectUrl =
      typeof stored[REDIRECT_URL_KEY] === "string"
        ? (stored[REDIRECT_URL_KEY] as string)
        : DEFAULT_REDIRECT;

    return apiSuccess({ bannedWords, redirectUrl });
  } catch {
    return apiSuccess({ bannedWords: [], redirectUrl: DEFAULT_REDIRECT });
  }
}

// PATCH /api/admin/banned-words — Admin: update banned words list and/or redirect URL
export async function PATCH(request: NextRequest) {
  if (!(await isAdmin(request))) return apiError("관리자 권한이 필요합니다", 403);

  try {
    const body = await request.json();
    const { bannedWords, redirectUrl } = body as {
      bannedWords?: unknown;
      redirectUrl?: unknown;
    };

    if (bannedWords !== undefined) {
      if (
        !Array.isArray(bannedWords) ||
        !bannedWords.every((w) => typeof w === "string")
      ) {
        return apiError("금지어 목록은 문자열 배열이어야 합니다", 400);
      }
    }
    if (redirectUrl !== undefined) {
      if (typeof redirectUrl !== "string" || redirectUrl.length > 500) {
        return apiError("유효하지 않은 리다이렉트 URL입니다", 400);
      }
    }

    // Read existing uiTexts to avoid overwriting other settings
    const { data: existing } = await supabase
      .from("MapPinSettings")
      .select("uiTexts")
      .eq("id", "default")
      .single();

    const prev = (existing as { uiTexts?: Record<string, unknown> } | null)?.uiTexts ?? {};
    const next: Record<string, unknown> = { ...prev };

    if (bannedWords !== undefined) {
      next[BANNED_WORDS_KEY] = (bannedWords as string[])
        .map((w) => w.trim())
        .filter(Boolean);
    }
    if (redirectUrl !== undefined) {
      next[REDIRECT_URL_KEY] = (redirectUrl as string).trim();
    }

    const { error } = await supabase
      .from("MapPinSettings")
      .update({ uiTexts: next })
      .eq("id", "default");

    if (error) {
      console.error("[PATCH /api/admin/banned-words] Supabase error:", error);
      return apiError("저장에 실패했습니다", 500);
    }

    return apiSuccess({
      bannedWords: Array.isArray(next[BANNED_WORDS_KEY])
        ? (next[BANNED_WORDS_KEY] as string[])
        : [],
      redirectUrl:
        typeof next[REDIRECT_URL_KEY] === "string"
          ? (next[REDIRECT_URL_KEY] as string)
          : DEFAULT_REDIRECT,
    });
  } catch (err) {
    console.error("[PATCH /api/admin/banned-words]", err);
    return apiError("저장에 실패했습니다", 500);
  }
}
