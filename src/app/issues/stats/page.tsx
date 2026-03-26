"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";

const WeeklyCardNewsCarousel = dynamic(() => import("@/components/proposals/WeeklyCardNewsCarousel"), { ssr: false });
const CardNewsCarousel = dynamic(() => import("@/components/proposals/CardNewsCarousel"), { ssr: false });

// ─── Types ────────────────────────────────────────────────────────────────────
interface HotIssue {
  id: string;
  title: string;
  category: string | null;
  city: string | null;
  dong: string | null;
  reportCount: number;
  weekReports: number;
}
interface CityItem {
  city: string;
  total: number;
  reports: number;
  proposals: number;
}
interface DongItem {
  dong: string;
  count: number;
}
interface TopLikedPost {
  id: string;
  title: string | null;
  content: string;
  authorName: string;
  city: string | null;
  dong: string | null;
  postType: string;
  likeCount: number;
  viewCount: number;
}
interface WeeklyStats {
  weekStart: string;
  weekEnd: string;
  newReports: number;
  newProposals: number;
  totalPosts: number;
  totalViews: number;
  hotIssues: HotIssue[];
  cityBreakdown: CityItem[];
  dongBreakdown: DongItem[];
  prevWeekReports: number;
  prevWeekProposals: number;
  topLikedPosts: TopLikedPost[];
}

interface DailyPost {
  id: string;
  title: string | null;
  content: string;
  authorName: string;
  city: string | null;
  dong: string | null;
  postType: string;
  likeCount: number;
  viewCount: number;
  createdAt: string;
}
interface DailyCityBreakdown {
  city: string;
  reports: number;
  proposals: number;
  total: number;
}
interface DailyStats {
  date: string;
  reports: DailyPost[];
  proposals: DailyPost[];
  totalReports: number;
  totalProposals: number;
  cityBreakdown: DailyCityBreakdown[];
  topLikedPosts: DailyPost[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  교통: "bg-blue-100 text-blue-700",
  안전: "bg-red-100 text-red-700",
  교육: "bg-purple-100 text-purple-700",
  복지: "bg-green-100 text-green-700",
  경제: "bg-yellow-100 text-yellow-800",
  환경: "bg-emerald-100 text-emerald-700",
  문화: "bg-pink-100 text-pink-700",
  기타: "bg-gray-100 text-gray-600",
};

function getMondayOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function formatWeekLabel(start: Date): string {
  const year = start.getFullYear();
  const month = start.getMonth() + 1;
  const weekNum = Math.ceil(start.getDate() / 7);
  return `${year}년 ${month}월 ${weekNum}주`;
}

function formatDateRange(start: Date, end: Date): string {
  const fmt = (d: Date) =>
    `${d.getMonth() + 1}/${d.getDate()}(${["일", "월", "화", "수", "목", "금", "토"][d.getDay()]})`;
  return `${fmt(start)} ~ ${fmt(end)}`;
}

function trendBadge(current: number, prev: number) {
  if (prev === 0 && current === 0) return null;
  const diff = current - prev;
  if (diff === 0) return <span className="text-xs text-gray-400 font-medium">지난주와 동일</span>;
  if (diff > 0)
    return (
      <span className="text-xs text-orange-500 font-bold">
        ▲ {diff} 더 많음
      </span>
    );
  return (
    <span className="text-xs text-blue-400 font-bold">
      ▼ {Math.abs(diff)} 더 적음
    </span>
  );
}

const RANK_EMOJI = ["🥇", "🥈", "🥉", "4", "5"];

// ─── Component ────────────────────────────────────────────────────────────────
export default function WeeklyStatsPage() {
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week
  const [data, setData] = useState<WeeklyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"weekly" | "daily">("weekly");
  const [dayOffset, setDayOffset] = useState(0);
  const [dailyData, setDailyData] = useState<DailyStats | null>(null);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyError, setDailyError] = useState<string | null>(null);

  const currentMonday = getMondayOfWeek(new Date());
  const targetMonday = addDays(currentMonday, weekOffset * 7);
  const targetSunday = addDays(targetMonday, 6);

