import { NextRequest, NextResponse } from "next/server";

const NEC_API_KEY = process.env.NEC_API_KEY || "40c8fb3f3f39e2d88885f91bbfc25aaa397229a6b344944116d973f594ffbd92";
const NEC_BASE_URL = "http://apis.data.go.kr/9760000/CommonCodeService";

// 제9회 전국동시지방선거 (2026.06.03)
const LOCAL_ELECTION_SGID = "20260603";

// Local election sub-types under 지방선거
export const LOCAL_ELECTION_TYPES = [
  { code: "3", name: "시·도지사선거" },
  { code: "4", name: "구·시·군의 장선거" },
  { code: "5", name: "시·도의회의원선거" },
  { code: "6", name: "구·시·군의회의원선거" },
  { code: "8", name: "광역의원비례대표선거" },
  { code: "9", name: "기초의원비례대표선거" },
  { code: "11", name: "교육감선거" },
] as const;

interface NecGusigunItem {
  num: string;
  sgId: string;
  wiwCode: string; // 구시군 코드
  wiwName: string;
  wOrder: string;
  sdName: string;
}

interface NecWardItem {
  num: string;
  sgId: string;
  wiwCode: string; // 구시군 코드
  wiwName: string; // 구시군명
  electCode: string; // 선거구 코드
  electName: string; // 선거구명 (가선거구, 나선거구, ...)
  wOrder: string;
  sdName: string;
}

/** Fetch all 구시군 (city/county) items from NEC API for a given election */
async function fetchChungnamDistricts(): Promise<NecGusigunItem[]> {
  // 충남 items are on page 2 (items 101-200 out of 273 total)
  // Fetch pages 1-3 to ensure we catch all entries
  const pageRequests = [1, 2, 3].map((pageNo) =>
    fetch(
      `${NEC_BASE_URL}/getCommonGusigunCodeList?sgId=${LOCAL_ELECTION_SGID}&pageNo=${pageNo}&numOfRows=100&resultType=json&serviceKey=${NEC_API_KEY}`,
      { next: { revalidate: 86400 } } // Cache for 24 hours
    ).then((r) => r.json())
  );

  const pages = await Promise.all(pageRequests);
  const allItems: NecGusigunItem[] = pages.flatMap((page) => {
    const items = page?.response?.body?.items?.item;
    return Array.isArray(items) ? items : items ? [items] : [];
  });

  return allItems.filter((item) => item.sdName === "충청남도");
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  // ── /api/nec?type=districts ─────────────────────────────────
  if (type === "districts") {
    try {
      const chungnamItems = await fetchChungnamDistricts();

      return NextResponse.json({
        success: true,
        data: chungnamItems.map((item) => ({
          name: item.wiwName,
          wiwCode: item.wiwCode,
          wOrder: Number(item.wOrder),
        })),
        meta: {
          sgId: LOCAL_ELECTION_SGID,
          sdName: "충청남도",
          total: chungnamItems.length,
        },
      });
    } catch (error) {
      console.error("[GET /api/nec?type=districts]", error);
      return NextResponse.json(
        { success: false, error: "지역 정보를 불러올 수 없습니다" },
        { status: 500 }
      );
    }
  }

  // ── /api/nec?type=wards&wiwCode=XXXX ───────────────────────
  if (type === "wards") {
    const wiwCode = searchParams.get("wiwCode") || "";
    const wiwName = searchParams.get("wiwName") || ""; // fallback filter by name
    try {
      const res = await fetch(
        `${NEC_BASE_URL}/getCommonWiw2CodeList?sgId=${LOCAL_ELECTION_SGID}&wiwCode=${wiwCode}&pageNo=1&numOfRows=200&resultType=json&serviceKey=${NEC_API_KEY}`,
        { cache: "no-store" }
      );
      const json = await res.json();
      const items = json?.response?.body?.items?.item;
      const wardItems: NecWardItem[] = Array.isArray(items)
        ? items
        : items
        ? [items]
        : [];

      // Filter by 충청남도, optionally by wiwCode, optionally by wiwName (fallback)
      const filtered = wardItems.filter(
        (w) =>
          w.sdName === "충청남도" &&
          (!wiwCode || w.wiwCode === wiwCode) &&
          (!wiwName || w.wiwName === wiwName)
      );
      filtered.sort((a, b) => Number(a.wOrder) - Number(b.wOrder));

      return NextResponse.json({
        success: true,
        data: filtered.map((w) => ({
          wiwCode: w.wiwCode,
          wiwName: w.wiwName,
          electCode: w.electCode,
          electName: w.electName,
          wOrder: Number(w.wOrder),
        })),
        meta: { total: filtered.length, wiwCode },
      });
    } catch (error) {
      console.error("[GET /api/nec?type=wards]", error);
      return NextResponse.json(
        { success: false, data: [], error: "선거구 정보를 불러올 수 없습니다" },
        { status: 500 }
      );
    }
  }

  // ── /api/nec?type=elections ─────────────────────────────────
  if (type === "elections") {
    return NextResponse.json({
      success: true,
      data: LOCAL_ELECTION_TYPES,
      meta: {
        sgId: LOCAL_ELECTION_SGID,
        sgName: "제9회 전국동시지방선거",
        sgVotedate: "20260603",
      },
    });
  }

  return NextResponse.json(
    { success: false, error: "type 파라미터가 필요합니다 (districts | elections)" },
    { status: 400 }
  );
}
