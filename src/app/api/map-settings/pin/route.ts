import { supabase } from "@/lib/supabase";
import { apiSuccess } from "@/lib/api-utils";

// Public endpoint — no auth required.
// NaverMap fetches this on mount to get current pin appearance and default district.
export const revalidate = 60; // ISR: cache for 60s, so admin changes propagate within 1 minute

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("MapPinSettings")
      .select("emoji, color, defaultZoom, defaultDistrict")
      .eq("id", "default")
      .single();

    if (error || !data) {
      // Always return usable defaults — never break the map
      return apiSuccess({ emoji: "📍", color: "#FF5A00", defaultZoom: 9, defaultDistrict: null });
    }

    const d = data as { emoji: string; color: string; defaultZoom?: number; defaultDistrict?: string | null };
    return apiSuccess({
      emoji: d.emoji,
      color: d.color,
      defaultZoom: d.defaultZoom ?? 9,
      defaultDistrict: d.defaultDistrict ?? null,
    });
  } catch {
    return apiSuccess({ emoji: "📍", color: "#FF5A00", defaultZoom: 9, defaultDistrict: null });
  }
}