  // Minimum allowed dates
  const MIN_DATE = new Date("2026-03-01T00:00:00");
  const MIN_MONDAY = (() => {
    const d = new Date("2026-03-01T00:00:00");
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  })();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const weekStart = targetMonday.toISOString().split("T")[0];
      const res = await fetch(`/api/issues/weekly-stats?weekStart=${weekStart}`);
      if (!res.ok) throw new Error("데이터 로드 실패");
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  }, [weekOffset]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();
  }, [load]);

  function getDateMidnight(offset: number): Date {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  const targetDay = getDateMidnight(dayOffset);
  const nextDay = getDateMidnight(dayOffset + 1);
  const isToday = dayOffset >= 0;
  const dayLabel = dayOffset === 0 ? "오늘" : dayOffset === -1 ? "어제" : `${Math.abs(dayOffset)}일 전`;

  const loadDaily = useCallback(async () => {
    setDailyLoading(true);
    setDailyError(null);
    try {
      const since = targetDay.toISOString();
      const until = nextDay.toISOString();
      const [rRes, pRes] = await Promise.all([
        fetch(`/api/proposals?limit=500&postType=민원&since=${since}&until=${until}&sort=popular`),
        fetch(`/api/proposals?limit=500&postType=제안&since=${since}&until=${until}&sort=popular`),
      ]);
      if (!rRes.ok || !pRes.ok) throw new Error("데이터 로드 실패");
      const [rJson, pJson] = await Promise.all([rRes.json(), pRes.json()]);
      const reports: DailyPost[] = (rJson.data ?? []).map((p: Record<string, unknown>) => ({
        id: p.id as string, title: (p.title as string | null) ?? null, content: p.content as string,
        authorName: p.authorName as string, city: (p.city as string | null) ?? null,
        dong: (p.dong as string | null) ?? null, postType: (p.postType as string) ?? "민원",
        likeCount: (p.likeCount as number) ?? 0, viewCount: (p.viewCount as number) ?? 0,
        createdAt: p.createdAt as string,
      }));
      const proposals: DailyPost[] = (pJson.data ?? []).map((p: Record<string, unknown>) => ({
        id: p.id as string, title: (p.title as string | null) ?? null, content: p.content as string,
        authorName: p.authorName as string, city: (p.city as string | null) ?? null,
        dong: (p.dong as string | null) ?? null, postType: (p.postType as string) ?? "제안",
        likeCount: (p.likeCount as number) ?? 0, viewCount: (p.viewCount as number) ?? 0,
        createdAt: p.createdAt as string,
      }));
      const cityMap = new Map<string, { reports: number; proposals: number }>();
      [...reports, ...proposals].forEach((p) => {
        const city = p.city ?? "기타";
        if (!cityMap.has(city)) cityMap.set(city, { reports: 0, proposals: 0 });
        if (p.postType === "민원") cityMap.get(city)!.reports++;
        else cityMap.get(city)!.proposals++;
      });
      const cityBreakdown: DailyCityBreakdown[] = Array.from(cityMap.entries())
        .map(([city, v]) => ({ city, ...v, total: v.reports + v.proposals }))
        .sort((a, b) => b.total - a.total);
      const topLikedPosts = [...reports, ...proposals].sort((a, b) => b.likeCount - a.likeCount).slice(0, 5);
      const fmt = (d: Date) => `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일(${["일","월","화","수","목","금","토"][d.getDay()]})`;
      setDailyData({ date: fmt(targetDay), reports, proposals, totalReports: reports.length, totalProposals: proposals.length, cityBreakdown, topLikedPosts });
    } catch (e) {
      setDailyError(e instanceof Error ? e.message : "오류가 발생했습니다");
    } finally {
      setDailyLoading(false);
    }
  }, [dayOffset]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (mode === "daily") loadDaily();
  }, [loadDaily, mode]);

  const maxCity = data?.cityBreakdown[0]?.total ?? 1;
  const maxDong = data?.dongBreakdown[0]?.count ?? 1;
  const maxIssueWeek = data?.hotIssues[0]?.weekReports ?? data?.hotIssues[0]?.reportCount ?? 1;
  const isCurrentWeek = weekOffset >= 0;

  return (
    <div className="max-w-xl mx-auto pb-12">
      {/* ── Date Navigation ── */}
      {mode === "weekly" ? (
        <div className="flex items-center justify-between px-1 py-3 mb-2">
          <button onClick={() => setWeekOffset((o) => o - 1)} disabled={addDays(targetMonday, -7) < MIN_MONDAY} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold text-orange-600 hover:bg-orange-50 transition-colors disabled:opacity-30 disabled:pointer-events-none">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            이전 주
          </button>
          <div className="text-center">
            <p className="text-sm font-bold text-foreground">{formatWeekLabel(targetMonday)}</p>
            <p className="text-xs text-muted">{formatDateRange(targetMonday, targetSunday)}</p>
          </div>
          <button onClick={() => setWeekOffset((o) => o + 1)} disabled={isCurrentWeek} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold text-orange-600 hover:bg-orange-50 transition-colors disabled:opacity-30 disabled:pointer-events-none">
            다음 주
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between px-1 py-3 mb-2">
          <button onClick={() => setDayOffset((o) => o - 1)} disabled={addDays(targetDay, -1) < MIN_DATE} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold text-orange-600 hover:bg-orange-50 transition-colors disabled:opacity-30 disabled:pointer-events-none">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            이전날
          </button>
          <div className="text-center">
            <p className="text-sm font-bold text-foreground">{dayLabel}</p>
            <p className="text-xs text-muted">{dailyData?.date ?? ""}</p>
          </div>
          <button onClick={() => setDayOffset((o) => o + 1)} disabled={isToday} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold text-orange-600 hover:bg-orange-50 transition-colors disabled:opacity-30 disabled:pointer-events-none">
            다음날
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
      )}

      {/* ── Daily Mode ── */}
      {mode === "daily" && (
        <>
          {dailyLoading && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-8 h-8 border-[3px] border-orange-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-muted text-sm">불러오는 중...</p>
            </div>
          )}
          {!dailyLoading && dailyError && (
            <div className="text-center py-16">
              <p className="text-red-500 text-sm font-medium">{dailyError}</p>
              <button onClick={loadDaily} className="mt-3 text-primary text-sm hover:underline">다시 시도</button>
            </div>
          )}
          {!dailyLoading && !dailyError && dailyData && (
            <div className="space-y-4">
              <CardNewsCarousel data={dailyData} dayOffset={dayOffset} targetDate={targetDay} mode={mode} onModeChange={setMode} />
            </div>
          )}
        </>
      )}

      {/* ── Weekly Mode ── */}
      {mode === "weekly" && (
        <>
      {/* ── Loading / Error ── */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-8 h-8 border-[3px] border-orange-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-muted text-sm">불러오는 중...</p>
        </div>
      )}
      {!loading && error && (
        <div className="text-center py-16">
          <p className="text-red-500 text-sm font-medium">{error}</p>
          <button onClick={load} className="mt-3 text-primary text-sm hover:underline">다시 시도</button>
        </div>
      )}

      {!loading && !error && data && (
        <div className="space-y-4">
          {/* ── Card News Carousel ── */}
          <WeeklyCardNewsCarousel
            data={data}
            weekOffset={weekOffset}
            targetMonday={targetMonday}
            targetSunday={targetSunday}
            mode={mode}
            onModeChange={setMode}
          />

          {/* ── Section 1: Main Stats Cards ── */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Gradient Top Bar */}
            <div className="bg-gradient-to-r from-orange-500 via-red-500 to-rose-500 px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-xs font-medium tracking-wider uppercase">Weekly Report</p>
                  <p className="text-white font-black text-lg leading-tight">{formatWeekLabel(targetMonday)}</p>
                  <p className="text-white/70 text-xs">{formatDateRange(targetMonday, targetSunday)}</p>
                </div>
                <div className="text-right">
                  <p className="text-white/80 text-xs">이번 주 총 활동</p>
                  <p className="text-white font-black text-4xl tabular-nums leading-none">{data.totalPosts}</p>
                  <p className="text-white/70 text-xs">건</p>
                </div>
              </div>
            </div>

            {/* Two big stat boxes */}
            <div className="grid grid-cols-2 divide-x divide-gray-100">
              {/* 불편제보 */}
              <div className="px-5 py-5 text-center">
                <p className="text-2xl mb-0.5">🚨</p>
                <p className="text-xs text-gray-500 font-medium mb-1">신규 불편제보</p>
                <p className="text-5xl font-black tabular-nums text-orange-500 leading-none">
                  {data.newReports}
                </p>
                <p className="text-xs text-gray-400 mt-1">건</p>
                <div className="mt-2 min-h-[18px] flex justify-center">
                  {trendBadge(data.newReports, data.prevWeekReports)}
                </div>
              </div>
              {/* 공약제안 */}
              <div className="px-5 py-5 text-center">
                <p className="text-2xl mb-0.5">💡</p>
                <p className="text-xs text-gray-500 font-medium mb-1">신규 공약제안</p>
                <p className="text-5xl font-black tabular-nums text-blue-500 leading-none">
                  {data.newProposals}
                </p>
                <p className="text-xs text-gray-400 mt-1">건</p>
                <div className="mt-2 min-h-[18px] flex justify-center">
                  {trendBadge(data.newProposals, data.prevWeekProposals)}
                </div>
              </div>
            </div>

            {/* View count */}
            {data.totalViews > 0 && (
              <div className="border-t border-gray-100 px-5 py-3 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-gray-400">
                    <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.5" />
                    <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                  이슈 총 조회수
                </div>
                <p className="font-black text-lg tabular-nums text-gray-700">
                  {data.totalViews.toLocaleString()}<span className="text-xs text-gray-400 font-normal ml-0.5">회</span>
                </p>
              </div>
            )}
          </div>

          {/* ── Section 2: Hot Issues ── */}
          {data.hotIssues.length > 0 && (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 pt-5 pb-3 flex items-center gap-2 border-b border-gray-50">
                <span className="text-xl">🔥</span>
                <div>
                  <p className="font-black text-sm text-gray-800">이번 주 핫한 이슈</p>
                  <p className="text-xs text-gray-400">제보가 집중된 지역 이슈</p>
                </div>
              </div>
              <div className="divide-y divide-gray-50">
                {data.hotIssues.map((issue, idx) => {
                  const catColor = CATEGORY_COLORS[issue.category ?? "기타"] ?? CATEGORY_COLORS["기타"];
                  const location = [issue.city, issue.dong].filter(Boolean).join(" ");
                  const weekCount = issue.weekReports || issue.reportCount;
                  const barPct = maxIssueWeek > 0 ? (weekCount / maxIssueWeek) * 100 : 0;
                  return (
                    <Link
                      key={issue.id}
                      href={`/issues/${issue.id}`}
                      className="flex items-center gap-3 px-5 py-3.5 hover:bg-orange-50/30 transition-colors group"
                    >
                      {/* Rank */}
                      <span className={`shrink-0 w-7 h-7 flex items-center justify-center text-base font-black rounded-full
                        ${idx < 3 ? "text-xl" : "bg-gray-100 text-gray-500 text-sm"}`}>
                        {RANK_EMOJI[idx]}
                      </span>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                          {issue.category && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${catColor}`}>
                              {issue.category}
                            </span>
                          )}
                          <span className="text-sm font-bold text-gray-800 group-hover:text-orange-600 truncate transition-colors">
                            {issue.title}
                          </span>
                        </div>
                        {location && <p className="text-[11px] text-gray-400 mb-1">📍 {location}</p>}
                        {/* Mini bar */}
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-orange-400 to-red-400 rounded-full transition-all duration-700"
                            style={{ width: `${barPct}%` }}
                          />
                        </div>
                      </div>

                      {/* Count */}
                      <div className="shrink-0 text-right">
                        <p className="text-lg font-black tabular-nums text-orange-500">{weekCount}</p>
                        <p className="text-[10px] text-gray-400 leading-none">건 제보</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Section 3: City Breakdown ── */}
          {data.cityBreakdown.length > 0 && (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 pt-5 pb-3 border-b border-gray-50">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xl">🗺️</span>
                  <p className="font-black text-sm text-gray-800">시별 현황</p>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-gray-400">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />불편제보
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />공약제안
                  </span>
                </div>
              </div>
              <div className="px-5 py-4 space-y-3">
                {data.cityBreakdown.map((item) => {
                  const totalPct = maxCity > 0 ? (item.total / maxCity) * 100 : 0;
                  const reportPct = item.total > 0 ? (item.reports / item.total) * 100 : 0;
                  return (
                    <div key={item.city} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-gray-600 w-14 sm:w-16 shrink-0 text-right">
                        {item.city}
                      </span>
                      <div className="flex-1 relative">
                        {/* Background track */}
                        <div className="h-5 bg-gray-100 rounded-full overflow-hidden">
                          {/* Total bar */}
                          <div
                            className="h-full rounded-full overflow-hidden transition-all duration-700"
                            style={{ width: `${totalPct}%`, backgroundColor: "#f3f4f6" }}
                          >
                            {/* Report portion */}
                            <div
                              className="h-full bg-gradient-to-r from-orange-400 to-red-400 float-left transition-all duration-700"
                              style={{ width: `${reportPct}%` }}
                            />
                            {/* Proposal portion */}
                            <div
                              className="h-full bg-gradient-to-r from-blue-400 to-blue-500 float-left transition-all duration-700"
                              style={{ width: `${100 - reportPct}%` }}
                            />
                          </div>
                        </div>
                        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[11px] font-black text-white drop-shadow-sm">
                          {item.total}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Section 4: Dong Breakdown ── */}
          {data.dongBreakdown.length > 0 && (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 pt-5 pb-3 border-b border-gray-50">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📍</span>
                  <div>
                    <p className="font-black text-sm text-gray-800">동별 현황</p>
                    <p className="text-xs text-gray-400">제보/제안이 많은 동네</p>
                  </div>
                </div>
              </div>
              <div className="px-5 py-4 space-y-2.5">
                {data.dongBreakdown.map((item, idx) => {
                  const pct = maxDong > 0 ? (item.count / maxDong) * 100 : 0;
                  const opacity = 1 - idx * 0.09;
                  return (
                    <div key={item.dong} className="flex items-center gap-2.5">
                      <span
                        className="text-xs font-black w-5 text-right shrink-0"
                        style={{ color: `rgba(249,115,22,${opacity})` }}
                      >
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-gray-700 w-16 sm:w-20 shrink-0">
                        {item.dong}
                      </span>
                      <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: `rgba(249,115,22,${opacity})`,
                          }}
                        />
                      </div>
                      <span className="text-xs font-black tabular-nums text-gray-600 w-6 text-right shrink-0">
                        {item.count}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Empty state for dong */}
              {data.dongBreakdown.length === 0 && (
                <div className="px-5 pb-5 text-center text-xs text-gray-400 pt-4">
                  동별 데이터가 아직 없습니다
                </div>
              )}
            </div>
          )}

          {/* ── Empty Week ── */}
          {data.totalPosts === 0 && data.hotIssues.length === 0 && (
            <div className="bg-white rounded-3xl border border-gray-100 py-16 text-center">
              <p className="text-4xl mb-3">📭</p>
              <p className="text-gray-500 text-sm font-medium">이번 주 활동 내역이 없습니다</p>
              <p className="text-gray-400 text-xs mt-1">첫 제보를 올려보세요!</p>
              <Link
                href="/proposals"
                className="inline-block mt-4 px-5 py-2 bg-orange-500 text-white text-sm font-bold rounded-xl hover:bg-orange-600 transition-colors"
              >
                제보하러 가기
              </Link>
            </div>
          )}

          {/* ── Footer links ── */}
          <div className="flex gap-3 pt-1">
            <Link
              href="/proposals"
              className="flex-1 flex items-center justify-center gap-1 py-3 rounded-2xl border border-orange-200 bg-orange-50 text-orange-600 text-sm font-bold hover:bg-orange-100 transition-colors"
            >
              🚨 제보하기
            </Link>
            <Link
              href="/proposals?type=proposal"
              className="flex-1 flex items-center justify-center gap-1 py-3 rounded-2xl border border-blue-200 bg-blue-50 text-blue-600 text-sm font-bold hover:bg-blue-100 transition-colors"
            >
              💡 제안하기
            </Link>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
