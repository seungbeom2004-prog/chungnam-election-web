import { NextRequest } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { supabase } from "@/lib/supabase";
import { apiSuccess, apiError } from "@/lib/api-utils";

const NEC_API_KEY = process.env.NEC_API_KEY || "40c8fb3f3f39e2d88885f91bbfc25aaa397229a6b344944116d973f594ffbd92";
const NEC_BASE_URL = "http://apis.data.go.kr/9760000/CommonCodeService";
const LOCAL_ELECTION_SGID = "20260603";

interface NecGusigunItem {
  wiwCode: string;
  wiwName: string;
  wOrder: string;
  sdName: string;
}

interface NecWardItem {
  wiwCode: string;
  wiwName: string;
  electCode: string;
  electName: string;
  wOrder: string;
  sdName: string;
}

/** Fetch all 충남 districts from NEC */
async function fetchChungnamDistricts(): Promise<NecGusigunItem[]> {
  const pageRequests = [1, 2, 3].map((pageNo) =>
    fetch(
      `${NEC_BASE_URL}/getCommonGusigunCodeList?sgId=${LOCAL_ELECTION_SGID}&pageNo=${pageNo}&numOfRows=100&resultType=json&serviceKey=${NEC_API_KEY}`,
      { cache: "no-store" }
    ).then((r) => r.json())
  );
  const pages = await Promise.all(pageRequests);
  const all: NecGusigunItem[] = pages.flatMap((page) => {
    const items = page?.response?.body?.items?.item;
    return Array.isArray(items) ? items : items ? [items] : [];
  });
  return all.filter((item) => item.sdName === "충청남도");
}

/** Fetch wards for a single district from NEC (returns [] on any error) */
async function fetchWards(wiwCode: string): Promise<NecWardItem[]> {
  try {
    const res = await fetch(
      `${NEC_BASE_URL}/getCommonWiw2CodeList?sgId=${LOCAL_ELECTION_SGID}&wiwCode=${wiwCode}&pageNo=1&numOfRows=200&resultType=json&serviceKey=${NEC_API_KEY}`,
      { cache: "no-store" }
    );
    if (!res.ok) return [];
    const json = await res.json();
    const items = json?.response?.body?.items?.item;
    const arr: NecWardItem[] = Array.isArray(items) ? items : items ? [items] : [];
    return arr.filter((w) => w.sdName === "충청남도" && w.wiwCode === wiwCode);
  } catch {
    // NEC API error or non-JSON response (e.g. election data not yet published)
    return [];
  }
}

/**
 * POST /api/admin/nec-sync/wards
 *
 * For every 충남 district, fetch all wards from NEC and store them as
 * District entries with `visible: false` (so they don't appear in the
 * navbar but CAN be used for candidate marker placement on the map).
 *
 * Ward names are stored as "천안시 가선거구" (parentName + space + wardName).
 * Coordinates inherit from the parent district.
 */
export async function POST(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return apiError("관리자 권한이 필요합니다", 403);
    }

    const districts = await fetchChungnamDistricts();
    let synced = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const district of districts) {
      // Get parent district coordinates from DB
      const { data: parent } = await supabase
        .from("District")
        .select("centerLat, centerLng, sortOrder")
        .eq("code", district.wiwCode)
        .maybeSingle();

      const parentLat = parent?.centerLat ?? 36.5;
      const parentLng = parent?.centerLng ?? 126.8;
      const parentSort = parent?.sortOrder ?? (Number(district.wOrder) || 0);

      const wards = await fetchWards(district.wiwCode);

      if (wards.length === 0) {
        skipped++;
        continue;
      }

      for (const ward of wards) {
        const combinedName = `${ward.wiwName} ${ward.electName}`;
        const code = ward.electCode; // unique per ward

        const { data: existing } = await supabase
          .from("District")
          .select("id, centerLat, centerLng")
          .eq("code", code)
          .maybeSingle();

        const payload = {
          name: combinedName,
          code: code,
          centerLat: existing?.centerLat ?? parentLat,
          centerLng: existing?.centerLng ?? parentLng,
          visible: false, // Don't show in navbar
          sortOrder: parentSort * 100 + (Number(ward.wOrder) || 0),
        };

        const { error } = await supabase.from("District").upsert(payload, {
          onConflict: "code",
          ignoreDuplicates: false,
        });

        if (error) {
          errors.push(`${combinedName}: ${error.message}`);
        } else {
          synced++;
        }
      }
    }

    return apiSuccess({
      synced,
      skipped,
      total: synced + errors.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `선거구 동기화 완료: ${synced}건 저장${skipped > 0 ? `, ${skipped}개 지역 선거구 없음` : ""}`,
    });
  } catch (error) {
    console.error("[POST /api/admin/nec-sync/wards]", error);
    return apiError("선거구 동기화에 실패했습니다", 500);
  }
}
