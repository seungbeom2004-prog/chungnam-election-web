"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import Card from "@/components/ui/Card";

const IssueLocationMap = dynamic(() => import("./IssueLocationMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 bg-surface rounded-xl border border-border flex items-center justify-center">
      <span className="text-muted text-sm">지도를 불러오는 중...</span>
    </div>
  ),
});

interface LinkedPost {
  id: string;
  title: string;
  content: string;
  authorName: string;
  postType: string;
  createdAt: string;
  latitude: number | null;
  longitude: number | null;
  dong: string | null;
  adminStatus: string | null;
}

interface RelatedPledge {
  id: string;
  title: string;
  candidateName: string;
  district: string;
  category?: string;
}

interface IssueDetail {
  id: string;
  title: string;
  summary: string | null;
  category: string | null;
  dong: string | null;
  city: string | null;
  reportCount: number;
  status: string;
  adminStatus: string | null;
  createdAt: string;
  posts: LinkedPost[];
  relatedPledges?: RelatedPledge[];
  stats: {
    totalPostCount: number;
    cityBreakdown: Record<string, number>;
    dongBreakdown: Record<string, number>;
  };
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  교통: { bg: "bg-blue-100", text: "text-blue-700" },
  안전: { bg: "bg-red-100", text: "text-red-700" },
  교육: { bg: "bg-purple-100", text: "text-purple-700" },
  복지: { bg: "bg-green-100", text: "text-green-700" },
  경제: { bg: "bg-yellow-100", text: "text-yellow-800" },
  환경: { bg: "bg-emerald-100", text: "text-emerald-700" },
  문화: { bg: "bg-pink-100", text: "text-pink-700" },
  기타: { bg: "bg-gray-100", text: "text-gray-600" },
};

function formatDate(dateString: string): string {
  const d = new Date(dateString);
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
}

function PostCard({ post }: { post: LinkedPost }) {
  const isReport = post.postType === "민원";
  return (
    <Link href={`/proposals/${post.id}`}>
      <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer group">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${isReport ? "bg-red-50 text-red-700 border border-red-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
            {isReport ? "📢 불편 제보" : "💡 공약 제안"}
          </span>
          {post.dong && <span className="text-[10px] text-muted">📍 {post.dong}</span>}
          <span className="text-[10px] text-muted ml-auto">{formatDate(post.createdAt)}</span>
        </div>
        <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1 mb-1">
          {post.title}
        </h3>
        <p className="text-xs text-muted line-clamp-2">{post.content}</p>
        <p className="text-[10px] text-muted mt-2">{post.authorName}</p>
      </Card>
    </Link>
  );
}

