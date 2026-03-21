import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createProposalSchema } from "@/lib/validations";
import { apiSuccess, apiError, apiValidationError } from "@/lib/api-utils";
import { verifyRecaptcha } from "@/app/api/captcha/route";

const IP_HASH_SALT = process.env.IP_HASH_SALT || "reform-chungnam-salt";
const DEFAULT_BANNED_REDIRECT = "https://check.junseok.kr/";

/** Fetch banned words config from MapPinSettings (cached per cold-start) */
let _bannedWordsCache: { words: string[]; redirectUrl: string; cachedAt: number } | null = null;
const BANNED_CACHE_TTL_MS = 60_000; // 1 minute

async function getBannedWordsConfig(): Promise<{ words: string[]; redirectUrl: string }> {
  const now = Date.now();
  if (_bannedWordsCache && now - _bannedWordsCache.cachedAt < BANNED_CACHE_TTL_MS) {
    return { words: _bannedWordsCache.words, redirectUrl: _bannedWordsCache.redirectUrl };
  }
  try {
    const { data } = await supabaseAdmin
      .from("MapPinSettings")
      .select("uiTexts")
      .eq("id", "default")
      .single();
    const stored = (data as { uiTexts?: Record<string, unknown> } | null)?.uiTexts ?? {};
    const words = Array.isArray(stored._bannedWords)
      ? (stored._bannedWords as string[]).filter((w) => typeof w === "string" && w.length > 0)
      : [];
    const redirectUrl =
      typeof stored._bannedWordRedirectUrl === "string" && stored._bannedWordRedirectUrl
        ? (stored._bannedWordRedirectUrl as string)
        : DEFAULT_BANNED_REDIRECT;
    _bannedWordsCache = { words, redirectUrl, cachedAt: now };
    return { words, redirectUrl };
  } catch {
    return { words: [], redirectUrl: DEFAULT_BANNED_REDIRECT };
  }
}

function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(ip + IP_HASH_SALT).digest("hex");
}

/** Columns guaranteed to exist in the current schema */
const SAFE_SELECT = "id, content, authorName, city, candidateId, status, createdAt";
/** Columns added in migration v10 */
const V10_SELECT = "title, latitude, longitude, acceptedAt, parentId, dong, adminStatus";
/** Columns added in migration v11 */
const V11_SELECT = "postType";
/** ProposalResponse join (migration v12) */
const RESPONSE_JOIN = "responses:ProposalResponse(id, candidateId, candidateName, candidateProfileImage, status, content, pledgeId, createdAt)";
/** Full select with ProposalLike join + responses */
const FULL_SELECT = `${SAFE_SELECT}, ${V10_SELECT}, ${V11_SELECT},
  candidate:Candidate!candidateId(id, name, district, profileImage, role),
  likes:ProposalLike(count),
  ${RESPONSE_JOIN}`;
/** Fallback without responses join */
const FULL_SELECT_NO_RESP = `${SAFE_SELECT}, ${V10_SELECT}, ${V11_SELECT},
  candidate:Candidate!candidateId(id, name, district, profileImage, role),
  likes:ProposalLike(count)`;
/** Fallback without v11 (postType) */
const V10_FALLBACK_SELECT = `${SAFE_SELECT}, ${V10_SELECT},
  candidate:Candidate!candidateId(id, name, district, profileImage, role),
  likes:ProposalLike(count)`;
