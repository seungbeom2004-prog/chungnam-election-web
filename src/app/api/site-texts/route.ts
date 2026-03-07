import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { DEFAULT_UI_TEXTS, mergeUITexts } from "@/lib/ui-texts";

// GET /api/site-texts — public endpoint, returns merged UI text overrides.
// Cached for 60 seconds via ISR (revalidate).
export const revalidate = 60;

export async function GET() {
  try {
    const { data } = await supabase
      .from("MapPinSettings")
      .select("uiTexts")
      .eq("id", "default")
      .single();

    const stored = (data as { uiTexts?: Record<string, string> } | null)?.uiTexts ?? {};
    return NextResponse.json({ success: true, data: mergeUITexts(stored) });
  } catch {
    // Fall back to defaults on any error
    return NextResponse.json({ success: true, data: DEFAULT_UI_TEXTS });
  }
}
