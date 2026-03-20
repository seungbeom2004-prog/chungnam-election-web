"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { ProposalPost } from "@/types";
import ProposalForm from "./ProposalForm";

const PledgeProposalSection = dynamic(() => import("./PledgeProposalSection"), { ssr: false });
const CandidateResponseSection = dynamic(() => import("./CandidateResponseSection"), { ssr: false });

const PAGE_SIZE = 10;

const relativeTime = (date: string) => {
  const d = new Date(date);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60) return "방금 전";
  if (diff < 3600) return Math.floor(diff / 60) + "분 전";
  if (diff < 86400) return Math.floor(diff / 3600) + "시간 전";
  return Math.floor(diff / 86400) + "일 전";
};

/** Rank medal for top 3 proposals in popular sort */
function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span title="1위" className="text-lg leading-none">🥇</span>;
  if (rank === 2) return <span title="2위" className="text-lg leading-none">🥈</span>;
  if (rank === 3) return <span title="3위" className="text-lg leading-none">🥉</span>;
  return (
    <span className="w-6 h-6 rounded-full bg-muted/20 text-muted text-xs font-bold flex items-center justify-center shrink-0">
      {rank}
    </span>
  );
}

interface Props {
  candidateId?: string;
  city?: string;
  postType?: string;
  showForm?: boolean;
  onRankingRefresh?: () => void;
  isCandidate?: boolean;
  candidateName?: string;
  highlightedId?: string;
}

