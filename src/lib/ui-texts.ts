/**
 * UI text customization system.
 *
 * Editable texts are stored as a JSONB column `uiTexts` in the
 * `MapPinSettings` table (id="default") in Supabase.
 *
 * ⚠️  Run this SQL once in your Supabase SQL editor to add the column:
 *
 *   ALTER TABLE "MapPinSettings"
 *     ADD COLUMN IF NOT EXISTS "uiTexts" JSONB DEFAULT '{}'::jsonb;
 */

export interface UITexts {
  // Navbar
  logoSubText: string;          // "충남"
  navMapLink: string;           // "공약 지도"
  navLoginButton: string;       // "로그인"
  navAdminButton: string;       // "관리자"
  navDashboardButton: string;   // "대시보드"
  // Map page sidebar
  sidebarAllCandidates: string; // "전체 후보자"
  sidebarNoCandidate: string;   // "등록된 후보가 없습니다"
  // Footer / misc
  footerCredit: string;         // "개혁신당 충남도당"
}

export const DEFAULT_UI_TEXTS: UITexts = {
  logoSubText: "충남",
  navMapLink: "공약 지도",
  navLoginButton: "로그인",
  navAdminButton: "관리자",
  navDashboardButton: "대시보드",
  sidebarAllCandidates: "전체 후보자",
  sidebarNoCandidate: "등록된 후보가 없습니다",
  footerCredit: "개혁신당 충남도당",
};

/** Merge stored overrides on top of the defaults. */
export function mergeUITexts(stored: Partial<UITexts>): UITexts {
  return { ...DEFAULT_UI_TEXTS, ...stored };
}
