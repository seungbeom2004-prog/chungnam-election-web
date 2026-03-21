"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface TopIssue {
  id: string;
  title: string;
  summary: string | null;
  category: string | null;
  city: string | null;
  dong: string | null;
  reportCount: number;
  createdAt: string;
}

interface BreakdownItem {
  city?: string;
  category?: string;
  count: number;
}

interface StatsData {
  topIssues: TopIssue[];
  cityBreakdown: BreakdownItem[];
  categoryBreakdown: BreakdownItem[];
  totalIssues: number;
  totalReports: number;
  recentIssues: TopIssue[];
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
  교통: { bg: "bg-blue-100", text: "text-blue-700", bar: "bg-blue-500" },
  안전: { bg: "bg-red-100", text: "text-red-700", bar: "bg-red-500" },
  교육: { bg: "bg-purple-100", text: "text-purple-700", bar: "bg-purple-500" },
  복지: { bg: "bg-green-100", text: "text-green-700", bar: "bg-green-500" },
  경제: { bg: "bg-yellow-100", text: "text-yellow-800", bar: "bg-yellow-500" },
  환경: { bg: "bg-emerald-100", text: "text-emerald-700", bar: "bg-emerald-500" },
  문화: { bg: "bg-pink-100", text: "text-pink-700", bar: "bg-pink-500" },
  기타: { bg: "bg-gray-100", text: "text-gray-600", bar: "bg-gray-400" },
};

function getRankEmoji(rank: number): string {
  if (rank === 1) return "\uD83E\uDD47";
  if (rank === 2) return "\uD83E\uDD48";
  if (rank === 3) return "\uD83E\uDD49";
  return `${rank}`;
}

function getRelativeTime(dateString: string): string {
  const now = Date.now();
  const diff = now - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}일 전`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}개월 전`;
  return `${Math.floor(months / 12)}년 전`;
}

