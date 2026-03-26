"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";

const CardNewsCarousel = dynamic(() => import("@/components/proposals/CardNewsCarousel"), { ssr: false });

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

interface CityBreakdown {
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
  cityBreakdown: CityBreakdown[];
  topLikedPosts: DailyPost[];
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일(${["일","월","화","수","목","금","토"][d.getDay()]})`;
}

function getDateMidnight(offset: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function DailyStatsPage() {
  const [dayOffset, setDayOffset] = useState(0);
  const [data, setData] = useState<DailyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const targetDay = getDateMidnight(dayOffset);
  const nextDay = getDateMidnight(dayOffset + 1);
  const isToday = dayOffset >= 0;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
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
        id: p.id as string,
        title: (p.title as string | null) ?? null,
        content: p.content as string,
        authorName: p.authorName as string,
        city: (p.city as string | null) ?? null,
        dong: (p.dong as string | null) ?? null,
        postType: (p.postType as string) ?? "민원",
        likeCount: (p.likeCount as number) ?? 0,
        viewCount: (p.viewCount as number) ?? 0,
        createdAt: p.createdAt as string,
      }));
      const proposals: DailyPost[] = (pJson.data ?? []).map((p: Record<string, unknown>) => ({
        id: p.id as string,
        title: (p.title as string | null) ?? null,
        content: p.content as string,
        authorName: p.authorName as string,
        city: (p.city as string | null) ?? null,
        dong: (p.dong as string | null) ?? null,
        postType: (p.postType as string) ?? "제안",
        likeCount: (p.likeCount as number) ?? 0,
        viewCount: (p.viewCount as number) ?? 0,
        createdAt: p.createdAt as string,
      }));

      // City breakdown
      const cityMap = new Map<string, { reports: number; proposals: number }>();
      [...reports, ...proposals].forEach((p) => {
        const city = p.city ?? "기타";
        if (!cityMap.has(city)) cityMap.set(city, { reports: 0, proposals: 0 });
        if (p.postType === "민원") cityMap.get(city)!.reports++;
        else cityMap.get(city)!.proposals++;
      });
      const cityBreakdown: CityBreakdown[] = Array.from(cityMap.entries())
        .map(([city, v]) => ({ city, ...v, total: v.reports + v.proposals }))
        .sort((a, b) => b.total - a.total);

      // Top liked (combined, top 5)
      const allPosts = [...reports, ...proposals];
      const topLikedPosts = [...allPosts].sort((a, b) => b.likeCount - a.likeCount).slice(0, 5);

      setData({
        date: formatDate(targetDay),
        reports,
        proposals,
        totalReports: reports.length,
        totalProposals: proposals.length,
        cityBreakdown,
        topLikedPosts,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  }, [dayOffset]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const maxCity = data?.cityBreakdown[0]?.total ?? 1;

  return (
    <div>
      {/* Day Navigation */}
      <div className="flex items-center justify-between px-1 py-3 mb-2">
        <button
          onClick={() => setDayOffset((o) => o - 1)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold text-primary hover:bg-primary/10 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          이전날
        </button>
        <div className="text-center">
          <p className="text-sm font-bold text-foreground">
            {dayOffset === 0 ? "오늘" : dayOffset === -1 ? "어제" : data?.date ?? ""}
          </p>
          {(dayOffset === 0 || dayOffset === -1) && (
            <p className="text-xs text-muted">{data?.date ?? ""}</p>
          )}
        </div>
        <button
          onClick={() => setDayOffset((o) => o + 1)}
          disabled={isToday}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold text-primary hover:bg-primary/10 transition-colors disabled:opacity-30 disabled:pointer-events-none"
        >
          다음날
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Back link */}
      <div className="mb-4">
        <Link href="/proposals" className="text-xs text-muted hover:text-foreground">← 이슈/제보 게시판</Link>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-8 h-8 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
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
          {/* Card News Carousel */}
          <CardNewsCarousel data={data} dayOffset={dayOffset} targetDate={targetDay} />

          {/* Main stats card */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-red-500 via-orange-500 to-amber-500 px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-xs font-medium tracking-wider uppercase">Daily Report</p>
                  <p className="text-white font-black text-lg leading-tight">
                    {dayOffset === 0 ? "오늘" : dayOffset === -1 ? "어제" : data.date}
                  </p>
                  <p className="text-white/70 text-xs">{data.date}</p>
                </div>
                <div className="text-right">
                  <p className="text-white/80 text-xs">총 활동</p>
                  <p className="text-white font-black text-4xl tabular-nums leading-none">
                    {data.totalReports + data.totalProposals}
                  </p>
                  <p className="text-white/70 text-xs">건</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 divide-x divide-gray-100">
              <div className="px-5 py-5 text-center">
                <p className="text-2xl mb-0.5">📢</p>
                <p className="text-xs text-gray-500 font-medium mb-1">불편 제보</p>
                <p className="text-5xl font-black tabular-nums text-red-500 leading-none">
                  {data.totalReports}
                </p>
                <p className="text-xs text-gray-400 mt-1">건</p>
              </div>
              <div className="px-5 py-5 text-center">
                <p className="text-2xl mb-0.5">💡</p>
                <p className="text-xs text-gray-500 font-medium mb-1">공약 제안</p>
                <p className="text-5xl font-black tabular-nums text-amber-500 leading-none">
                  {data.totalProposals}
                </p>
                <p className="text-xs text-gray-400 mt-1">건</p>
              </div>
            </div>
          </div>

          {/* Top liked posts */}
          {data.topLikedPosts.filter(p => p.likeCount > 0).length > 0 && (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 pt-5 pb-3 flex items-center gap-2 border-b border-gray-50">
                <span className="text-xl">❤️</span>
                <div>
                  <p className="font-black text-sm text-gray-800">오늘의 인기 게시글</p>
                  <p className="text-xs text-gray-400">좋아요를 많이 받은 글</p>
                </div>
              </div>
              <div className="divide-y divide-gray-50">
                {data.topLikedPosts.filter(p => p.likeCount > 0).map((post, idx) => (
                  <Link
                    key={post.id}
                    href={`/proposals/${post.id}`}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-red-50/30 transition-colors group"
                  >
                    <span className="shrink-0 w-7 h-7 flex items-center justify-center text-base font-black">
                      {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : (
                        <span className="bg-gray-100 text-gray-500 text-sm rounded-full w-7 h-7 flex items-center justify-center">{idx + 1}</span>
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${post.postType === "민원" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                          {post.postType === "민원" ? "📢 제보" : "💡 제안"}
                        </span>
                        <span className="text-sm font-bold text-gray-800 group-hover:text-red-600 truncate transition-colors">
                          {post.title ?? post.content}
                        </span>
                      </div>
                      {(post.city || post.dong) && (
                        <p className="text-[11px] text-gray-400">📍 {[post.city, post.dong].filter(Boolean).join(" ")}</p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-base font-black tabular-nums text-red-500">❤️ {post.likeCount}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* City breakdown */}
          {data.cityBreakdown.length > 0 && (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 pt-5 pb-3 border-b border-gray-50">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xl">🗺️</span>
                  <p className="font-black text-sm text-gray-800">시별 현황</p>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-gray-400">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />불편제보
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />공약제안
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
                        <div className="h-5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full overflow-hidden transition-all duration-700"
                            style={{ width: `${totalPct}%`, backgroundColor: "#f3f4f6" }}
                          >
                            <div
                              className="h-full bg-gradient-to-r from-red-400 to-red-500 float-left transition-all duration-700"
                              style={{ width: `${reportPct}%` }}
                            />
                            <div
                              className="h-full bg-gradient-to-r from-amber-400 to-amber-500 float-left transition-all duration-700"
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

          {/* Recent posts list */}
          {data.reports.length > 0 && (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 pt-5 pb-3 flex items-center gap-2 border-b border-gray-50">
                <span className="text-xl">📢</span>
                <div>
                  <p className="font-black text-sm text-gray-800">오늘의 불편 제보 ({data.totalReports})</p>
                </div>
              </div>
              <div className="divide-y divide-gray-50">
                {data.reports.slice(0, 10).map((post) => (
                  <Link
                    key={post.id}
                    href={`/proposals/${post.id}`}
                    className="flex items-start gap-3 px-5 py-3 hover:bg-red-50/30 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 group-hover:text-red-600 truncate transition-colors">
                        {post.title ?? post.content}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {post.authorName}
                        {(post.city || post.dong) && ` · ${[post.city, post.dong].filter(Boolean).join(" ")}`}
                      </p>
                    </div>
                    {post.likeCount > 0 && (
                      <span className="text-xs text-red-500 font-semibold shrink-0">❤️ {post.likeCount}</span>
                    )}
                  </Link>
                ))}
                {data.totalReports > 10 && (
                  <div className="px-5 py-3 text-center">
                    <Link href="/proposals" className="text-xs text-primary hover:underline">
                      전체 {data.totalReports}건 보기 →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {data.proposals.length > 0 && (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 pt-5 pb-3 flex items-center gap-2 border-b border-gray-50">
                <span className="text-xl">💡</span>
                <div>
                  <p className="font-black text-sm text-gray-800">오늘의 공약 제안 ({data.totalProposals})</p>
                </div>
              </div>
              <div className="divide-y divide-gray-50">
                {data.proposals.slice(0, 10).map((post) => (
                  <Link
                    key={post.id}
                    href={`/proposals/${post.id}`}
                    className="flex items-start gap-3 px-5 py-3 hover:bg-amber-50/30 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 group-hover:text-amber-600 truncate transition-colors">
                        {post.title ?? post.content}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {post.authorName}
                        {(post.city || post.dong) && ` · ${[post.city, post.dong].filter(Boolean).join(" ")}`}
                      </p>
                    </div>
                    {post.likeCount > 0 && (
                      <span className="text-xs text-amber-500 font-semibold shrink-0">❤️ {post.likeCount}</span>
                    )}
                  </Link>
                ))}
                {data.totalProposals > 10 && (
                  <div className="px-5 py-3 text-center">
                    <Link href="/proposals" className="text-xs text-primary hover:underline">
                      전체 {data.totalProposals}건 보기 →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Empty state */}
          {data.totalReports === 0 && data.totalProposals === 0 && (
            <div className="bg-white rounded-3xl border border-gray-100 py-16 text-center">
              <p className="text-4xl mb-3">📭</p>
              <p className="text-gray-500 text-sm font-medium">
                {dayOffset === 0 ? "오늘" : "이날"} 아직 활동 내역이 없습니다
              </p>
              {dayOffset === 0 && (
                <p className="text-gray-400 text-xs mt-1">첫 제보를 올려보세요!</p>
              )}
              <Link
                href="/proposals"
                className="inline-block mt-4 px-5 py-2 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 transition-colors"
              >
                제보하러 가기
              </Link>
            </div>
          )}

          {/* Footer links */}
          <div className="flex gap-3 pt-1">
            <Link
              href="/proposals"
              className="flex-1 flex items-center justify-center gap-1 py-3 rounded-2xl border border-red-200 bg-red-50 text-red-600 text-sm font-bold hover:bg-red-100 transition-colors"
            >
              📢 제보하기
            </Link>
            <Link
              href="/issues/stats"
              className="flex-1 flex items-center justify-center gap-1 py-3 rounded-2xl border border-orange-200 bg-orange-50 text-orange-600 text-sm font-bold hover:bg-orange-100 transition-colors"
            >
              📈 주간 현황판
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
