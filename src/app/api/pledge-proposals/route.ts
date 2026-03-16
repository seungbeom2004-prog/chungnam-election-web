import { NextRequest } from "next/server";
import crypto from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { apiSuccess, apiError } from "@/lib/api-utils";
import { verifyRecaptcha } from "@/app/api/captcha/route";

const IP_HASH_SALT = process.env.IP_HASH_SALT || "reform-chungnam-salt";
function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(ip + IP_HASH_SALT).digest("hex");
}

/**
 * GET /api/pledge-proposals
 * Query params:
 *   minwonId    — filter by linked 민원 (ProposalPost.id)
 *   candidateId — filter by candidate author
 *   status      — "pending"|"accepted"|"all"  (default: "pending,accepted")
 *   limit       — max 100, default 50
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const minwonId    = searchParams.get("minwonId");
    const candidateId = searchParams.get("candidateId");
    const statusParam = searchParams.get("status") ?? "active";
    const limit       = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 100);
    const offset      = parseInt(searchParams.get("offset") ?? "0", 10);

    let query = supabase
      .from("PledgeProposal")
      .select(
        `id, title, content, authorName, authorType, candidateId, status, createdAt,
         minwonLinks:PledgeProposalMinwon(minwonId),
         candidate:Candidate!candidateId(id, name, district)`,
        { count: "exact" }
      )
      .order("createdAt", { ascending: false })
      .range(offset, offset + limit - 1);

    if (statusParam === "active") {
      query = query.neq("status", "deleted");
    } else if (statusParam !== "all") {
      query = query.eq("status", statusParam);
    }

    if (candidateId) query = query.eq("candidateId", candidateId);

    // If filtering by minwonId, first get pledgeProposalIds linked to that minwon
    if (minwonId) {
      const { data: links } = await supabase
        .from("PledgeProposalMinwon")
        .select("pledgeProposalId")
        .eq("minwonId", minwonId);

      const ids = (links ?? []).map((l) => l.pledgeProposalId);
      if (ids.length === 0) {
        return apiSuccess({ data: [], total: 0, limit, offset });
      }
      query = query.in("id", ids);
    }

    const { data, count, error } = await query;

    if (error) {
      // Table not yet created
      if (error.code === "42P01" || error.code === "PGRST200") {
        return apiSuccess({ data: [], total: 0, limit, offset });
      }
      console.error("[GET /api/pledge-proposals] error:", error);
      return apiError("공약 제안 목록을 불러올 수 없습니다", 500);
    }

    return apiSuccess({ data: data ?? [], total: count ?? 0, limit, offset });
  } catch (err) {
    console.error("[GET /api/pledge-proposals]", err);
    return apiError("공약 제안 목록을 불러올 수 없습니다", 500);
  }
}

/**
 * POST /api/pledge-proposals
 * Create a new 공약 제안.
 *
 * Body (visitor):
 *   { title, content, authorName, captchaToken, minwonIds: string[], honeypot? }
 *
 * Body (candidate — requires auth):
 *   { title, content, minwonIds: string[] }
 *   authorName is taken from session.
 *
 * Rules:
 *   - Candidates MUST provide at least one minwonId.
 *   - Visitors may also provide minwonIds (optional but strongly encouraged).
 *   - Rate limit: 5 / hour for visitors.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      title: string;
      content: string;
      authorName?: string;
      captchaToken?: string;
      minwonIds?: string[];
      honeypot?: string;
    };

    // Honeypot
    if (body.honeypot && body.honeypot.length > 0) {
      return apiError("Invalid request", 400);
    }

    if (!body.title?.trim()) return apiError("제목을 입력해주세요", 400);
    if (!body.content?.trim()) return apiError("내용을 입력해주세요", 400);
    if (body.title.length > 80) return apiError("제목은 80자 이하로 입력해주세요", 400);
    if (body.content.length > 1000) return apiError("내용은 1000자 이하로 입력해주세요", 400);

    const session = await getServerSession(authOptions);
    const candidateId = (session?.user as { id?: string })?.id ?? null;
    const isCandidate = !!candidateId;

    // Candidates MUST link a minwon
    const minwonIds = Array.isArray(body.minwonIds) ? body.minwonIds.filter(Boolean) : [];
    if (isCandidate && minwonIds.length === 0) {
      return apiError("후보자는 민원을 선택해야 공약 제안을 작성할 수 있습니다.", 400);
    }

    const rawIp = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "127.0.0.1";
    const ipHash = hashIp(rawIp);

    if (!isCandidate) {
      // CAPTCHA for visitors
      if (!body.captchaToken) return apiError("보안 문자 인증이 필요합니다", 400);
      if (!(await verifyRecaptcha(body.captchaToken))) {
        return apiError("보안 문자 인증에 실패했습니다. 다시 시도해주세요.", 400);
      }

      if (!body.authorName?.trim()) return apiError("작성자 이름을 입력해주세요", 400);
      if (body.authorName.length > 30) return apiError("이름은 30자 이하로 입력해주세요", 400);

      // Rate limit: 5 per hour
      const oneHourAgo = new Date(Date.now() - 3600_000).toISOString();
      const { count: recent } = await supabase
        .from("PledgeProposal")
        .select("id", { count: "exact", head: true })
        .eq("ipHash", ipHash)
        .neq("status", "deleted")
        .gte("createdAt", oneHourAgo);
      if ((recent ?? 0) >= 5) {
        return apiError("1시간에 최대 5개의 공약 제안만 작성할 수 있습니다", 429);
      }
    }

    // Get candidate name from DB if needed
    let authorName = body.authorName?.trim() ?? "";
    if (isCandidate) {
      const { data: cand } = await supabase
        .from("Candidate")
        .select("name")
        .eq("id", candidateId)
        .single();
      authorName = cand?.name ?? "후보자";
    }

    // Insert PledgeProposal
    const { data: created, error: insertErr } = await supabaseAdmin
      .from("PledgeProposal")
      .insert({
        title:       body.title.trim(),
        content:     body.content.trim(),
        authorName,
        authorType:  isCandidate ? "candidate" : "visitor",
        candidateId: candidateId ?? null,
        ipHash:      isCandidate ? null : ipHash,
        status:      "pending",
      })
      .select("id")
      .single();

    if (insertErr) {
      if (insertErr.code === "42P01" || insertErr.code === "PGRST200") {
        return apiError("서버 설정 중입니다. 잠시 후 다시 시도해주세요.", 503);
      }
      console.error("[POST /api/pledge-proposals] insert:", insertErr);
      return apiError("공약 제안 등록에 실패했습니다", 500);
    }

    // Link minwons (if provided)
    if (minwonIds.length > 0 && created?.id) {
      // Verify that these minwons exist and have postType = "민원"
      const { data: validMinwons } = await supabase
        .from("ProposalPost")
        .select("id")
        .in("id", minwonIds)
        .eq("postType", "민원")
        .neq("status", "deleted");

      const validIds = (validMinwons ?? []).map((m) => m.id);
      if (validIds.length > 0) {
        await supabaseAdmin
          .from("PledgeProposalMinwon")
          .insert(validIds.map((mid) => ({ pledgeProposalId: created.id, minwonId: mid })));
      }
    }

    return apiSuccess({ id: created?.id, message: "공약 제안이 등록되었습니다." }, 201);
  } catch (err) {
    console.error("[POST /api/pledge-proposals]", err);
    return apiError("공약 제안 등록에 실패했습니다", 500);
  }
}
