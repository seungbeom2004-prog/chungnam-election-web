"use client";

import { useEffect, useState, useCallback } from "react";

type TimeRange = "1h" | "24h" | "7d" | "30d" | "all";

interface DailyCount { date: string; count: number; }
interface HourlyBucket { hour: string; count: number; }
interface TopPage { path: string; count: number; }
interface TopReferrer { referrer: string; count: number; }
interface CityCount { city: string; count: number; }

interface AnalyticsData {
  range: TimeRange;
  hourCount: number;
  dayCount: number;
  weekCount: number;
  monthCount: number;
  allCount: number;
  periodCount: number;
  dailyCounts: DailyCount[];
  hourlyBuckets: HourlyBucket[];
  topPages: TopPage[];
  topReferrers: TopReferrer[];
  cityDistribution: CityCount[];
  tableExists: boolean;
}

const RANGE_OPTIONS: { value: TimeRange; label: string; shortLabel: string }[] = [
  { value: "1h",  label: "최근 1시간",  shortLabel: "1시간"  },
  { value: "24h", label: "최근 24시간", shortLabel: "24시간" },
  { value: "7d",  label: "최근 7일",    shortLabel: "7일"    },
  { value: "30d", label: "최근 30일",   shortLabel: "30일"   },
  { value: "all", label: "전체",        shortLabel: "전체"   },
];

function StatCard({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`border rounded-xl p-5 flex flex-col gap-1 ${highlight ? "bg-primary/5 border-primary/30" : "bg-surface border-border"}`}>
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className={`text-3xl font-bold ${highlight ? "text-primary" : "text-foreground"}`}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}

export default function AnalyticsPage() {
  const [range, setRange] = useState<TimeRange>("30d");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (r: TimeRange) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/analytics?range=${r}`);
      const json = await res.json();
      if (json.success) setData(json.data);
      else setError(json.error ?? "오류가 발생했습니다");
    } catch {
      setError("데이터를 불러올 수 없습니다");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(range); }, [range, fetchData]);

  const handleRangeChange = (r: TimeRange) => { setRange(r); };

  const isShortRange = range === "1h" || range === "24h";
  const chartData = isShortRange ? (data?.hourlyBuckets ?? []) : (data?.dailyCounts ?? []);
  const maxChartValue = Math.max(...chartData.map((d) => ("count" in d ? d.count : 0)), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">방문자 통계</h1>
          <p className="text-sm text-muted mt-0.5">페이지 조회수 데이터</p>
        </div>
        <button
          onClick={() => fetchData(range)}
          className="text-xs text-muted hover:text-foreground px-3 py-1.5 border border-border rounded-lg transition-colors"
        >
          새로고침
        </button>
      </div>

      {/* Time range tabs */}
      <div className="flex items-center gap-1 flex-wrap bg-surface border border-border rounded-xl p-1 w-fit">
        {RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleRangeChange(opt.value)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              range === opt.value
                ? "bg-primary text-white shadow-sm"
                : "text-muted hover:text-foreground hover:bg-background/70"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {!data?.tableExists && data && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-yellow-800 text-sm">
          <p className="font-semibold mb-1">PageView 테이블이 없습니다</p>
          <p>Supabase SQL 에디터에서 PageView 테이블 생성 쿼리를 실행해 주세요.</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">
          <p className="font-semibold">오류</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      ) : data ? (
        <>
          {/* Summary cards — always show all 5 brackets */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <StatCard label="최근 1시간" value={data.hourCount} highlight={range === "1h"} />
            <StatCard label="최근 24시간" value={data.dayCount} highlight={range === "24h"} />
            <StatCard label="최근 7일" value={data.weekCount} highlight={range === "7d"} />
            <StatCard label="최근 30일" value={data.monthCount} highlight={range === "30d"} />
            <StatCard label="전체 (조회 기간)" value={data.allCount} highlight={range === "all"} />
          </div>

          {/* Chart */}
          <div className="bg-surface border border-border rounded-xl p-6">
            <h2 className="text-base font-semibold text-foreground mb-4">
              {isShortRange ? `시간대별 방문수 (${RANGE_OPTIONS.find(o => o.value === range)?.label})` : `일별 방문수 (${RANGE_OPTIONS.find(o => o.value === range)?.label})`}
            </h2>
            {chartData.length === 0 ? (
              <p className="text-sm text-muted">데이터가 없습니다</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 pr-4 font-medium text-muted w-32">
                        {isShortRange ? "시간" : "날짜"}
                      </th>
                      <th className="text-left py-2 pr-4 font-medium text-muted w-16">방문수</th>
                      <th className="text-left py-2 font-medium text-muted">그래프</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {[...chartData].reverse().map((d, i) => {
                      const label = "hour" in d ? d.hour : d.date;
                      const count = d.count;
                      return (
                        <tr key={i}>
                          <td className="py-1.5 pr-4 text-muted font-mono text-xs">{label}</td>
                          <td className="py-1.5 pr-4 font-semibold text-foreground">{count}</td>
                          <td className="py-1.5">
                            {count > 0 && (
                              <div
                                className="h-4 rounded-sm bg-primary/70"
                                style={{ width: `${Math.max(2, (count / maxChartValue) * 240)}px` }}
                              />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* City distribution */}
          {data.cityDistribution.length > 0 && (
            <div className="bg-surface border border-border rounded-xl p-6">
              <h2 className="text-base font-semibold text-foreground mb-1">관심 지역 분포</h2>
              <p className="text-xs text-muted mb-4">지도에서 지역을 선택한 방문자 기준</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {data.cityDistribution.map((c, i) => {
                  const max = data.cityDistribution[0]?.count ?? 1;
                  const pct = Math.round((c.count / max) * 100);
                  return (
                    <div key={c.city} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-foreground">{i + 1}. {c.city}</span>
                        <span className="text-primary font-semibold">{c.count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-border overflow-hidden">
                        <div className="h-full rounded-full bg-primary/70" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Top pages + referrers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-surface border border-border rounded-xl p-6">
              <h2 className="text-base font-semibold text-foreground mb-4">인기 페이지 (Top 10)</h2>
              {data.topPages.length === 0 ? (
                <p className="text-sm text-muted">데이터 없음</p>
              ) : (
                <div className="space-y-2">
                  {data.topPages.map((p, i) => (
                    <div key={p.path} className="flex items-center gap-3">
                      <span className="w-5 text-xs text-muted font-bold shrink-0">{i + 1}</span>
                      <span className="flex-1 text-sm text-foreground truncate font-mono">{p.path}</span>
                      <span className="shrink-0 text-sm font-semibold text-primary">{p.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-surface border border-border rounded-xl p-6">
              <h2 className="text-base font-semibold text-foreground mb-4">유입 경로 (Top 10)</h2>
              {data.topReferrers.length === 0 ? (
                <p className="text-sm text-muted">직접 방문 또는 데이터 없음</p>
              ) : (
                <div className="space-y-2">
                  {data.topReferrers.map((r, i) => (
                    <div key={r.referrer} className="flex items-center gap-3">
                      <span className="w-5 text-xs text-muted font-bold shrink-0">{i + 1}</span>
                      <span className="flex-1 text-sm text-foreground truncate">{r.referrer}</span>
                      <span className="shrink-0 text-sm font-semibold text-primary">{r.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
