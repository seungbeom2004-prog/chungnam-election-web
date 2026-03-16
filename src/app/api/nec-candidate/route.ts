import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { apiSuccess, apiError } from "@/lib/api-utils";

const NEC_API_KEY =
  process.env.NEC_API_KEY ||
  "40c8fb3f3f39e2d88885f91bbfc25aaa397229a6b344944116d973f594ffbd92";
const NEC_BASE_URL = "http://apis.data.go.kr/9760000";
const LOCAL_ELECTION_SGID = "20260603";

const NEC_SYNC_KEY = "nec-sync-last";

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
 * Fetch candidate list from NEC CandidateService
 * Uses PreCandidateInfoService for preliminary candidates (예비후보자)
 */
async function fetchNecCandidatesByName(
  candidateName: string,
  district: string
): Promise<NecCandidateItem[]> {
  // Try PreCandidateInfoService first (예비후보자)
  const preUrl = `${NEC_BASE_URL}/PreCandidateInfoService/getPreCandidateInfo?sgId=${LOCAL_ELECTION_SGID}&sdName=충청남도&pageNo=1&numOfRows=200&resultType=json&serviceKey=${NEC_API_KEY}`;

  let allItems: NecCandidateItem[] = [];

  try {
    const res = await fetch(preUrl, { cache: "no-store" });
    const json = await res.json();
    const items = json?.response?.body?.items?.item;
    if (items) {
      allItems = Array.isArray(items) ? items : [items];
    }
  } catch {
    // ignore
  }

  // Filter by name or district
  const nameLower = candidateName.trim().toLowerCase();
  const districtLower = district.trim().toLowerCase();

  const filtered = allItems.filter((item) => {
    const matchName = item.candidateName?.toLowerCase().includes(nameLower);
    const matchDistrict =
      item.wiwName?.toLowerCase().includes(districtLower) ||
      item.electName?.toLowerCase().includes(districtLower) ||
      districtLower.includes(item.wiwName?.toLowerCase() ?? "");
    return matchName || matchDistrict;
  });

  return filtered.length > 0 ? filtered : allItems.slice(0, 5);
}

/**
 * GET /api/nec-candidate
 * Fetch candidate data from NEC API for the logged-in candidate.
 * Returns election name, district details, and registration status.
 */
export async function GET(request: NextRequest) {
  try {
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
    const lastSyncKey = `${NEC_SYNC_KEY}-${candidateId}`;
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

    // Fetch from NEC API
    const necItems = await fetchNecCandidatesByName(
      candidate.name,
      candidate.district
    );

    // Find best match
    const bestMatch = necItems.find(
      (item) =>
        item.candidateName?.includes(candidate.name) ||
        candidate.name.includes(item.candidateName ?? "")
    ) ?? necItems[0];

    return apiSuccess({
      candidate: {
        name: candidate.name,
        district: candidate.district,
        electionType: candidate.electionType,
        detailedElectionName: candidate.detailedElectionName,
        caucusStatus: candidate.caucusStatus,
        electionName: (candidate.election as { name?: string } | null)?.name ?? null,
      },
      necData: bestMatch
        ? {
            electionName: bestMatch.electName,
            district: `${bestMatch.wiwName} ${bestMatch.electName}`.trim(),
            wiwName: bestMatch.wiwName,
            electName: bestMatch.electName,
            status: bestMatch.status,
            party: bestMatch.party,
            regDate: bestMatch.regDate,
            candidateName: bestMatch.candidateName,
          }
        : null,
      allMatches: necItems.slice(0, 3).map((item) => ({
        candidateName: item.candidateName,
        wiwName: item.wiwName,
        electName: item.electName,
        status: item.status,
        party: item.party,
      })),
      alreadySyncedToday,
      lastSyncDate: lastSync ?? null,
      void: lastSyncKey,
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