export default function IssueDetailClient({ issueId }: { issueId: string }) {
  const [issue, setIssue] = useState<IssueDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showMap, setShowMap] = useState(false); // collapsed by default
  const [activePostTab, setActivePostTab] = useState<"all" | "민원" | "제안">("all");

  useEffect(() => {
    async function fetchIssue() {
      try {
        const res = await fetch(`/api/issues/${issueId}`);
        if (!res.ok) { setError(true); return; }
        const json = await res.json();
        setIssue(json.data);
      } catch { setError(true); }
      finally { setLoading(false); }
    }
    fetchIssue();
  }, [issueId]);

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error || !issue) return (
    <div className="text-center py-16">
      <p className="text-lg font-semibold text-foreground mb-2">이슈를 찾을 수 없습니다</p>
      <Link href="/issues" className="text-primary hover:underline text-sm">이슈 목록으로 돌아가기</Link>
    </div>
  );

  const categoryColor = CATEGORY_COLORS[issue.category ?? "기타"] ?? CATEGORY_COLORS["기타"];
  const location = [issue.city, issue.dong].filter(Boolean).join(" ");
  const postsWithLocation = issue.posts.filter(p => p.latitude != null && p.longitude != null);

  const minwonPosts = issue.posts.filter(p => p.postType === "민원");
  const proposalPosts = issue.posts.filter(p => p.postType !== "민원");

  const displayedPosts = activePostTab === "all"
    ? issue.posts
    : activePostTab === "민원"
    ? minwonPosts
    : proposalPosts;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back link */}
      <Link href="/proposals" className="inline-flex items-center gap-1 text-sm text-muted hover:text-primary transition-colors mb-6">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        제보/이슈로 돌아가기
      </Link>

      {/* Title */}
      <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">{issue.title}</h1>

      {/* Meta */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {issue.category && (
          <span className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full ${categoryColor.bg} ${categoryColor.text}`}>
            {issue.category}
          </span>
        )}
        {location && <span className="text-sm text-muted">📍 {location}</span>}
        <span className="text-sm font-semibold text-orange-500">🔥 {issue.reportCount}명 제보</span>
        {proposalPosts.length > 0 && (
          <span className="text-sm font-semibold text-amber-600">💡 {proposalPosts.length}건 제안</span>
        )}
      </div>

      {/* Summary */}
      {issue.summary && (
        <Card className="p-5 mb-5">
          <h2 className="text-sm font-bold text-foreground mb-2">이슈 요약</h2>
          <p className="text-sm text-muted leading-relaxed whitespace-pre-wrap">{issue.summary}</p>
        </Card>
      )}

      {/* Post breakdown pills */}
      <Card className="p-4 mb-5">
        <div className="flex gap-2 flex-wrap">
          {minwonPosts.length > 0 && (
            <span className="text-xs px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full font-medium">📢 불편 제보 {minwonPosts.length}건</span>
          )}
          {proposalPosts.length > 0 && (
            <span className="text-xs px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full font-medium">💡 공약 제안 {proposalPosts.length}건</span>
          )}
          <span className="text-xs px-2.5 py-1 bg-gray-50 text-gray-600 border border-gray-200 rounded-full font-medium">총 {issue.posts.length}건</span>
        </div>
      </Card>

      {/* Related pledges */}
      {issue.relatedPledges && issue.relatedPledges.length > 0 && (
        <Card className="p-5 mb-5">
          <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-1.5">
            🏛️ 관련 공약
            <span className="text-xs font-normal text-muted">후보자 공약</span>
          </h2>
          <div className="space-y-2">
            {issue.relatedPledges.map(pledge => (
              <Link key={pledge.id} href={`/pledge/${pledge.id}`}
                className="flex items-center gap-2 p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 transition-colors group">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">{pledge.title}</p>
                  <p className="text-xs text-muted">{pledge.candidateName} · {pledge.district}</p>
                </div>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-muted shrink-0">
                  <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Collapsible location map */}
      {postsWithLocation.length > 0 && (
        <div className="mb-5 rounded-2xl border border-border overflow-hidden bg-surface">
          <button
            onClick={() => setShowMap(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-background transition-colors text-sm font-semibold text-foreground"
            aria-expanded={showMap}
          >
            <div className="flex items-center gap-2">
              <span>📍 제보 위치</span>
              <span className="text-xs text-muted font-normal">{postsWithLocation.length}건</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted">
              <span>{showMap ? "접기" : "펼치기"}</span>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
                className={`transition-transform duration-200 ${showMap ? "rotate-180" : ""}`}>
                <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </button>
          {showMap && (
            <div className="border-t border-border">
              <IssueLocationMap markers={postsWithLocation.map(p => ({ lat: p.latitude!, lng: p.longitude!, title: p.title }))} />
            </div>
          )}
        </div>
      )}

      {/* Linked posts with tab filter */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-foreground">관련 게시물 ({issue.posts.length}건)</h2>
          {minwonPosts.length > 0 && proposalPosts.length > 0 && (
            <div className="flex gap-1 bg-background border border-border rounded-lg p-0.5">
              {(["all", "민원", "제안"] as const).map(t => (
                <button key={t} onClick={() => setActivePostTab(t)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                    activePostTab === t
                      ? t === "민원" ? "bg-red-500 text-white" : t === "제안" ? "bg-amber-400 text-gray-900" : "bg-primary text-white"
                      : "text-muted hover:text-foreground"
                  }`}>
                  {t === "all" ? "전체" : t === "민원" ? `📢 제보(${minwonPosts.length})` : `💡 제안(${proposalPosts.length})`}
                </button>
              ))}
            </div>
          )}
        </div>

        {displayedPosts.length === 0 ? (
          <p className="text-sm text-muted">연결된 게시물이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {displayedPosts.map(post => <PostCard key={post.id} post={post} />)}
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="text-center py-6">
        <Link href={`/proposals?issueId=${issue.id}`}
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-sm">
          🔥 나도 이 문제!
        </Link>
        <p className="text-xs text-muted mt-2">같은 문제를 겪고 계신다면, 제보를 남겨주세요</p>
      </div>
    </div>
  );
}
