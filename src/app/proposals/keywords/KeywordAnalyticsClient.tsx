"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Range = "7d" | "30d" | "all";
type PostType = "all" | "민원" | "제안";

interface KeywordRow { word: string; count: number; }
interface KeywordsData {
  range: Range;
  postType: PostType;
  analyzedPostCount: number;
  totalPostCount: number;
  bannedWordCount: number;
  placeNameCount: number;
  topKeywords: KeywordRow[];
}

const RANGE_LABEL: Record<Range, string> = { "7d": "주간 (7일)", "30d": "월간 (30일)", "all": "전체 기간" };
const TYPE_LABEL: Record<PostType, string> = { all: "전체", "민원": "📢 불편제보만", "제안": "💡 공약제안만" };

// Color palette for keyword cloud — uses primary tones
const PALETTE = ["text-rose-600", "text-orange-600", "text-amber-600", "text-emerald-600", "text-sky-600", "text-blue-600", "text-violet-600", "text-fuchsia-600"];

export default function KeywordAnalyticsClient() {
  const [range, setRange] = useState<Range>("7d");
  const [type, setType] = useState<PostType>("all");
  const [data, setData] = useState<KeywordsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/proposals/keywords?range=${range}&postType=${type === "all" ? "all" : type}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setData(j.data);
        else setError(j.error ?? "분석 실패");
      })
      .catch(() => setError("네트워크 오류"))
      .finally(() => setLoading(false));
  }, [range, type]);

  const max = useMemo(() => Math.max(1, ...((data?.topKeywords ?? []).map((k) => k.count))), [data]);

  return (
    <div className="max-w-screen-lg mx-auto p-4 md:p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <Link href="/reports" className="text-xs text-muted hover:text-foreground">
            ← 제보·제안 게시판
          </Link>
          <h1 className="text-2xl font-bold text-foreground mt-1">📊 키워드 데이터 분석</h1>
          <p className="text-xs text-muted mt-0.5">
            주민들이 작성한 제보·제안에서 가장 많이 언급된 단어를 한눈에. 숨김 처리된 글과 금지어는 자동 제외됩니다.
          </p>
        </div>
      </div>

      {/* Filter row */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <div className="flex gap-1 bg-surface border border-border rounded-lg p-0.5">
          {(["7d", "30d", "all"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                range === r ? "bg-primary text-white" : "text-muted hover:text-foreground"
              }`}
            >
              {RANGE_LABEL[r]}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-surface border border-border rounded-lg p-0.5">
          {(["all", "민원", "제안"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                type === t ? "bg-primary text-white" : "text-muted hover:text-foreground"
              }`}
            >
              {TYPE_LABEL[t]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-muted text-sm">분석 중...</p>
      ) : error ? (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      ) : !data || data.topKeywords.length === 0 ? (
        <p className="text-muted text-sm">분석할 데이터가 없습니다.</p>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
            <SummaryCard label="분석 기간" value={RANGE_LABEL[data.range]} />
            <SummaryCard label="대상 게시글" value={`${data.analyzedPostCount.toLocaleString()}건`} />
            <SummaryCard label="추출 키워드" value={`${data.topKeywords.length}개`} highlight />
            <SummaryCard label="제외된 금지어" value={`${data.bannedWordCount}개`} />
            <SummaryCard label="제외된 지명" value={`${data.placeNameCount}개`} />
          </div>

          {/* Keyword Cloud — sized & colored by frequency */}
          <div className="bg-surface border border-border rounded-2xl p-6 mb-6">
            <h2 className="text-base font-semibold text-foreground mb-1">☁️ 키워드 클라우드</h2>
            <p className="text-xs text-muted mb-4">크기와 색이 진할수록 더 자주 등장한 단어입니다.</p>
            <div className="flex flex-wrap gap-x-4 gap-y-2 items-baseline justify-center py-4 leading-tight">
              {data.topKeywords.map((k, i) => {
                const ratio = k.count / max;
                const fontSize = 0.85 + ratio * 1.6; // rem
                const color = PALETTE[i % PALETTE.length];
                const opacity = 0.55 + ratio * 0.45;
                return (
                  <span
                    key={k.word}
                    className={`font-bold ${color} hover:underline cursor-default`}
                    style={{ fontSize: `${fontSize.toFixed(2)}rem`, opacity }}
                    title={`${k.word}: ${k.count.toLocaleString()}회 등장`}
                  >
                    {k.word}
                    <sup className="text-[9px] font-medium text-muted ml-0.5 align-super">{k.count}</sup>
                  </span>
                );
              })}
            </div>
          </div>

          {/* Top-N bar chart */}
          <div className="bg-surface border border-border rounded-2xl p-6">
            <h2 className="text-base font-semibold text-foreground mb-4">📊 빈도 순위 (Top {data.topKeywords.length})</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted">
                  <th className="text-left py-2 pr-2 font-medium w-10">#</th>
                  <th className="text-left py-2 pr-2 font-medium w-32">키워드</th>
                  <th className="text-left py-2 pr-2 font-medium w-16">빈도</th>
                  <th className="text-left py-2 font-medium">분포</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {data.topKeywords.map((k, i) => (
                  <tr key={k.word}>
                    <td className="py-1.5 pr-2 text-muted text-xs font-mono">{i + 1}</td>
                    <td className="py-1.5 pr-2 font-semibold text-foreground">{k.word}</td>
                    <td className="py-1.5 pr-2 text-primary font-bold">{k.count}</td>
                    <td className="py-1.5">
                      <div className="h-3 rounded-sm bg-primary/70" style={{ width: `${Math.max(2, (k.count / max) * 100)}%` }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-[10px] text-muted text-center">
            한국어 stopword(이/가/는/은 등)·조사·지명(시군구·행정동·법정동)·금지어는 자동 제외 · 2자 이상 단어만 집계
          </p>
        </>
      )}
    </div>
  );
}

function SummaryCard({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className={`border rounded-xl p-3 ${highlight ? "bg-primary/5 border-primary/30" : "bg-surface border-border"}`}>
      <p className="text-[10px] font-medium text-muted">{label}</p>
      <p className={`text-base font-bold mt-0.5 ${highlight ? "text-primary" : "text-foreground"}`}>{value}</p>
    </div>
  );
}
