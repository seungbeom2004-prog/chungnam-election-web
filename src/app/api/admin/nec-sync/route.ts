import { NextRequest } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";
import { apiSuccess, apiError } from "@/lib/api-utils";

const NEC_BASE_URL = "http://apis.data.go.kr/9760000/CommonCodeService";
const LOCAL_ELECTION_SGID = "20260603";

interface NecGusigunItem {
  num: string;
  sgId: string;
  wiwName: string;
  wOrder: string;
  sdName: string;
  wiwCode: string;
}

async function fetchAllChungnamDistricts(): Promise<NecGusigunItem[]> {
  const apiKey = process.env.NEC_API_KEY;
  if (!apiKey) throw new Error("NEC_API_KEY 환경변수가 설정되지 않았습니다");

  const pageRequests = [1, 2, 3].map((pageNo) =>
    fetch(
      `${NEC_BASE_URL}/getCommonGusigunCodeList?sgId=${LOCAL_ELECTION_SGID}&pageNo=${pageNo}&numOfRows=100&resultType=json&serviceKey=${apiKey}`,
      { cache: "no-store" }
    ).then((r) => r.json())
  );

  const pages = await Promise.all(pageRequests);
  const allItems: NecGusigunItem[] = pages.flatMap((page) => {
    const items = page?.response?.body?.items?.item;
    return Array.isArray(items) ? items : items ? [items] : [];
  });

  return allItems.filter((item) => item.sdName === "충청남도");
}

// POST /api/admin/nec-sync — Fetch 충남 districts from NEC and store in DB
export async function POST(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return apiError("관리자 권한이 필요합니다", 403);
    }

    let synced = 0;
    const errors: string[] = [];

    const chungnamItems = await fetchAllChungnamDistricts();

    for (const item of chungnamItems) {
      const code = item.wiwCode || item.wiwName;

      // Only update name and sortOrder — preserve existing coordinates
      const { data: existing } = await supabase
        .from("District")
        .select("id, centerLat, centerLng")
        .eq("code", code)
        .maybeSingle();

      const payload = {
        name: item.wiwName,
        code: code,
        sortOrder: Number(item.wOrder) || 0,
        centerLat: existing?.centerLat ?? 36.5,
        centerLng: existing?.centerLng ?? 126.8,
      };

      const { error } = await supabase.from("District").upsert(payload, {
        onConflict: "code",
        ignoreDuplicates: false,
      });

      if (error) {
        errors.push(`${item.wiwName}: ${error.message}`);
      } else {
        synced++;
      }
    }

    return apiSuccess({
      synced,
      total: chungnamItems.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `동기화 완료: 충청남도 지역 ${synced}/${chungnamItems.length}건`,
    });
  } catch (error) {
    console.error("[POST /api/admin/nec-sync]", error);
    return apiError("NEC 동기화에 실패했습니다", 500);
  }
}

// GET /api/admin/nec-sync — Preview districts from NEC (no DB write)
export async function GET(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return apiError("관리자 권한이 필요합니다", 403);
    }

    const chungnamItems = await fetchAllChungnamDistricts();

    return apiSuccess({
      preview: chungnamItems.map((item) => ({
        name: item.wiwName,
        code: item.wiwCode,
        wOrder: item.wOrder,
      })),
      total: chungnamItems.length,
      sgId: LOCAL_ELECTION_SGID,
    });
  } catch (error) {
    console.error("[GET /api/admin/nec-sync]", error);
    return apiError("NEC 데이터 조회에 실패했습니다", 500);
  }
}