/** Fallback select without v10/v11 additions */
const FALLBACK_SELECT = `${SAFE_SELECT},
  candidate:Candidate!candidateId(id, name, district, profileImage, role)`;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get("city");
    const candidateId = searchParams.get("candidateId");
    const hasLocation = searchParams.get("hasLocation") === "true";
    const postType = searchParams.get("postType");
    const sort = searchParams.get("sort") ?? "popular"; // "latest" | "popular"
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 500);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);
    const since = searchParams.get("since"); // ISO date string for filtering createdAt >= since
    const parentId = searchParams.get("parentId");

    const buildQuery = (selectStr: string) => {
      let q = supabase
        .from("ProposalPost")
        .select(selectStr, { count: "exact" })
        .neq("status", "deleted")
        .order("createdAt", { ascending: false })
        .range(offset, offset + limit - 1);

      if (city) q = q.ilike("city", `${city}%`);
      if (candidateId) q = q.eq("candidateId", candidateId);
      // postType filter only applied when v11 migration is present
      if (postType && (selectStr.includes("postType"))) q = q.eq("postType", postType);
      if (since) q = q.gte("createdAt", since);
      if (parentId !== null) q = q.eq("parentId", parentId as string);
      // hasLocation only works after v10 migration
      return q;
    };

    const MIGRATION_ERRORS = ["42703", "42P01", "PGRST204", "PGRST200"];
    // Try full query first (v10 + v11 + responses)
    let { data: proposals, count, error } = await buildQuery(FULL_SELECT);

    if (error && MIGRATION_ERRORS.includes(error.code)) {
      // ProposalResponse table not yet created — try without it
      ({ data: proposals, count, error } = await buildQuery(FULL_SELECT_NO_RESP));
    }
    if (error && MIGRATION_ERRORS.includes(error.code)) {
      // v11 (postType) not applied yet — try without it
      ({ data: proposals, count, error } = await buildQuery(V10_FALLBACK_SELECT));
    }
    if (error && MIGRATION_ERRORS.includes(error.code)) {
      // v10 migration not applied yet — use fully safe fallback
      ({ data: proposals, count, error } = await buildQuery(FALLBACK_SELECT));
    }

    if (error) {
      console.error("[GET /api/proposals] Supabase error:", error);
      return apiError("제안 목록을 불러올 수 없습니다", 500);
    }

    const enriched = (proposals ?? []).map((p) => {
      const row = p as unknown as Record<string, unknown>;
      const likes = row.likes as Array<{ count: number }> | null;
      const likeCount = likes?.[0]?.count ?? 0;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { likes: _likes, ...rest } = row;
      return { ...rest, likeCount };
    });

    if (sort === "popular") {
      enriched.sort((a, b) => (b.likeCount as number) - (a.likeCount as number));
    }

    return NextResponse.json({
      success: true,
      data: enriched,
      total: count ?? 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error("[GET /api/proposals]", error);
    return apiError("제안 목록을 불러올 수 없습니다", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createProposalSchema.parse(body);

    // Honeypot check
    if (validated.honeypot && validated.honeypot.length > 0) {
      return apiError("Invalid request", 400);
    }

    // Session check: logged-in users skip CAPTCHA
    const session = await getServerSession(authOptions);
    const sessionUser = session
      ? {
          id: (session.user as { id?: string })?.id ?? null,
          name: session.user?.name ?? null,
          role: (session.user as { role?: string })?.role ?? null,
        }
      : null;
    const isAdmin = sessionUser?.role === "admin";
    const isCandidate = sessionUser?.role === "candidate";
    const isAuthenticated = !!sessionUser;

    // CAPTCHA verification (only for non-authenticated users)
    if (!isAuthenticated) {
      if (!validated.captchaToken || !(await verifyRecaptcha(validated.captchaToken))) {
        return apiError("보안 문자 인증에 실패했습니다. 다시 시도해주세요.", 400);
      }
      if (!validated.authorName) {
        return apiError("이름을 입력해주세요.", 400);
      }
    }

    // Reserved name check (guests only)
    if (!isAuthenticated && validated.authorName) {
      const RESERVED = ["관리자", "admin", "administrator", "운영자", "개혁신당", "후보자", "candidate"];
      const lower = validated.authorName.toLowerCase();
      if (RESERVED.some((r) => lower.includes(r.toLowerCase()))) {
        return apiError("사용할 수 없는 이름입니다.", 400);
      }
    }

    // Banned word check (guests only — candidates and admins bypass)
    if (!isAuthenticated) {
      const { words: bannedWords, redirectUrl: bannedRedirectUrl } = await getBannedWordsConfig();
      if (bannedWords.length > 0) {
        const textToCheck = [
          validated.title ?? "",
          validated.content ?? "",
          validated.authorName ?? "",
        ].join(" ").toLowerCase();
        const matched = bannedWords.some((w) => textToCheck.includes(w.toLowerCase()));
        if (matched) {
          return NextResponse.json(
            { success: false, error: "이 내용은 등록할 수 없습니다.", redirectUrl: bannedRedirectUrl },
            { status: 451 }
          );
        }
      }
    }

    // IP hashing
    const rawIp =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      "127.0.0.1";
    const ipHash = hashIp(rawIp);

    // Rate limit: max 5 proposals per hour per IP (skip for authenticated users)
    if (!isAuthenticated) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count: recentCount, error: countError } = await supabase
        .from("ProposalPost")
        .select("id", { count: "exact", head: true })
        .eq("ipHash", ipHash)
        .neq("status", "deleted")
        .gte("createdAt", oneHourAgo);

      if (countError) {
        console.error("[POST /api/proposals] Rate limit check error:", countError);
      }

      if ((recentCount ?? 0) >= 5) {
        return apiError("1시간에 최대 5개의 제안만 작성할 수 있습니다", 429);
      }
    }

    // Strip client-only fields before inserting
    const {
      honeypot: _h,
      captchaToken: _ct,
      password: rawPassword,
      title,
      latitude,
      longitude,
      postType,
      issueId,
      ...baseInsert
    } = validated;

    // Hash password for guest posts so they can delete later
    const passwordHash =
      !isAuthenticated && rawPassword && rawPassword.length > 0
        ? await bcrypt.hash(rawPassword, 10)
        : null;

    // For logged-in users: override authorName and candidateId from session
    if (isAdmin) {
      baseInsert.authorName = validated.authorName?.trim() || "익명";
      baseInsert.candidateId = null;
    } else if (isCandidate || sessionUser) {
      baseInsert.authorName = sessionUser!.name ?? baseInsert.authorName ?? "후보자";
      baseInsert.candidateId = sessionUser!.id ?? baseInsert.candidateId ?? null;
    }

    // Auto-populate city from candidate's district if not provided
    if (baseInsert.candidateId && !baseInsert.city) {
      const { data: cand } = await supabase
        .from("Candidate")
        .select("district")
        .eq("id", baseInsert.candidateId)
        .single();
      if (cand?.district) baseInsert.city = cand.district;
    }

    // Try full insert with v10 columns
    const fullInsert = {
      ...baseInsert,
      title,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      postType: postType ?? "제안",
      ipHash,
      status: "pending",
      ...(passwordHash ? { passwordHash } : {}),
      ...(issueId ? { issueId } : {}),
    };

    let { data: proposal, error } = await supabase
      .from("ProposalPost")
      .insert(fullInsert)
      .select(`${SAFE_SELECT}, ${V10_SELECT}, candidate:Candidate!candidateId(id, name, district)`)
      .single();

    // If v10 columns don't exist yet (PGRST204 = PostgREST schema cache miss), retry with safe columns only
    if (error && (error.code === "42703" || error.code === "PGRST204" || error.code === "PGRST200")) {
      ({ data: proposal, error } = await supabase
        .from("ProposalPost")
        .insert({ ...baseInsert, ipHash, status: "pending" })
        .select(`${SAFE_SELECT}, candidate:Candidate!candidateId(id, name, district)`)
        .single());
    }

    if (error) {
      console.error("[POST /api/proposals] Supabase error:", error);
      return apiError("제안 생성에 실패했습니다", 500);
    }

    return apiSuccess({ ...proposal, title: title ?? null }, 201);
  } catch (error) {
    if (error instanceof ZodError) return apiValidationError(error);
    console.error("[POST /api/proposals]", error);
    return apiError("제안 생성에 실패했습니다", 500);
  }
}
