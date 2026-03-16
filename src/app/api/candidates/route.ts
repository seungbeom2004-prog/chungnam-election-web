import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { paginationSchema } from "@/lib/validations";
import { apiError, paginationMeta } from "@/lib/api-utils";

// ─── Province detection ───────────────────────────────────────────────────────
// A candidate is from Chungnam (충남/충청남도) if their district contains any of
// these city/county names. Otherwise they are from another province.
const CHUNGNAM_KEYWORDS = [
  "천안", "공주", "보령", "아산", "서산", "논산", "계룡", "당진",
  "금산", "부여", "서천", "청양", "홍성", "예산", "태안", "청주", "세종",
];

export function isChungnamDistrict(district: string): boolean {
  return CHUNGNAM_KEYWORDS.some((kw) => district.includes(kw));
}

/**
 * Extract the top-level province name from a district string.
 * e.g. "서울시 강남구 ○○동" → "서울"
 *      "경기도 수원시 ○○구" → "경기"
 *      "천안시 서북구 ○○동" → "충남"
 */
export function extractProvince(district: string): string {
  if (isChungnamDistrict(district)) return "충남";

  // Common province/metropolitan patterns at the start of the string
  const provincePatterns: [RegExp, string][] = [
    [/^서울/, "서울"],
    [/^부산/, "부산"],
    [/^대구/, "대구"],
    [/^인천/, "인천"],
    [/^광주/, "광주"],
    [/^대전/, "대전"],
    [/^울산/, "울산"],
    [/^세종/, "세종"],
    [/^경기/, "경기"],
    [/^강원/, "강원"],
    [/^충북|충청북/, "충북"],
    [/^충남|충청남/, "충남"],
    [/^전북|전라북/, "전북"],
    [/^전남|전라남/, "전남"],
    [/^경북|경상북/, "경북"],
    [/^경남|경상남/, "경남"],
    [/^제주/, "제주"],
  ];

  for (const [pattern, name] of provincePatterns) {
    if (pattern.test(district)) return name;
  }

  // Fallback: use the first word of the district string
  const firstWord = district.split(/[\s,]/)[0] ?? district;
  return firstWord.replace(/(시|도|구|군)$/, "");
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const district = searchParams.get("district");
    // eligible=true → only candidates publicly visible on the map
    // (caucusStatus="공천 확정" AND candidateStatus in ["예비후보자","후보자"])
    const eligible = searchParams.get("eligible") === "true";

    // province param:
    //   "충남" (default) → only Chungnam candidates
    //   "all" or "전국"  → candidates from all provinces
    //   omitted          → no province filter (original behavior)
    const provinceParam = searchParams.get("province");

    const { page, limit } = paginationSchema.parse({
      page: searchParams.get("page") ?? 1,
      limit: searchParams.get("limit") ?? 20,
    });

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("Candidate")
      .select("id, name, district, profileImage, slogan, party, candidateStatus, caucusStatus, electionId, electionType, detailedElectionName, pinLat, pinLng, youtube, instagram, twitter, facebook, tiktok, kakao, naverBlog, election:Election!electionId(id, name)", { count: "exact" })
      .eq("verified", true)
      .eq("role", "candidate")   // exclude admin accounts from public listing
      .order("name", { ascending: true })
      .range(from, to);

    if (district) query = query.eq("district", district);
    if (eligible) {
      query = query
        .eq("caucusStatus", "공천 확정")
        .in("candidateStatus", ["예비후보자", "후보자"]);
    }

    const { data: candidates, count, error } = await query;

    if (error) {
      console.error("[GET /api/candidates] Supabase error:", error);
      return apiError("후보 목록을 불러올 수 없습니다", 500);
    }

    let filtered = candidates ?? [];

    // Apply province filter in-memory after fetch
    // (Supabase doesn't support contains-any for a computed field)
    if (provinceParam === "충남") {
      filtered = filtered.filter((c) => isChungnamDistrict(c.district));
    } else if (provinceParam === "other" || provinceParam === "others") {
      filtered = filtered.filter((c) => !isChungnamDistrict(c.district));
    }
    // "all" / "전국" / omitted → no additional filtering

    const response = NextResponse.json({
      success: true,
      data: filtered,
      pagination: paginationMeta(provinceParam ? filtered.length : (count ?? 0), page, limit),
    });
    // Cache public candidate list for 60 seconds (CDN + browser)
    response.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=120");
    return response;
  } catch (error) {
    console.error("[GET /api/candidates]", error);
    return apiError("후보 목록을 불러올 수 없습니다", 500);
  }
}
