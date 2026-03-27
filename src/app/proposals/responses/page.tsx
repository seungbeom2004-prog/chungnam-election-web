"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { ProposalPost, ProposalResponse } from "@/types";

const STATUS_CONFIG: Record<string, { emoji: string; label: string; color: string; bg: string; border: string }> = {
  "접수됨":          { emoji: "📋", label: "접수됨",          color: "text-gray-700",  bg: "bg-gray-50",   border: "border-gray-200" },
  "검토 중":         { emoji: "🔍", label: "검토 중",          color: "text-blue-700",  bg: "bg-blue-50",   border: "border-blue-200" },
  "공약 반영 예정":  { emoji: "📝", label: "공약 반영 예정",   color: "text-amber-700", bg: "bg-amber-50",  border: "border-amber-200" },
  "공약 반영 완료":  { emoji: "✅", label: "공약 반영 완료",   color: "text-green-700", bg: "bg-green-50",  border: "border-green-200" },
  "반영 불가":       { emoji: "❌", label: "반영 불가",         color: "text-red-700",   bg: "bg-red-50",    border: "border-red-200" },
};

const relativeTime = (date: string) => {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return "방금 전";
  if (diff < 3600) return Math.floor(diff / 60) + "분 전";
  if (diff < 86400) return Math.floor(diff / 3600) + "시간 전";
  return Math.floor(diff / 86400) + "일 전";
};

type PostWithResponses = ProposalPost & { responses: ProposalResponse[] };

type SortKey = "latest" | "most";

export default function ProposalResponsesPage() {
  const [posts, setPosts] = useState<PostWithResponses[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortKey>("latest");
  const [filterStatus, setFilterStatus] = useState<string>("전체");

  useEffect(() => {
    setLoading(true);
    fetch("/api/proposals?limit=500&sort=latest")
      .then(r => r.json())
      .then(json => {
        const data = (json.data ?? []) as PostWithResponses[];
        const withResp = data.filter(p => Array.isArray(p.responses) && p.responses.length > 0);
        setPosts(withResp);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const allStatuses = ["전체", ...Object.keys(STATUS_CONFIG)];

  const filtered = posts.filter(p => {
    if (filterStatus === "전체") return true;
    return p.responses.some(r => r.status === filterStatus);
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "most") return b.responses.length - a.responses.length;
    // latest: sort by most recent response createdAt
    const latestA = a.responses.reduce((max, r) => r.createdAt > max ? r.createdAt : max, "");
    const latestB = b.responses.reduce((max, r) => r.createdAt > max ? r.createdAt : max, "");
    return latestB.localeCompare(latestA);
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link href="/proposals" className="text-xs text-muted hover:text-foreground mb-3 inline-flex items-center gap-1">
            ← 제보/제안 게시판
          </Link>
          <h1 className="text-2xl font-bold text-foreground mt-1">💬 후보자 답변 모아보기</h1>
          <p className="text-sm text-muted mt-1">
            시민들의 불편 제보와 공약 제안에 후보자가 직접 답변한 글을 모았습니다.
          </p>
          {!loading && (
            <p className="text-xs text-primary font-semibold mt-2">{sorted.length}건의 답변된 제보/제안</p>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {/* Sort */}
          <div className="flex gap-1 rounded-lg bg-surface border border-border p-0.5">
            {(["latest", "most"] as SortKey[]).map(s => (
              <button key={s} onClick={() => setSort(s)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${sort === s ? "bg-primary text-white" : "text-muted hover:text-foreground"}`}
              >
                {s === "latest" ? "최신순" : "답변많은순"}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <div className="overflow-x-auto scrollbar-none flex gap-1.5">
            {allStatuses.map(s => {
              const cfg = STATUS_CONFIG[s];
              const isActive = filterStatus === s;
              return (
                <button key={s} onClick={() => setFilterStatus(s)}
                  className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                    isActive
                      ? cfg ? `${cfg.bg} ${cfg.color} ${cfg.border}` : "bg-primary/10 text-primary border-primary/30"
                      : "bg-surface text-muted border-border hover:text-foreground"
                  }`}
                >
                  {cfg ? `${cfg.emoji} ${s}` : s}
                </button>
              );
            })}
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-20 text-muted">
            <p className="text-3xl mb-3">💬</p>
            <p className="text-sm">아직 후보자가 답변한 제보/제안이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sorted.map(post => {
              const isMinwon = post.postType === "민원";
              const latestResp = post.responses.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
              return (
                <div key={post.id} className="rounded-2xl border border-border bg-surface overflow-hidden">
                  {/* Proposal section */}
                  <Link href={`/proposals/${post.id}`} className="block p-4 hover:bg-background transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${isMinwon ? "bg-red-50 text-red-600 border border-red-200" : "bg-amber-50 text-amber-600 border border-amber-200"}`}>
                            {isMinwon ? "📢 불편제보" : "💡 공약제안"}
                          </span>
                          {post.city && <span className="text-[11px] text-muted">{post.city}</span>}
                          <span className="text-[11px] text-muted ml-auto">{relativeTime(post.createdAt)}</span>
                        </div>
                        <h3 className="text-sm font-semibold text-foreground line-clamp-2">
                          {post.title || post.content.slice(0, 60)}
                        </h3>
                        {post.title && (
                          <p className="text-xs text-muted mt-1 line-clamp-2">{post.content}</p>
                        )}
                        <p className="text-[11px] text-muted mt-1.5">by {post.authorName}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary">
                          💬 {post.responses.length}
                        </span>
                      </div>
                    </div>
                  </Link>

                  {/* Responses preview */}
                  <div className="border-t border-border px-4 py-3 space-y-2.5">
                    {post.responses
                      .slice()
                      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                      .map(r => {
                        const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG["접수됨"]!;
                        return (
                          <div key={r.id} className="flex items-start gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-primary/10 overflow-hidden shrink-0 flex items-center justify-center mt-0.5">
                              {r.candidateProfileImage ? (
                                <Image src={r.candidateProfileImage} alt={r.candidateName} width={28} height={28} className="object-cover w-full h-full" />
                              ) : (
                                <span className="text-primary font-bold text-[10px]">{r.candidateName.charAt(0)}</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                                <span className="text-[11px] font-semibold text-foreground">{r.candidateName}</span>
                                <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                                  {cfg.emoji} {cfg.label}
                                </span>
                                <span className="text-[10px] text-muted">{relativeTime(r.createdAt)}</span>
                              </div>
                              <p className="text-xs text-foreground leading-relaxed line-clamp-3">{r.content}</p>
                            </div>
                          </div>
                        );
                      })}

                    {post.responses.length > 1 && (
                      <Link href={`/proposals/${post.id}`} className="block text-center text-[11px] text-primary font-semibold hover:underline pt-1">
                        답변 {post.responses.length}개 전체 보기 →
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
