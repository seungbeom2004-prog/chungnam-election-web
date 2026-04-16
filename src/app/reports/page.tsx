"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const PostListMap = dynamic(() => import("@/components/proposals/PostListMap"), { ssr: false });

const PAGE_SIZE = 30;

const CITIES = [
  "전체", "천안시", "공주시", "보령시", "아산시", "서산시", "논산시",
  "계룡시", "당진시", "금산군", "부여군", "서천군", "청양군", "홍성군", "예산군", "태안군",
];

const CATEGORIES = ["전체", "교통", "안전", "교육", "복지", "경제", "환경", "문화", "기타"];

interface Post {
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
  latitude?: number | null;
  longitude?: number | null;
  responses?: { candidateId: string; candidateName: string | null }[];
}

function formatRelative(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}일 전`;
  const dt = new Date(dateString);
  return `${dt.getMonth() + 1}.${dt.getDate()}`;
}

function getTitle(post: Post): string {
  if (post.title) return post.title;
  return post.content.length > 40 ? post.content.slice(0, 40) + "…" : post.content;
}

function BoardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const city = searchParams.get("city") ?? "";
  const sort = (searchParams.get("sort") ?? "latest") as "latest" | "popular";
  const search = searchParams.get("search") ?? "";

  const [posts, setPosts] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const [mapPosts, setMapPosts] = useState<Post[]>([]);
  const [searchInput, setSearchInput] = useState(search);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const pushParams = useCallback((updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v) params.set(k, v);
      else params.delete(k);
    });
    router.push(`/reports?${params.toString()}`);
  }, [router, searchParams]);

  // Fetch posts
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      postType: "민원",
      limit: String(PAGE_SIZE),
      offset: String((page - 1) * PAGE_SIZE),
      sort,
    });
    if (city) params.set("city", city);
    if (search) params.set("search", search);

    fetch(`/api/proposals?${params}`)
      .then(r => r.json())
      .then(j => {
        setPosts(j.data ?? []);
        setTotal(j.total ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, city, sort, search]);

  // Fetch map posts (location-tagged only)
  useEffect(() => {
    if (!showMap) return;
    const params = new URLSearchParams({ postType: "민원", hasLocation: "true", limit: "500" });
    if (city) params.set("city", city);
    fetch(`/api/proposals?${params}`)
      .then(r => r.json())
      .then(j => setMapPosts(j.data ?? []))
      .catch(() => {});
  }, [showMap, city]);

  const handleSearch = (val: string) => {
    setSearchInput(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      pushParams({ search: val, page: "1" });
    }, 500);
  };

  return (
    <div className="max-w-3xl mx-auto px-2 pb-12">
      {/* Header */}
      <div className="flex items-center gap-2 py-4 border-b border-border mb-0">
        <Link href="/proposals" className="text-muted hover:text-primary transition-colors">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 4L6 9l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <h1 className="text-lg font-black text-foreground">🚨 불편제보 게시판</h1>
        <span className="ml-auto text-xs text-muted">총 {total.toLocaleString()}건</span>
      </div>

      {/* Collapsible map */}
      <div className="border-b border-border">
        <button
          onClick={() => setShowMap(v => !v)}
          className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-background transition-colors text-sm"
        >
          <span className="flex items-center gap-1.5 font-semibold text-foreground">
            <span>📍</span> 지도로 보기
            {mapPosts.length > 0 && <span className="text-xs text-muted font-normal">({mapPosts.filter(p => p.latitude != null && p.longitude != null).length}건 위치 확인됨)</span>}
          </span>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
            className={`text-muted transition-transform duration-200 ${showMap ? "rotate-180" : ""}`}>
            <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {showMap && (
          <div className="border-t border-border">
            <Suspense fallback={<div className="h-56 flex items-center justify-center text-xs text-muted">지도 로딩중...</div>}>
              <PostListMap posts={mapPosts} />
            </Suspense>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="py-2 border-b border-border space-y-2">
        {/* City filter */}
        <div className="flex gap-1 flex-wrap">
          {CITIES.map(c => (
            <button key={c}
              onClick={() => pushParams({ city: c === "전체" ? "" : c, page: "1" })}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                (c === "전체" && !city) || c === city
                  ? "bg-orange-500 text-white"
                  : "bg-background border border-border text-muted hover:border-orange-300 hover:text-orange-600"
              }`}
            >{c}</button>
          ))}
        </div>

        {/* Search + sort */}
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchInput}
              onChange={e => handleSearch(e.target.value)}
              placeholder="제목 또는 내용 검색"
              className="w-full text-xs rounded-lg border border-border bg-background px-3 py-1.5 pr-7 focus:outline-none focus:border-orange-400"
            />
            {searchInput && (
              <button onClick={() => handleSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-foreground">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
          <div className="flex rounded-lg border border-border overflow-hidden text-xs">
            {(["latest", "popular"] as const).map(s => (
              <button key={s}
                onClick={() => pushParams({ sort: s, page: "1" })}
                className={`px-2.5 py-1.5 font-semibold transition-colors ${
                  sort === s ? "bg-orange-500 text-white" : "bg-background text-muted hover:bg-orange-50"
                }`}
              >{s === "latest" ? "최신" : "인기"}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="border-b border-border">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 text-sm text-muted">게시물이 없습니다.</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-border text-muted">
                <th className="py-2 px-2 text-center font-semibold w-10 hidden sm:table-cell">번호</th>
                <th className="py-2 px-2 text-left font-semibold">제목</th>
                <th className="py-2 px-2 text-center font-semibold w-16 hidden sm:table-cell">지역</th>
                <th className="py-2 px-2 text-center font-semibold w-16">작성자</th>
                <th className="py-2 px-2 text-center font-semibold w-14">날짜</th>
                <th className="py-2 px-2 text-center font-semibold w-10">👍</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post, idx) => {
                const num = total - ((page - 1) * PAGE_SIZE) - idx;
                return (
                  <tr key={post.id} className="border-b border-border hover:bg-orange-50/40 transition-colors group">
                    <td className="py-1.5 px-2 text-center text-muted hidden sm:table-cell">{num}</td>
                    <td className="py-1.5 px-2">
                      <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                        <Link href={`/proposals/${post.id}`}
                          className="font-medium text-foreground group-hover:text-orange-600 transition-colors line-clamp-1">
                          {getTitle(post)}
                        </Link>
                        {post.responses && post.responses.length > 0 && (
                          <span className="shrink-0 text-[10px] text-green-600 font-semibold whitespace-nowrap">✅ 후보자 답변완료</span>
                        )}
                      </div>
                      {post.dong && <span className="text-muted text-[10px]">📍 {post.dong}</span>}
                    </td>
                    <td className="py-1.5 px-2 text-center text-muted hidden sm:table-cell">
                      {post.city ? post.city.replace("시", "").replace("군", "") : "-"}
                    </td>
                    <td className="py-1.5 px-2 text-center text-muted truncate max-w-[64px]">{post.authorName}</td>
                    <td className="py-1.5 px-2 text-center text-muted">{formatRelative(post.createdAt)}</td>
                    <td className="py-1.5 px-2 text-center text-muted">{post.likeCount > 0 ? post.likeCount : ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 py-4 flex-wrap">
          <button
            onClick={() => pushParams({ page: String(Math.max(1, page - 1)) })}
            disabled={page === 1}
            className="px-2.5 py-1.5 text-xs rounded border border-border text-muted hover:border-orange-400 hover:text-orange-600 disabled:opacity-30 disabled:pointer-events-none"
          >‹ 이전</button>
          {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
            const start = Math.max(1, Math.min(page - 4, totalPages - 9));
            const p = start + i;
            return (
              <button key={p}
                onClick={() => pushParams({ page: String(p) })}
                className={`w-8 h-8 text-xs rounded border font-semibold transition-colors ${
                  p === page
                    ? "border-orange-500 bg-orange-500 text-white"
                    : "border-border text-muted hover:border-orange-400 hover:text-orange-600"
                }`}
              >{p}</button>
            );
          })}
          <button
            onClick={() => pushParams({ page: String(Math.min(totalPages, page + 1)) })}
            disabled={page === totalPages}
            className="px-2.5 py-1.5 text-xs rounded border border-border text-muted hover:border-orange-400 hover:text-orange-600 disabled:opacity-30 disabled:pointer-events-none"
          >다음 ›</button>
        </div>
      )}

      {/* Write CTA */}
      <div className="flex justify-center pt-2">
        <Link href="/proposals?type=report"
          className="px-5 py-2.5 bg-orange-500 text-white text-sm font-bold rounded-xl hover:bg-orange-600 transition-colors">
          📢 불편사항 제보하기
        </Link>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" /></div>}>
      <BoardPage />
    </Suspense>
  );
}
