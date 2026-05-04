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
]);

function tokenize(text: string): string[] {
  // Strip URLs and non-Korean/English/digit characters
  const cleaned = text
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^가-힯ㄱ-ㆎa-zA-Z0-9 ]/g, " ");
  return cleaned
    .split(/\s+/)
    .map((s) => s.trim())
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
      topKeywords: top,
    },
  });
}
