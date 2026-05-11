import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { apiError } from "@/lib/api-utils";

/**
 * GET /api/proposals/keywords?range=7d|30d|all&postType=민원|제안|all
 *
 * 게시글 본문/제목에서 가장 많이 등장한 키워드 집계.
 * - 숨김(status='hidden')·삭제(status='deleted') 제외
 * - 금지어(MapPinSettings.uiTexts._bannedWords) 제외
 * - 한국어 stopwords 제외, 2자 이상만
 */

type Range = "7d" | "30d" | "all";

const KOREAN_STOPWORDS = new Set([
  "그리고","그런데","그러나","하지만","또한","그래서","그러므로","즉","따라서","마찬가지로",
  "있는","있어","없는","없어","있음","없음","입니다","합니다","됩니다","됐다","했다","된다","한다",
  "이런","저런","그런","어떤","어느","무슨","뭔","뭐","무엇","어떻게","왜","언제","어디","누가",
  "정말","진짜","너무","아주","매우","조금","많이","많은","조금","계속","항상","바로",
  "지금","오늘","어제","내일","요즘","최근","현재",
  "여기","저기","거기","우리","저희","제가","내가","니가","당신","사람","사람들","분들","주민",
  "더","덜","좀","꼭","또","및","와","과","에서","으로","에게","처럼","같이","같은","대해","대한",
  "위해","위한","통해","통한","보다","부터","까지","마다","마저","조차","뿐","뿐만","아니라",
  "수","것","점","때","곳","번","건","개","명","원","년","월","일","시","분","초",
  "이게","저게","그게","이거","저거","그거","이것","저것","그것","이제","근데","그냥",
  "있는데","있고","있다","없다","없고","없는데",
  "되는","되어","되어서","됨","돼","돼서","된","돼야","해야","하게","하면","해서","하지","하고","해도",
  "안","못","약","약간","아예","전혀","결코","대신","따로","서로","함께","같이",
  "하나","둘","셋","첫","둘째","셋째","처음","마지막","지난",

  // ─── 자주 등장하는 한국어 동사·형용사 활용형 (별도 정규식으로도 강하게 거름) ───
  "있습니다","없습니다","많습니다","적습니다","같습니다","좋습니다","나쁩니다",
  "필요합니다","가능합니다","불가능합니다","어렵습니다","쉽습니다","아닙니다","맞습니다",
  "다릅니다","비슷합니다","드립니다","바랍니다","원합니다","원해요","주세요","해주세요",
  "있어요","없어요","해요","가요","와요","봐요","줘요","받아요","좋아요","나빠요",
  "갑니다","옵니다","줍니다","받습니다","봅니다","삽니다","말합니다","생각합니다",
  "한다","된다","간다","온다","준다","받는다","산다","본다","말한다","생각한다",
  // 관형사형 (~는, ~은)
  "가는","오는","있는","없는","좋은","큰","작은","많은","적은","필요한","가능한",
  "다른","같은","비슷한","다양한","새로운","오래된","최근에",
  // 미래형 (~ㄹ, ~을)
  "갈","올","할","될","볼","줄","받을","쓸","낼","들",
  // 단발 동사·부사
  "잘","많이","적게","빨리","천천히","계속해서","이미","아직","곧","역시","결국",
]);

/**
 * 한국어 동사·형용사 활용형 패턴 — KOREAN_STOPWORDS로 못 잡는 흔한 어미들을 정규식으로 일괄 거름.
 *
 *  - ~습니다 / ~ㅂ니다 / ~십니다 (격식체 동사 어미)
 *  - ~네요 / ~어요 / ~아요 / ~예요 / ~에요 (해요체)
 *  - ~었습니다 / ~았습니다 / ~겠습니다 (시제 격식체)
 *  - ~합니다 / ~됩니다 (~서술형은 이미 직접 등록)
 *  - 2자 이상의 명사가 아닌 활용형만 거르도록 length >= 3 조건
 */
function isVerbLikeForm(word: string): boolean {
  if (word.length < 3) return false;
  if (/(습니다|ㅂ니다|십니다)$/.test(word)) return true;
  if (/(었습니다|았습니다|겠습니다|겠어요)$/.test(word)) return true;
  if (/(네요|어요|아요|예요|에요)$/.test(word) && word.length >= 3) return true;
  return false;
}

// 한국어 조사 — 단어 끝에 붙어있으면 떼어내서 동일 명사로 합침
// (사전 기반 형태소 분석은 너무 무거움 → 간단 휴리스틱)
const KOREAN_PARTICLES = [
  "으로서", "으로써", "에서는", "에서도", "에게서", "한테서",
  "에서", "에게", "한테", "께서", "으로", "에는", "에도", "라고", "이라",
  "이가", "이는", "이를", "이의", "이를", "처럼", "같이", "마다", "보다", "부터",
  "까지", "조차", "마저", "라도", "이라", "이며", "이고",
  "은", "는", "이", "가", "을", "를", "의", "에", "도", "와", "과", "로", "야", "여",
];
const PARTICLES_SORTED = KOREAN_PARTICLES.slice().sort((a, b) => b.length - a.length);

function stripParticle(word: string): string {
  // 한글로만 끝나는 경우에만 적용 (영어/숫자 단어는 그대로)
  if (!/[가-힯]$/.test(word)) return word;
  for (const p of PARTICLES_SORTED) {
    if (word.length > p.length + 1 && word.endsWith(p)) {
      return word.slice(0, -p.length);
    }
  }
  return word;
}