export default function ProposalList({ candidateId, city, postType, showForm, onRankingRefresh, isCandidate, candidateName, highlightedId }: Props) {
  const [proposals, setProposals] = useState<ProposalPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [likePending, setLikePending] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<"latest" | "popular">("popular");

  const buildUrl = useCallback(
    (p: number, sortMode = sort) => {
      const params = new URLSearchParams();
      if (candidateId) params.set("candidateId", candidateId);
      if (city) params.set("city", city);
      if (postType) params.set("postType", postType);
      params.set("sort", sortMode);
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String((p - 1) * PAGE_SIZE));
      return `/api/proposals?${params.toString()}`;
    },
    [candidateId, city, sort, postType]
  );

  const fetchProposals = useCallback(
    async (reset = false, sortMode = sort) => {
      const p = reset ? 1 : page;
      if (reset) setLoading(true);
      try {
        const res = await fetch(buildUrl(p, sortMode));
        const json = await res.json();
        const items: ProposalPost[] = json.data ?? [];
        if (reset) {
          setProposals(items);
          setPage(1);
        } else {
          setProposals((prev) => [...prev, ...items]);
        }
        setHasMore(items.length === PAGE_SIZE);
      } catch {
        // silently ignore
      } finally {
        setLoading(false);
      }
    },
    [buildUrl, page, sort]
  );

  useEffect(() => {
    fetchProposals(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidateId, city, sort, postType]);

  const handleSortChange = (newSort: "latest" | "popular") => {
    setSort(newSort);
    setPage(1);
  };

  const loadMore = () => {
    if (loadingMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    const params = new URLSearchParams();
    if (candidateId) params.set("candidateId", candidateId);
    if (city) params.set("city", city);
    if (postType) params.set("postType", postType);
    params.set("sort", sort);
    params.set("limit", String(PAGE_SIZE));
    params.set("offset", String(page * PAGE_SIZE));
    fetch(`/api/proposals?${params.toString()}`)
      .then((r) => r.json())
      .then((json) => {
        const items: ProposalPost[] = json.data ?? [];
        setProposals((prev) => [...prev, ...items]);
        setHasMore(items.length === PAGE_SIZE);
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  };

  const handleLike = async (proposal: ProposalPost) => {
    if (likePending.has(proposal.id)) return;
    const nextLiked = !proposal.hasLiked;
    const nextCount = (proposal.likeCount ?? 0) + (nextLiked ? 1 : -1);
    setProposals((prev) =>
      prev.map((p) =>
        p.id === proposal.id ? { ...p, hasLiked: nextLiked, likeCount: nextCount } : p
      )
    );
    setLikePending((s) => new Set(s).add(proposal.id));
    try {
      const res = await fetch(`/api/proposals/${proposal.id}/like`, { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        setProposals((prev) =>
          prev.map((p) =>
            p.id === proposal.id
              ? { ...p, hasLiked: json.hasLiked ?? json.liked ?? nextLiked, likeCount: json.likeCount ?? nextCount }
              : p
          )
        );
      } else {
        setProposals((prev) =>
          prev.map((p) =>
            p.id === proposal.id ? { ...p, hasLiked: proposal.hasLiked, likeCount: proposal.likeCount } : p
          )
        );
      }
    } catch {
      setProposals((prev) =>
        prev.map((p) =>
          p.id === proposal.id ? { ...p, hasLiked: proposal.hasLiked, likeCount: proposal.likeCount } : p
        )
      );
    } finally {
      setLikePending((s) => {
        const next = new Set(s);
        next.delete(proposal.id);
        return next;
      });
    }
  };

  // Top 3 popular proposals (in popular sort mode, first PAGE shown)
  const showRankBadge = sort === "popular";

  return (
    <div className="space-y-4">
      {showForm && (
        <ProposalForm
          candidateId={candidateId}
          city={city}
          onSuccess={() => { fetchProposals(true); onRankingRefresh?.(); }}
        />
      )}

      {/* Sort controls + popular section header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 bg-surface border border-border rounded-full p-0.5">
          <button
            onClick={() => handleSortChange("latest")}
            aria-pressed={sort === "latest"}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
              sort === "latest"
                ? "bg-primary text-white"
                : "text-muted hover:text-foreground"
            }`}
          >
            🕐 최신순
          </button>
          <button
            onClick={() => handleSortChange("popular")}
            aria-pressed={sort === "popular"}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
              sort === "popular"
                ? "bg-primary text-white"
                : "text-muted hover:text-foreground"
            }`}
          >
            🔥 인기순
          </button>
        </div>
        {sort === "popular" && proposals.length > 0 && (
          <p className="text-xs text-muted">
            좋아요를 많이 받은 게시물이 후보자에게 더 잘 보입니다!
          </p>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : proposals.length === 0 ? (
        <div className="py-12 text-center">
          <div className="text-4xl mb-3">{postType === "민원" ? "📢" : "💡"}</div>
          <p className="text-base font-semibold text-foreground mb-1">아직 {postType === "민원" ? "불편 제보가" : "공약 제안이"} 없습니다</p>
          <p className="text-sm text-muted">
            {showForm ? `첫 번째 ${postType === "민원" ? "불편 제보를" : "공약 제안을"} 남겨보세요!` : `아직 등록된 ${postType === "민원" ? "불편 제보가" : "공약 제안이"} 없습니다.`}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {proposals.map((proposal, idx) => (
              <div
                key={proposal.id}
                id={proposal.id}
                className={`p-4 border rounded-xl bg-surface transition-shadow hover:shadow-sm ${
                  showRankBadge && idx < 3
                    ? "border-primary/30 bg-primary/5"
                    : "border-border"
                } ${highlightedId === proposal.id ? "ring-2 ring-primary" : ""}`}
              >
                <div className="flex items-start gap-3">
                  {/* Rank badge */}
                  {showRankBadge && (
                    <div className="pt-0.5 shrink-0">
                      <RankBadge rank={idx + 1} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {proposal.postType && (
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0 inline-block"
                            style={{ backgroundColor: proposal.postType === "민원" ? "#EF4444" : "#FACC15" }}
                            title={proposal.postType}
                          />
                        )}
                        <span className="text-sm font-semibold text-foreground truncate">
                          {proposal.title || proposal.content.slice(0, 30)}
                        </span>
                        <time className="text-xs text-muted shrink-0" dateTime={proposal.createdAt}>
                          {relativeTime(proposal.createdAt)}
                        </time>
                        {proposal.latitude && proposal.longitude && (
                          <span className="text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded-full shrink-0">
                            📍
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                        {proposal.status === "accepted" && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                            ✅ 채택됨
                          </span>
                        )}
                        {/* 후보자 답변 뱃지 */}
                        {proposal.responses && proposal.responses.length > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                            ✅ 후보자 답변 완료
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap line-clamp-5">
                      {proposal.content}
                    </p>

                    {/* Actions */}
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        onClick={() => handleLike(proposal)}
                        disabled={likePending.has(proposal.id)}
                        aria-label={proposal.hasLiked ? "좋아요 취소" : "좋아요"}
                        aria-pressed={proposal.hasLiked}
                        className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border transition-all ${
                          proposal.hasLiked
                            ? "bg-red-50 text-red-500 border-red-200 hover:bg-red-100 scale-105"
                            : "bg-background text-muted border-border hover:text-foreground hover:bg-border/50"
                        }`}
                      >
                        <svg
                          aria-hidden="true"
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill={proposal.hasLiked ? "currentColor" : "none"}
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                        <span>{proposal.likeCount ?? 0}</span>
                      </button>
                      {/* Popularity score bar (shown in popular sort for top items) */}
                      {showRankBadge && idx < 10 && (proposal.likeCount ?? 0) > 0 && (
                        <div className="flex items-center gap-1 flex-1 min-w-0">
                          <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                            <div
                              role="progressbar"
                              aria-valuenow={proposal.likeCount ?? 0}
                              aria-valuemin={0}
                              aria-valuemax={proposals[0]?.likeCount ?? 1}
                              aria-label="인기도"
                              className="h-full bg-primary rounded-full transition-all"
                              style={{
                                width: `${Math.min(100, ((proposal.likeCount ?? 0) / Math.max(proposals[0]?.likeCount ?? 1, 1)) * 100)}%`,
                              }}
                            />
                          </div>
                          <span className="text-[10px] text-muted shrink-0">
                            {proposal.likeCount}표
                          </span>
                        </div>
                      )}
                    </div>

                    {/* 민원에 대한 공약 제안 섹션 */}
                    {proposal.postType === "민원" && (
                      <PledgeProposalSection
                        minwonId={proposal.id}
                        minwonTitle={proposal.title || proposal.content.slice(0, 30)}
                        isCandidate={isCandidate}
                        candidateName={candidateName}
                      />
                    )}

                    {/* 후보자 답변 섹션 */}
                    <CandidateResponseSection
                      proposalId={proposal.id}
                      initialResponses={proposal.responses}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {hasMore && (
            <div className="text-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="px-4 py-2 text-sm font-semibold text-primary border border-primary rounded-lg hover:text-foreground hover:bg-background transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
              >
                {loadingMore && (
                  <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                )}
                {loadingMore ? "불러오는 중..." : "더보기"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
