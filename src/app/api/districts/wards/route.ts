import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * GET /api/districts/wards?parent=천안시동남구
 *
 * Returns wards from the District table that were synced from NEC.
 * These entries have `visible: false` and names like "천안시동남구 가선거구".
 * Extracts the ward portion (e.g. "가선거구") for easier display.
 */
export async function GET(request: NextRequest) {
  const parent = request.nextUrl.searchParams.get("parent");
  if (!parent) {
    return NextResponse.json(
      { success: false, error: "parent 파라미터가 필요합니다" },
      { status: 400 }
    );
  }

  try {
    // Query districts whose name starts with "parent " (with space — ward entries)
    const { data, error } = await supabase
      .from("District")
      .select("id, name, code, centerLat, centerLng, sortOrder")
      .like("name", `${parent} %`)
      .order("sortOrder", { ascending: true });

    if (error) {
      console.error("[GET /api/districts/wards]", error);
      return NextResponse.json(
        { success: false, data: [], error: "선거구 정보를 불러올 수 없습니다" },
        { status: 500 }
      );
    }

    // Extract ward name from combined name (e.g. "천안시동남구 가선거구" → "가선거구")
    const wards = (data ?? []).map((d) => {
      const spaceIdx = d.name.indexOf(" ");
      return {
        electCode: d.code,
        electName: spaceIdx > -1 ? d.name.slice(spaceIdx + 1) : d.name,
        fullName: d.name,
      };
    });

    return NextResponse.json({
      success: true,
      data: wards,
      meta: { parent, total: wards.length },
    });
  } catch (err) {
    console.error("[GET /api/districts/wards]", err);
    return NextResponse.json(
      { success: false, data: [], error: "선거구 정보를 불러올 수 없습니다" },
      { status: 500 }
    );
  }
}
