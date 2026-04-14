"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";

const WeeklyCardNewsCarousel = dynamic(() => import("@/components/proposals/WeeklyCardNewsCarousel"), { ssr: false });
const CardNewsCarousel = dynamic(() => import("@/components/proposals/CardNewsCarousel"), { ssr: false });

// ─── Cumulative Stats Types ───────────────────────────────────────────────────
interface CumulativeStats {
  totalReports: number;
  totalProposals: number;
  totalPosts: number;
  totalIssues: number;
  resolvedIssues: number;
  issuesByStatus: {
    reviewing: number;
    planned: number;
    complaint_resolved: number;
    adopted: number;
  };
  cityBreakdown: { city: string; reports: number; proposals: number; total: number }[];
}

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


// ─── Component ────────────────────────────────────────────────────────────────
export default function WeeklyStatsPage() {
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week
  const [data, setData] = useState<WeeklyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"weekly" | "daily" | "total">("weekly");
  const [dayOffset, setDayOffset] = useState(0);
  const [dailyData, setDailyData] = useState<DailyStats | null>(null);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyError, setDailyError] = useState<string | null>(null);
  const [cumulative, setCumulative] = useState<CumulativeStats | null>(null);
  const [showCumulative, setShowCumulative] = useState(false);

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

  // Load cumulative stats on demand (mode=total or collapsible panel expanded)
  useEffect(() => {
    if ((!showCumulative && mode !== "total") || cumulative) return;
    fetch("/api/cumulative-stats")
      .then(r => r.json())
      .then(j => setCumulative(j))
      .catch(() => {});
  }, [showCumulative, mode, cumulative]);

  const isCurrentWeek = weekOffset >= 0;

  return (
    <div className="max-w-xl mx-auto pb-12">
      {/* ── Mode Tab Bar ── */}
      <div className="flex rounded-xl overflow-hidden border border-border text-xs font-bold mb-1">
        {(["weekly", "daily", "total"] as const).map(m => (
          <button key={m} onClick={() => setMode(m)}
            className={`flex-1 py-2.5 transition-colors ${mode === m ? "bg-orange-500 text-white" : "bg-surface text-muted hover:bg-background"}`}>
            {m === "weekly" ? "📅 주간" : m === "daily" ? "📆 일간" : "📊 전체"}
          </button>
        ))}
      </div>

      {/* ── Date Navigation (weekly/daily only) ── */}
      {mode === "total" ? (
        <div className="flex items-center justify-center py-3 mb-2">
          <p className="text-xs text-muted">서비스 시작(2026년 3월) 이후 전체 누적 현황</p>
        </div>
      ) : mode === "weekly" ? (
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

          {/* ── Cumulative Stats Toggle ── */}
          <div className="rounded-2xl border border-border overflow-hidden">
            <button
              onClick={() => setShowCumulative(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-50 to-gray-50 hover:from-slate-100 hover:to-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">📊</span>
                <span className="text-sm font-bold text-foreground">누적 현황</span>
                <span className="text-xs text-muted font-normal">서비스 시작 이후 전체</span>
              </div>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
                className={`text-muted transition-transform duration-200 ${showCumulative ? "rotate-180" : ""}`}>
                <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {showCumulative && (
              <div className="border-t border-border p-4">
                {!cumulative ? (
                  <div className="flex justify-center py-6">
                    <div className="w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Big numbers */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-orange-50 border border-orange-100 p-3 text-center">
                        <p className="text-2xl font-black text-orange-600">{cumulative.totalReports.toLocaleString()}</p>
                        <p className="text-xs font-semibold text-orange-500 mt-0.5">🚨 누적 불편제보</p>
                      </div>
                      <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 text-center">
                        <p className="text-2xl font-black text-blue-600">{cumulative.totalProposals.toLocaleString()}</p>
                        <p className="text-xs font-semibold text-blue-500 mt-0.5">💡 누적 공약제안</p>
                      </div>
                    </div>

                    {/* Issue resolution stats */}
                    <div className="rounded-xl bg-surface border border-border p-3">
                      <p className="text-xs font-bold text-foreground mb-2">이슈 처리 현황</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-muted">🔍 검토중</span>
                          <span className="font-bold text-foreground">{cumulative.issuesByStatus.reviewing}건</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted">📋 공약 제안</span>
                          <span className="font-bold text-blue-600">{cumulative.issuesByStatus.planned}건</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted">🏛️ 민원 해결</span>
                          <span className="font-bold text-purple-600">{cumulative.issuesByStatus.complaint_resolved}건</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted">✅ 공약 반영</span>
                          <span className="font-bold text-green-600">{cumulative.issuesByStatus.adopted}건</span>
                        </div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-border flex items-center justify-between text-xs">
                        <span className="text-muted">해결된 이슈</span>
                        <span className="font-black text-green-600">{cumulative.resolvedIssues}건 / {cumulative.totalIssues}건</span>
                      </div>
                    </div>

                    {/* City breakdown */}
                    {cumulative.cityBreakdown.length > 0 && (
                      <div className="rounded-xl bg-surface border border-border p-3">
                        <p className="text-xs font-bold text-foreground mb-2">지역별 누적 현황</p>
                        <div className="space-y-1.5">
                          {cumulative.cityBreakdown.slice(0, 8).map(c => {
                            const maxTotal = cumulative.cityBreakdown[0]?.total || 1;
                            const pct = Math.round((c.total / maxTotal) * 100);
                            return (
                              <div key={c.city}>
                                <div className="flex items-center justify-between text-xs mb-0.5">
                                  <span className="font-medium text-foreground">{c.city}</span>
                                  <span className="text-muted">{c.total.toLocaleString()}건</span>
                                </div>
                                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-gradient-to-r from-orange-400 to-amber-400 rounded-full"
                                    style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Footer links ── */}
          <div className="flex gap-3 pt-1">
            <Link
              href="/reports"
              className="flex-1 flex items-center justify-center gap-1 py-3 rounded-2xl border border-orange-200 bg-orange-50 text-orange-600 text-sm font-bold hover:bg-orange-100 transition-colors"
            >
              🚨 불편제보 보기
            </Link>
            <Link
              href="/suggestions"
              className="flex-1 flex items-center justify-center gap-1 py-3 rounded-2xl border border-blue-200 bg-blue-50 text-blue-600 text-sm font-bold hover:bg-blue-100 transition-colors"
            >
              💡 공약제안 보기
            </Link>
          </div>
        </div>
      )}
        </>
      )}

      {/* ── Total Mode ── */}
      {mode === "total" && (
        <div className="space-y-4">
          {!cumulative ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-8 h-8 border-[3px] border-orange-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-muted text-sm">불러오는 중...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Big numbers */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-orange-50 border border-orange-100 p-4 text-center">
                  <p className="text-3xl font-black text-orange-600">{cumulative.totalReports.toLocaleString()}</p>
                  <p className="text-xs font-semibold text-orange-500 mt-1">🚨 누적 불편제보</p>
                </div>
                <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-center">
                  <p className="text-3xl font-black text-blue-600">{cumulative.totalProposals.toLocaleString()}</p>
                  <p className="text-xs font-semibold text-blue-500 mt-1">💡 누적 공약제안</p>
                </div>
              </div>

              {/* Issue resolution stats */}
              <div className="rounded-xl bg-surface border border-border p-4">
                <p className="text-sm font-bold text-foreground mb-3">이슈 처리 현황</p>
                <div className="grid grid-cols-2 gap-2.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted">🔍 검토중</span>
                    <span className="font-bold text-foreground">{cumulative.issuesByStatus.reviewing}건</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted">📋 공약 제안</span>
                    <span className="font-bold text-blue-600">{cumulative.issuesByStatus.planned}건</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted">🏛️ 민원 해결</span>
                    <span className="font-bold text-purple-600">{cumulative.issuesByStatus.complaint_resolved}건</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted">✅ 공약 반영</span>
                    <span className="font-bold text-green-600">{cumulative.issuesByStatus.adopted}건</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-sm">
                  <span className="text-muted">해결된 이슈</span>
                  <span className="font-black text-green-600">{cumulative.resolvedIssues}건 / {cumulative.totalIssues}건</span>
                </div>
              </div>

              {/* City breakdown */}
              {cumulative.cityBreakdown.length > 0 && (
                <div className="rounded-xl bg-surface border border-border p-4">
                  <p className="text-sm font-bold text-foreground mb-3">지역별 누적 현황</p>
                  <div className="space-y-2">
                    {cumulative.cityBreakdown.slice(0, 8).map(c => {
                      const maxTotal = cumulative.cityBreakdown[0]?.total || 1;
                      const pct = Math.round((c.total / maxTotal) * 100);
                      return (
                        <div key={c.city}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="font-medium text-foreground">{c.city}</span>
                            <span className="text-muted">{c.total.toLocaleString()}건</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-orange-400 to-amber-400 rounded-full"
                              style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Footer links */}
              <div className="flex gap-3 pt-1">
                <Link
                  href="/reports"
                  className="flex-1 flex items-center justify-center gap-1 py-3 rounded-2xl border border-orange-200 bg-orange-50 text-orange-600 text-sm font-bold hover:bg-orange-100 transition-colors"
                >
                  🚨 불편제보 보기
                </Link>
                <Link
                  href="/suggestions"
                  className="flex-1 flex items-center justify-center gap-1 py-3 rounded-2xl border border-blue-200 bg-blue-50 text-blue-600 text-sm font-bold hover:bg-blue-100 transition-colors"
                >
                  💡 공약제안 보기
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
