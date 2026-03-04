import { NextRequest } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { supabase } from "@/lib/supabase";
import { apiSuccess, apiError } from "@/lib/api-utils";

const NEC_API_KEY = process.env.NEC_API_KEY!;
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

interface NecElectionItem {
  sgId: string;
  sgName: string;
  sgTypecode: string;
  sgVotedate: string;
}

async function fetchAllChungnamDistricts(): Promise<NecGusigunItem[]> {
  const pageRequests = [1, 2, 3].map((pageNo) =>
    fetch(
      `${NEC_BASE_URL}/getCommonGusigunCodeList?sgId=${LOCAL_ELECTION_SGID}&pageNo=${pageNo}&numOfRows=100&resultType=json&serviceKey=${NEC_API_KEY}`,
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

async function fetchElectionTypes(): Promise<NecElectionItem[]> {
  const res = await fetch(
    `${NEC_BASE_URL}/getCommonElectionCodeList?pageNo=1&numOfRows=100&resultType=json&serviceKey=${NEC_API_KEY}`,
    { cache: "no-store" }
  );
  const json = await res.json();
  const items = json?.response?.body?.items?.item;
  return Array.isArray(items) ? items : items ? [items] : [];
}

// POST /api/admin/nec-sync — Fetch NEC data and store in DB
export async function POST(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return apiError("관리자 권한이 필요합니다", 403);
    }

    if (!NEC_API_KEY) {
      return apiError("NEC API 키가 설정되지 않았습니다", 500);
    }

    const results: { districts: number; elections: number } = {
      districts: 0,
      elections: 0,
    };
    const errors: string[] = [];

    // 1. Sync 충남 districts from NEC
    try {
      const chungnamItems = await fetchAllChungnamDistricts();

      for (const item of chungnamItems) {
        const code = item.wiwCode || item.wiwName;
        const { error } = await supabase
          .from("District")
          .upsert(
            {
              name: item.wiwName,
              code: code,
              sortOrder: Number(item.wOrder) || 0,
              // Keep existing centerLat/centerLng if already set
              centerLat: 36.5, // default; admin can adjust
              centerLng: 126.8,
            },
            {
              onConflict: "code",
              ignoreDuplicates: false,
            }
          );

        if (error && error.code !== "23505") {
          errors.push(`District ${item.wiwName}: ${error.message}`);
        } else {
          results.districts++;
        }
      }
    } catch (e) {
      errors.push(`Districts sync failed: ${e}`);
    }

    // 2. Sync election types from NEC
    try {
      const electionItems = await fetchElectionTypes();
      const localElection = electionItems.find(
        (e) => e.sgId === LOCAL_ELECTION_SGID
      );

      if (localElection) {
        const { error } = await supabase
          .from("Election")
          .upsert(
            {
              name: localElection.sgName || "제9회 전국동시지방선거",
              type: "지방선거",
              description: `${localElection.sgVotedate} 실시`,
              visible: true,
              sortOrder: 1,
            },
            { onConflict: "name", ignoreDuplicates: false }
          );

        if (!error) results.elections++;
      }
    } catch (e) {
      errors.push(`Elections sync failed: ${e}`);
    }

    return apiSuccess({
      synced: results,
      errors: errors.length > 0 ? errors : undefined,
      message: `동기화 완료: 지역 ${results.districts}건, 선거 ${results.elections}건`,
    });
  } catch (error) {
    console.error("[POST /api/admin/nec-sync]", error);
    return apiError("NEC 동기화에 실패했습니다", 500);
  }
}

// GET /api/admin/nec-sync — Preview what would be synced
export async function GET(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return apiError("관리자 권한이 필요합니다", 403);
    }

    if (!NEC_API_KEY) {
      return apiError("NEC API 키가 설정되지 않았습니다", 500);
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