function tokenize(text: string): string[] {
  // Strip URLs and non-Korean/English/digit characters
  const cleaned = text
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^가-힯ㄱ-ㆎa-zA-Z0-9 ]/g, " ");
  return cleaned
    .split(/\s+/)
    .map((s) => stripParticle(s.trim()))
    .filter((s) => s.length >= 2 && s.length <= 20);
}

function rangeStart(range: Range): Date | null {
  const now = new Date();
  switch (range) {
    case "7d":  { const d = new Date(now); d.setDate(d.getDate() - 7); return d; }
    case "30d": { const d = new Date(now); d.setDate(d.getDate() - 30); return d; }
    case "all": return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const range = (searchParams.get("range") ?? "7d") as Range;
  const postType = searchParams.get("postType") ?? "all";
  const topN = Math.min(parseInt(searchParams.get("top") ?? "30", 10), 100);
  if (!["7d", "30d", "all"].includes(range)) return apiError("range는 7d|30d|all", 400);

  // Fetch banned words list
  let bannedWords: string[] = [];
  try {
    const { data } = await supabaseAdmin
      .from("MapPinSettings")
      .select("uiTexts")
      .eq("id", "default")
      .single();
    const stored = (data as { uiTexts?: Record<string, unknown> } | null)?.uiTexts ?? {};
    if (Array.isArray(stored["_bannedWords"])) {
      bannedWords = (stored["_bannedWords"] as string[]).map((w) => w.trim().toLowerCase()).filter(Boolean);
    }
  } catch { /* fall back to empty list */ }
  const bannedSet = new Set(bannedWords);

  // ─── 지명(시군구·행정동·법정동) 자동 제외 ──────────────────────────────
  // "천안", "천안시", "불당동", "봉명1동" 같은 지명은 키워드 분석에서 의미가 없음.
  const placeNames = new Set<string>();
  try {
    const { data: places } = await supabaseAdmin
      .from("ProposalPost")
      .select("city, admDong, legalDong")
      .limit(10000);
    for (const r of places ?? []) {
      const c   = (r as { city?: string | null }).city;
      const adm = (r as { admDong?: string | null }).admDong;
      const leg = (r as { legalDong?: string | null }).legalDong;
      if (c) {
        placeNames.add(c);
        // "천안시" → "천안" 도 같이 추가 (조사 strip 후 매칭되도록)
        const stripped = c.replace(/(특별시|광역시|특별자치시|특별자치도|시|군|구|도|읍|면|동)$/u, "");
        if (stripped && stripped !== c) placeNames.add(stripped);
      }
      if (adm) {
        placeNames.add(adm);
        // "봉명1동" → "봉명" 도 추가
        const stripped = adm.replace(/(\d+가|\d+동|동|읍|면)$/u, "");
        if (stripped && stripped !== adm) placeNames.add(stripped);
      }
      if (leg) {
        placeNames.add(leg);
        const stripped = leg.replace(/(\d+가|\d+동|동|읍|면)$/u, "");
        if (stripped && stripped !== leg) placeNames.add(stripped);
      }
    }
    // 충남 광역 — 항상 포함 (게시글에 지역 직접 언급 다수)
    ["충남", "충청남도", "충청"].forEach((p) => placeNames.add(p));
  } catch { /* no big deal — falls back to no place exclusion */ }

  // Fetch posts (text only — no joins). Exclude hidden/deleted.
  let q = supabase
    .from("ProposalPost")
    .select("title, content, postType, createdAt", { count: "exact" })
    .not("status", "in", "(deleted,hidden)")
    .order("createdAt", { ascending: false })
    .limit(5000);

  const start = rangeStart(range);
  if (start) q = q.gte("createdAt", start.toISOString());
  if (postType === "민원" || postType === "제안") q = q.eq("postType", postType);

  const { data, error, count } = await q;
  if (error) {
    console.error("[GET /api/proposals/keywords]", error);
    return apiError("키워드 분석 실패", 500);
  }

  // Tokenize and count
  const counter = new Map<string, number>();
  for (const row of data ?? []) {
    const text = `${row.title ?? ""} ${row.content ?? ""}`;
    for (const tok of tokenize(text)) {
      const lower = tok.toLowerCase();
      if (KOREAN_STOPWORDS.has(tok) || KOREAN_STOPWORDS.has(lower)) continue;
      if (bannedSet.has(lower)) continue;
      if (placeNames.has(tok)) continue;     // 지명 제외
      if (isVerbLikeForm(tok)) continue;     // 동사·형용사 활용형 제외
      // crude: skip pure-number tokens
      if (/^\d+$/.test(tok)) continue;
      counter.set(tok, (counter.get(tok) ?? 0) + 1);
    }
  }

  const top = Array.from(counter.entries())
    .sort(([a, ca], [b, cb]) => cb - ca || a.localeCompare(b))
    .slice(0, topN)
    .map(([word, count]) => ({ word, count }));

  return NextResponse.json({
    success: true,
    data: {
      range,
      postType,
      analyzedPostCount: data?.length ?? 0,
      totalPostCount: count ?? data?.length ?? 0,
      bannedWordCount: bannedWords.length,
      placeNameCount: placeNames.size,
      topKeywords: top,
    },
  });
}
