"use client";

import { useEffect, useState } from "react";

interface DailyCount {
  date: string;
  count: number;
}

interface TopPage {
  path: string;
  count: number;
}

interface TopReferrer {
  referrer: string;
  count: number;
}

interface CityCount {
  city: string;
  count: number;
}

interface AnalyticsData {
  todayCount: number;
  weekCount: number;
  monthCount: number;
  dailyCounts: DailyCount[];
  topPages: TopPage[];
  topReferrers: TopReferrer[];
  cityDistribution: CityCount[];
  tableExists: boolean;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setData(json.data);
        else setError(json.error ?? "오류가 발생했습니다");
      })
      .catch(() => setError("데이터를 불러올 수 없습니다"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">
        <p className="font-semibold">오류</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const maxDailyCount = Math.max(...(data.dailyCounts.map((d) => d.count)), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">방문자 통계</h1>
        <p className="text-sm text-muted mt-1">최근 30일 페이지 방문 데이터</p>
      </div>

      {!data.tableExists && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-yellow-800 text-sm">
          <p className="font-semibold mb-1">PageView 테이블이 없습니다</p>
          <p>Supabase SQL 에디터에서 <code className="bg-yellow-100 px-1 rounded">/api/track/route.ts</code> 상단의 CREATE TABLE 쿼리를 실행해 주세요.</p>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface border border-border rounded-xl p-6">
          <p className="text-sm text-muted font-medium">오늘 방문</p>
          <p className="text-3xl font-bold text-foreground mt-1">{data.todayCount.toLocaleString()}</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-6">
          <p className="text-sm text-muted font-medium">이번 주 방문</p>
          <p className="text-3xl font-bold text-foreground mt-1">{data.weekCount.toLocaleString()}</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-6">
          <p className="text-sm text-muted font-medium">이번 달 방문</p>
          <p className="text-3xl font-bold text-foreground mt-1">{data.monthCount.toLocaleString()}</p>
        </div>
      </div>

      {/* Daily chart */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <h2 className="text-base font-semibold text-foreground mb-4">일별 방문 수 (최근 30일)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-4 font-medium text-muted w-32">날짜</th>
                <th className="text-left py-2 pr-4 font-medium text-muted w-16">방문수</th>
                <th className="text-left py-2 font-medium text-muted">그래프</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {[...data.dailyCounts].reverse().map((d) => (
                <tr key={d.date}>
                  <td className="py-1.5 pr-4 text-muted font-mono text-xs">{d.date}</td>
                  <td className="py-1.5 pr-4 font-semibold text-foreground">{d.count}</td>
                  <td className="py-1.5">
                    {d.count > 0 && (
                      <div
                        className="h-4 rounded-sm bg-primary/70"
                        style={{ width: `${Math.max(2, (d.count / maxDailyCount) * 200)}px` }}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* City distribution */}
      {data.cityDistribution && data.cityDistribution.length > 0 && (
        <div className="bg-surface border border-border rounded-xl p-6">
          <h2 className="text-base font-semibold text-foreground mb-1">관심 지역 분포</h2>
          <p className="text-xs text-muted mb-4">지도에서 지역을 선택한 방문자 기준 (최근 30일)</p>
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

      {/* Top pages + Top referrers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top pages */}
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

        {/* Top referrers */}
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
    </div>
  );
}