export default function IssueStatsPage() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/issues/stats");
        if (!res.ok) throw new Error("Failed to fetch stats");
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "오류가 발생했습니다");
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted text-sm">데이터를 불러오는 중...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-24">
        <p className="text-red-500 font-medium">{error || "데이터를 불러올 수 없습니다"}</p>
      </div>
    );
  }

  const maxReport = data.topIssues.length > 0 ? data.topIssues[0].reportCount : 1;
  const maxCityCount = data.cityBreakdown.length > 0 ? data.cityBreakdown[0].count : 1;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
          충남 이슈 현황판
        </h1>
        <p className="text-muted text-sm sm:text-base">
          시민 제보 기반 지역 이슈 분석
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-surface border border-border rounded-2xl p-6 text-center">
          <p className="text-muted text-sm mb-1">총 이슈 수</p>
          <p className="text-4xl font-extrabold text-primary">{data.totalIssues.toLocaleString()}</p>
        </div>
        <div className="bg-surface border border-border rounded-2xl p-6 text-center">
          <p className="text-muted text-sm mb-1">총 제보 수</p>
          <p className="text-4xl font-extrabold text-primary">{data.totalReports.toLocaleString()}</p>
        </div>
      </div>

      {/* TOP issues */}
      <section>
        <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
          <span className="text-2xl">🔥</span> 이번 주 TOP 이슈
        </h2>
        <div className="bg-surface border border-border rounded-2xl overflow-hidden divide-y divide-border">
          {data.topIssues.map((issue, idx) => {
            const rank = idx + 1;
            const barWidth = maxReport > 0 ? (issue.reportCount / maxReport) * 100 : 0;
            const catColor = CATEGORY_COLORS[issue.category ?? "기타"] ?? CATEGORY_COLORS["기타"];
            const location = [issue.city, issue.dong].filter(Boolean).join(" ");

            return (
              <Link
                key={issue.id}
                href={`/issues/${issue.id}`}
                className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 hover:bg-background/50 transition-colors group"
              >
                {/* Rank */}
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                    rank <= 3
                      ? "text-xl"
                      : "bg-background text-muted border border-border"
                  }`}
                >
                  {getRankEmoji(rank)}
                </span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">
                      {issue.title}
                    </span>
                    {issue.category && (
                      <span className={`inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full shrink-0 ${catColor.bg} ${catColor.text}`}>
                        {issue.category}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted">
                    {location && <span>📍 {location}</span>}
                    <span>📢 {issue.reportCount}명 제보</span>
                  </div>
                  {/* Bar */}
                  <div className="mt-1.5 h-1.5 bg-background rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${catColor.bar}`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              </Link>
            );
          })}
          {data.topIssues.length === 0 && (
            <div className="px-5 py-8 text-center text-muted text-sm">
              등록된 이슈가 아직 없습니다
            </div>
          )}
        </div>
      </section>

      {/* City breakdown */}
      <section>
        <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
          <span className="text-2xl">🗺️</span> 지역별 이슈 분포
        </h2>
        <div className="bg-surface border border-border rounded-2xl p-5 space-y-3">
          {data.cityBreakdown.map((item) => {
            const barWidth = maxCityCount > 0 ? (item.count / maxCityCount) * 100 : 0;
            return (
              <div key={item.city} className="flex items-center gap-3">
                <span className="text-sm font-medium text-foreground w-16 sm:w-20 shrink-0 text-right">
                  {item.city}
                </span>
                <div className="flex-1 h-6 bg-background rounded-lg overflow-hidden relative">
                  <div
                    className="h-full bg-primary/80 rounded-lg transition-all duration-500"
                    style={{ width: `${barWidth}%` }}
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-foreground">
                    {item.count}
                  </span>
                </div>
              </div>
            );
          })}
          {data.cityBreakdown.length === 0 && (
            <p className="text-muted text-sm text-center py-4">데이터가 없습니다</p>
          )}
        </div>
      </section>

      {/* Category breakdown */}
      <section>
        <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
          <span className="text-2xl">📊</span> 카테고리별 분포
        </h2>
        <div className="bg-surface border border-border rounded-2xl p-5">
          <div className="flex flex-wrap gap-3">
            {data.categoryBreakdown.map((item) => {
              const cat = item.category ?? "기타";
              const color = CATEGORY_COLORS[cat] ?? CATEGORY_COLORS["기타"];
              return (
                <div
                  key={cat}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl ${color.bg} ${color.text} font-semibold text-sm`}
                >
                  <span>{cat}</span>
                  <span className="bg-white/60 rounded-full px-2 py-0.5 text-xs font-bold">
                    {item.count}
                  </span>
                </div>
              );
            })}
          </div>
          {data.categoryBreakdown.length === 0 && (
            <p className="text-muted text-sm text-center py-4">데이터가 없습니다</p>
          )}
        </div>
      </section>

      {/* Recent issues */}
      <section>
        <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
          <span className="text-2xl">🕔</span> 최근 등록 이슈
        </h2>
        <div className="bg-surface border border-border rounded-2xl overflow-hidden divide-y divide-border">
          {data.recentIssues.map((issue) => {
            const catColor = CATEGORY_COLORS[issue.category ?? "기타"] ?? CATEGORY_COLORS["기타"];
            const location = [issue.city, issue.dong].filter(Boolean).join(" ");

            return (
              <Link
                key={issue.id}
                href={`/issues/${issue.id}`}
                className="flex items-center justify-between px-4 sm:px-5 py-3.5 hover:bg-background/50 transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {issue.category && (
                    <span className={`inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full shrink-0 ${catColor.bg} ${catColor.text}`}>
                      {issue.category}
                    </span>
                  )}
                  <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                    {issue.title}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted shrink-0 ml-3">
                  {location && <span className="hidden sm:inline">📍 {location}</span>}
                  <span>{getRelativeTime(issue.createdAt)}</span>
                </div>
              </Link>
            );
          })}
          {data.recentIssues.length === 0 && (
            <div className="px-5 py-8 text-center text-muted text-sm">
              등록된 이슈가 아직 없습니다
            </div>
          )}
        </div>
      </section>

      {/* Footer link */}
      <div className="text-center pt-4">
        <Link
          href="/issues"
          className="inline-flex items-center gap-1 text-primary font-semibold text-sm hover:underline"
        >
          전체 이슈 목록 보기 &rarr;
        </Link>
      </div>
    </div>
  );
}
