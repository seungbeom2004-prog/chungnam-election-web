import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

const NEC_API_KEY = process.env.NEC_API_KEY || "40c8fb3f3f39e2d88885f91bbfc25aaa397229a6b344944116d973f594ffbd92";
const NEC_CANDIDATE_URL =
  "http://apis.data.go.kr/9760000/PofelcddInfoInqireService/getPoelpcddRegistSttusInfoInqire";
const LOCAL_ELECTION_SGID = "20260603";

const ELECTION_TYPE_NAMES: Record<string, string> = {
  "3": "시·도지사선거",
  "4": "구·시·군의 장선거",
  "5": "시·도의회의원선거",
  "6": "구·시·군의회의원선거",
  "8": "광역의원비례대표선거",
  "9": "기초의원비례대표선거",
  "11": "교육감선거",
};

/** Strip anything that isn't Korean, alphanumeric, spaces, or common district suffixes */
function sanitiseDistrict(raw: string): string {
  return raw.replace(/[^가-힣a-zA-Z0-9\s]/g, "").slice(0, 30);
}

function sanitiseName(raw: string): string {
  return raw.replace(/[^가-힣a-zA-Z\s]/g, "").slice(0, 20);
}

// Simple in-process cache (5 minutes)
const cache = new Map<string, { data: unknown; expiresAt: number }>();

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  if (!rateLimit(`nec-candidate:${ip}`, 10, 60_000)) {
    return NextResponse.json(
      { success: false, error: "요청이 너무 많습니다. 잠시 후 다시 시도하세요." },
      { status: 429 }
    );
  }

  const { searchParams } = new URL(request.url);
  const rawDistrict = searchParams.get("district") || "";
  const rawName = searchParams.get("name") || "";
  const sgTypecode = searchParams.get("sgTypecode") || "";

  const district = sanitiseDistrict(rawDistrict);
  const name = sanitiseName(rawName);

  if (!district) {
    return NextResponse.json(
      { success: false, error: "district 파라미터가 필요합니다." },
      { status: 400 }
    );
  }

  if (!sgTypecode) {
    return NextResponse.json(
      { success: false, error: "sgTypecode 파라미터가 필요합니다." },
      { status: 400 }
    );
  }

  const cacheKey = `${district}:${name}:${sgTypecode}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return NextResponse.json({ success: true, data: cached.data });
  }

  try {
    const params = new URLSearchParams({
      serviceKey: NEC_API_KEY,
      sgId: LOCAL_ELECTION_SGID,
      sgTypecode,
      sdName: "충청남도",
      wiwName: district,
      numOfRows: "100",
      pageNo: "1",
      resultType: "json",
    });
    if (name) params.set("candidateName", name);

    const res = await fetch(`${NEC_CANDIDATE_URL}?${params.toString()}`, {
      headers: { Accept: "application/json" },
    });

    // Read as text first to handle both JSON and XML responses
    const text = await res.text();

    // If the NEC returned XML (e.g., auth error), treat as empty result
    if (text.trim().startsWith("<")) {
      return NextResponse.json({ success: true, data: [] });
    }

    const json = JSON.parse(text);
    const resultCode = json?.response?.header?.resultCode as string | undefined;

    // INFO-03 = no data, treat as empty; any other non-00 code = empty
    if (resultCode && resultCode !== "INFO-00") {
      return NextResponse.json({ success: true, data: [] });
    }

    const raw = json?.response?.body?.items?.item;
    const items: Record<string, string>[] = Array.isArray(raw)
      ? raw
      : raw
      ? [raw]
      : [];

    const electionTypeName = ELECTION_TYPE_NAMES[sgTypecode] || "";

    // NEC API does not filter by party server-side — filter 개혁신당 here
    const data = items
      .filter((item) => {
        const party = item.jdName || "";
        return party === "개혁신당" || party.includes("개혁신당");
      })
      .map((item) => ({
        name: item.name || "",
        party: item.jdName || "",
        electionType: electionTypeName,
        // sggName = 선거구명 (ward) for council elections; empty for district-level elections
        ward: item.sggName || "",
        district: item.wiwName || district,
        registStatus: item.status || "",
      }));

    cache.set(cacheKey, { data, expiresAt: Date.now() + 5 * 60 * 1000 });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[GET /api/nec/candidate]", error);
    return NextResponse.json(
      { success: false, error: "후보자 정보를 불러올 수 없습니다." },
      { status: 500 }
    );
  }
}
