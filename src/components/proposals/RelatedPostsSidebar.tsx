"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface PostItem {
  id: string;
  title: string;
  content: string;
  authorName: string;
  postType: string | null;
  createdAt: string;
  likeCount: number;
}

interface Props {
  currentPostId: string;
}

const relativeTime = (date: string) => {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return "방금 전";
  if (diff < 3600) return Math.floor(diff / 60) + "분 전";
  if (diff < 86400) return Math.floor(diff / 3600) + "시간 전";
  return Math.floor(diff / 86400) + "일 전";
};

export default function RelatedPostsSidebar({ currentPostId }: Props) {
  const [tab, setTab] = useState<"popular" | "latest">("popular");
  const [popular, setPopular] = useState<PostItem[]>([]);
  const [latest, setLatest] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/proposals?limit=20&sort=popular")
        .then((r) => r.json())
        .then((json) => (json.data ?? []) as PostItem[]),
      fetch("/api/proposals?limit=20&sort=latest")
        .then((r) => r.json())
        .then((json) => (json.data ?? []) as PostItem[]),
    ])
      .then(([pop, lat]) => {
        const normalize = (items: PostItem[]): PostItem[] =>
          items
            .filter((p) => p.id !== currentPostId)
            .map((p) => ({
              ...p,
              likeCount:
                typeof (p as unknown as { likes?: Array<{ count: number }> }).likes?.[0]?.count === "number"
                  ? (p as unknown as { likes: Array<{ count: number }> }).likes[0]!.count
                  : p.likeCount ?? 0,
            }))
            .slice(0, 10);
        setPopular(normalize(pop));
        setLatest(normalize(lat));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentPostId]);

  const posts = tab === "popular" ? popular : latest;

  return (
    <aside className="bg-surface border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-border">
        <p className="text-sm font-bold text-foreground mb-2">다른 게시글</p>
        {/* Tabs */}
        <div className="flex items-center gap-1 bg-background rounded-lg p-1 border border-border">
          <button
            onClick={() => setTab("popular")}
            className={`flex-1 py-1 text-xs font-semibold rounded-md transition-colors ${
              tab === "popular"
                ? "bg-rose-500 text-white shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            ❤️ 인기순
          </button>
          <button
            onClick={() => setTab("latest")}
            className={`flex-1 py-1 text-xs font-semibold rounded-md transition-colors ${
              tab === "latest"
                ? "bg-primary text-white shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            🕐 최신순
          </button>
        </div>
      </div>

      {/* List */}
      <div className="divide-y divide-border/40">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <p className="text-xs text-muted text-center py-6">게시글이 없습니다</p>
        ) : (
          posts.map((p) => (
            <Link
              key={p.id}
              href={`/proposals/${p.id}`}
              className="flex items-start gap-2.5 px-4 py-3 hover:bg-background/60 transition-colors group"
            >
              <span
                className={`shrink-0 mt-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white leading-none ${
                  p.postType === "민원" ? "bg-red-500" : "bg-amber-500"
                }`}
              >
                {p.postType === "민원" ? "제보" : "제안"}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                  {p.title || p.content.slice(0, 40)}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-muted">{p.authorName}</span>
                  <span className="text-[10px] text-muted">·</span>
                  <span className="text-[10px] text-muted">{relativeTime(p.createdAt)}</span>
                  {p.likeCount > 0 && (
                    <>
                      <span className="text-[10px] text-muted">·</span>
                      <span className="text-[10px] text-rose-400 font-medium">❤ {p.likeCount}</span>
                    </>
                  )}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      <div className="px-4 py-3 border-t border-border">
        <Link
          href="/proposals"
          className="block w-full text-center text-xs font-semibold text-primary hover:underline"
        >
          전체 게시판 보기 →
        </Link>
      </div>
    </aside>
  );
}
