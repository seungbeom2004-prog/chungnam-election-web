import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const NEC_API_KEY =
  process.env.NEC_API_KEY ||
  "40c8fb3f3f39e2d88885f91bbfc25aaa397229a6b344944116d973f594ffbd92";
const NEC_BASE_URL = "http://apis.data.go.kr/9760000/CommonCodeService";
const LOCAL_ELECTION_SGID = "20260603";

interface NecWardItem {
  wiwCode: string;
  wiwName: string;
  electCode: string;
  electName: string;
  wOrder: string;
  sdName: string;
}

/**
 * GET /api/districts/wards?parent=천안시동남구&wiwCode=4413
 *
 * Unified ward endpoint. Tries DB first, falls back to NEC API.
 *   - parent  (required): parent district name, e.g. "천안시동남구"
 *   - wiwCode (optional): NEC district code for API fallback
 *
 * Returns wards with { electCode, electName, fullName? }.
 */
export async function GET(request: NextRequest) {
  const parent = request.nextUrl.searchParams.get("parent");
  const wiwCode = request.nextUrl.searchParams.get("wiwCode") || "";

  if (!parent) {
    return NextResponse.json(
      { success: false, error: "parent 파라미터가 필요합니다" },
      { status: 400 }
    );
  }

  // ── 1) Try DB first ─────────────────────────────────────────────
  try {
    const { data, error } = await supabase
      .from("District")
      .select("id, name, code, centerLat, centerLng, sortOrder")
      .like("name", `${parent} %`)
      .order("sortOrder", { ascending: true });

    if (!error && data && data.length > 0) {
      const wards = data.map((d) => {
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
        source: "db",
        meta: { parent, total: wards.length },
      });
    }

    if (error) {
      console.error("[GET /api/districts/wards] DB error:", error.message);
    }
  } catch (dbErr) {
    console.error("[GET /api/districts/wards] DB exception:", dbErr);
  }

  // ── 2) DB empty — resolve wiwCode if not provided ───────────────
  let resolvedWiwCode = wiwCode;

  if (!resolvedWiwCode) {
    try {
      // Look up the parent district in DB to get its code
      const { data: parentRow } = await supabase
        .from("District")
        .select("code")
        .eq("name", parent)
        .maybeSingle();

      if (parentRow?.code) {
        resolvedWiwCode = parentRow.code;
      }
    } catch {
      // ignore
    }
  }

  if (!resolvedWiwCode) {
    // Try fetching wiwCode from NEC district list
    try {
      const distRes = await fetch(
        `${NEC_BASE_URL}/getCommonGusigunCodeList?sgId=${LOCAL_ELECTION_SGID}&pageNo=1&numOfRows=300&resultType=json&serviceKey=${NEC_API_KEY}`,
        { cache: "no-store" }
      );
      const distJson = await distRes.json();
      const items = distJson?.response?.body?.items?.item;
      const arr = Array.isArray(items) ? items : items ? [items] : [];
      const match = arr.find(
        (d: { wiwName: string; sdName: string }) =>
          d.sdName === "충청남도" && d.wiwName === parent
      );
      if (match) {
        resolvedWiwCode = match.wiwCode;
      }
    } catch {
      // ignore
    }
  }

  // ── 3) Fallback to NEC API ──────────────────────────────────────
  try {
    // Build URL — always include wiwCode if we have it
    const necUrl = `${NEC_BASE_URL}/getCommonWiw2CodeList?sgId=${LOCAL_ELECTION_SGID}&wiwCode=${resolvedWiwCode}&pageNo=1&numOfRows=200&resultType=json&serviceKey=${NEC_API_KEY}`;

    const necRes = await fetch(necUrl, { cache: "no-store" });
    const necJson = await necRes.json();

    const items = necJson?.response?.body?.items?.item;
    const wardItems: NecWardItem[] = Array.isArray(items)
      ? items
      : items
      ? [items]
      : [];

    // Filter by 충청남도 and matching district
    const filtered = wardItems.filter(
      (w) =>
        w.sdName === "충청남도" &&
        (resolvedWiwCode ? w.wiwCode === resolvedWiwCode : w.wiwName === parent)
    );
    filtered.sort((a, b) => Number(a.wOrder) - Number(b.wOrder));

    if (filtered.length > 0) {
      const wards = filtered.map((w) => ({
        electCode: w.electCode,
        electName: w.electName,
        fullName: `${w.wiwName} ${w.electName}`,
      }));

      return NextResponse.json({
        success: true,
        data: wards,
        source: "nec",
        meta: { parent, wiwCode: resolvedWiwCode, total: wards.length },
      });
    }
  } catch (necErr) {
    console.error("[GET /api/districts/wards] NEC API error:", necErr);
  }

  // ── 4) All sources exhausted — return empty with debug info ─────
  return NextResponse.json({
    success: true,
    data: [],
    source: "none",
    meta: {
      parent,
      wiwCode: resolvedWiwCode,
      total: 0,
      hint: "DB와 NEC API 모두에서 선거구 데이터를 찾지 못했습니다. 관리자 설정에서 '세부 선거구 동기화'를 실행해주세요.",
    },
  });
}
