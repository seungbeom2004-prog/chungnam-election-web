import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { apiSuccess, apiError } from "@/lib/api-utils";

const NEC_API_KEY = process.env.NEC_API_KEY ?? "";
const NEC_BASE_URL = "http://apis.data.go.kr/9760000";
const LOCAL_ELECTION_SGID = "20260603";


interface NecCandidateItem {
  sdName: string;
  wiwName: string;
  electCode: string;
  electName: string;
  huboid: string;
  candidateName: string;
  gender: string;
  birth: string;
  addr: string;
  eduInfo: string;
  careers: string;
  recommender: string;
  status: string; // 예비후보자, 후보자 등
  regDate: string;
  party: string;
  partyCode: string;
  num: string;
}

/**
 * Fetch all preliminary candidates from NEC for 충청남도.
 * Returns up to 300 items (pre-candidate registrations).
 */
async function fetchAllNecCandidates(sdName = "충청남도"): Promise<NecCandidateItem[]> {
  const preUrl = `${NEC_BASE_URL}/PreCandidateInfoService/getPreCandidateInfo?sgId=${LOCAL_ELECTION_SGID}&sdName=${encodeURIComponent(sdName)}&pageNo=1&numOfRows=300&resultType=json&serviceKey=${NEC_API_KEY}`;
  try {
    const res = await fetch(preUrl, { cache: "no-store" });
    const json = await res.json();
    const items = json?.response?.body?.items?.item;
    if (!items) return [];
    return Array.isArray(items) ? items : [items];
  } catch {
    return [];
  }
}

/**
 * GET /api/nec-candidate
 * Fetch candidate data from NEC API for the logged-in candidate.
 * Returns election name, district details, and registration status.
 */
export async function GET(request: NextRequest) {
  // Suppress unused param warning — request is required by Next.js route signature
  void request;

  try {
    if (!NEC_API_KEY) {
      return apiError("NEC_API_KEY 환경 변수가 설정되지 않았습니다", 500);
    }

    const session = await getServerSession(authOptions);
    if (!session) {
      return apiError("로그인이 필요합니다", 401);
    }

    const candidateId = (session.user as { id?: string })?.id;
    if (!candidateId) {
      return apiError("후보자 정보를 찾을 수 없습니다", 400);
    }

    // Get candidate info from DB
    const { data: candidate } = await supabaseAdmin
      .from("Candidate")
      .select("id, name, district, electionType, detailedElectionName, caucusStatus, election:Election!electionId(id, name)")
      .eq("id", candidateId)
      .single();

    if (!candidate) {
      return apiError("후보자 정보를 찾을 수 없습니다", 404);
    }

    // Check rate limit (once per day)
    let lastSync: string | undefined;
    try {
      const { data: metaRow } = await supabaseAdmin
        .from("CandidateMeta")
        .select("value")
        .eq("candidateId", candidateId)
        .eq("key", "necSyncDate")
        .maybeSingle();
      lastSync = metaRow?.value as string | undefined;
    } catch {
      // CandidateMeta table may not exist yet
    }

    const today = new Date().toISOString().split("T")[0];
    const alreadySyncedToday = lastSync === today;

    // Fetch all 충청남도 candidates from NEC API
    const allItems = await fetchAllNecCandidates("충청남도");

    // Name matches: items where NEC name includes or is included by our candidate name
    const nameLower = candidate.name.trim().toLowerCase();
    const nameMatches = allItems.filter((item) => {
      const necName = (item.candidateName ?? "").toLowerCase();
      return necName.includes(nameLower) || nameLower.includes(necName);
    });

    const toMatchItem = (item: NecCandidateItem) => ({
      candidateName: item.candidateName,
      wiwName: item.wiwName,
      electName: item.electName,
      status: item.status,
      party: item.party,
      sdName: item.sdName,
    });

    return apiSuccess({
      candidate: {
        name: candidate.name,
        district: candidate.district,
        electionType: candidate.electionType,
        detailedElectionName: candidate.detailedElectionName,
        caucusStatus: candidate.caucusStatus,
        electionName: (candidate.election as { name?: string } | null)?.name ?? null,
      },
      nameMatches: nameMatches.map(toMatchItem),
      allCandidates: allItems.slice(0, 20).map(toMatchItem),
      alreadySyncedToday,
      lastSyncDate: lastSync ?? null,
    });
  } catch (error) {
    console.error("[GET /api/nec-candidate]", error);
    return apiError("선관위 데이터 조회에 실패했습니다", 500);
  }
}

/**
 * POST /api/nec-candidate
 * Update candidate profile fields from NEC data.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return apiError("로그인이 필요합니다", 401);
    }

    const candidateId = (session.user as { id?: string })?.id;
    if (!candidateId) {
      return apiError("후보자 정보를 찾을 수 없습니다", 400);
    }

    const body = await request.json();
    const { electionName, detailedElectionName, district, caucusStatus, force } = body as {
      electionName?: string;
      detailedElectionName?: string;
      district?: string;
      caucusStatus?: string;
      force?: boolean;
    };

    // Check rate limit unless forced
    if (!force) {
      const today = new Date().toISOString().split("T")[0];
      try {
        const { data: metaRow } = await supabaseAdmin
          .from("CandidateMeta")
          .select("value")
          .eq("candidateId", candidateId)
          .eq("key", "necSyncDate")
          .maybeSingle();

        if (metaRow?.value === today) {
          return apiError("오늘은 이미 새로고침했습니다. 하루에 한 번만 가능합니다.", 429);
        }
      } catch {
        // CandidateMeta table may not exist yet — allow sync
      }
    }

    // Update candidate fields
    const updatePayload: Record<string, string | null | undefined> = {};
    if (electionName !== undefined) updatePayload.electionType = electionName;
    if (detailedElectionName !== undefined) updatePayload.detailedElectionName = detailedElectionName;
    if (district !== undefined) updatePayload.district = district;
    if (caucusStatus !== undefined) updatePayload.caucusStatus = caucusStatus;

    if (Object.keys(updatePayload).length > 0) {
      const { error } = await supabaseAdmin
        .from("Candidate")
        .update(updatePayload)
        .eq("id", candidateId);

      if (error) {
        return apiError("후보자 정보 업데이트에 실패했습니다", 500);
      }
    }

    // Save sync date
    const today = new Date().toISOString().split("T")[0];
    try {
      await supabaseAdmin
        .from("CandidateMeta")
        .upsert(
          { candidateId, key: "necSyncDate", value: today },
          { onConflict: "candidateId,key" }
        );
    } catch {
      // CandidateMeta table may not exist yet — ignore
    }

    return apiSuccess({
      message: "선관위 데이터가 프로필에 반영되었습니다.",
      updated: updatePayload,
      syncDate: today,
    });
  } catch (error) {
    console.error("[POST /api/nec-candidate]", error);
    return apiError("선관위 데이터 적용에 실패했습니다", 500);
  }
}
