"use client";

import { useCallback, useEffect, useState } from "react";
import type { ProposalPost } from "@/types";
import ProposalForm from "./ProposalForm";

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

interface Props {
  candidateId?: string;
  city?: string;
  showForm?: boolean;
}

export default function ProposalList({ candidateId, city, showForm }: Props) {
  const [proposals, setProposals] = useState<ProposalPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [likePending, setLikePending] = useState<Set<string>>(new Set());

  const buildUrl = useCallback(
    (p: number) => {
      const params = new URLSearchParams();
      if (candidateId) params.set("candidateId", candidateId);
      if (city) params.set("city", city);
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String((p - 1) * PAGE_SIZE));
      return `/api/proposals?${params.toString()}`;
    },
    [candidateId, city]
  );

  const fetchProposals = useCallback(
    async (reset = false) => {
      const p = reset ? 1 : page;
      if (reset) setLoading(true);
      try {
        const res = await fetch(buildUrl(p));
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
    [buildUrl, page]
  );

  useEffect(() => {
    fetchProposals(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidateId, city]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    const params = new URLSearchParams();
    if (candidateId) params.set("candidateId", candidateId);
    if (city) params.set("city", city);
    params.set("limit", String(PAGE_SIZE));
    params.set("offset", String(page * PAGE_SIZE));
    fetch(`/api/proposals?${params.toString()}`)
      .then((r) => r.json())
      .then((json) => {
        const items: ProposalPost[] = json.data ?? [];
        setProposals((prev) => [...prev, ...items]);
        setHasMore(items.length === PAGE_SIZE);
      })
      .catch(() => {});
  };

  const handleLike = async (proposal: ProposalPost) => {
    if (likePending.has(proposal.id)) return;
    // Optimistic update
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
              ? { ...p, hasLiked: json.hasLiked ?? nextLiked, likeCount: json.likeCount ?? nextCount }
              : p
          )
        );
      } else {
        // Revert
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

  return (
    <div className="space-y-4">
      {showForm && (
        <ProposalForm
          candidateId={candidateId}
          city={city}
          onSuccess={() => fetchProposals(true)}
        />
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : proposals.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-muted">아직 제안이 없습니다.</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {proposals.map((proposal) => (
              <div
                key={proposal.id}
                className="p-4 border border-border rounded-xl bg-surface"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {proposal.authorName}
                    </span>
                    <time className="text-xs text-muted">
                      {relativeTime(proposal.createdAt)}
                    </time>
                  </div>
                  {proposal.status === "accepted" && (
                    <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-600 border border-green-200">
                      채택됨
                    </span>
                  )}
                </div>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {proposal.content}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => handleLike(proposal)}
                    disabled={likePending.has(proposal.id)}
                    className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                      proposal.hasLiked
                        ? "bg-red-50 text-red-500 border-red-200 hover:bg-red-100"
                        : "bg-background text-muted border-border hover:text-foreground hover:bg-border/50"
                    }`}
                  >
                    <svg
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
                </div>
              </div>
            ))}
          </div>

          {hasMore && (
            <div className="text-center">
              <button
                onClick={loadMore}
                className="px-4 py-2 text-sm font-medium text-muted border border-border rounded-lg hover:text-foreground hover:bg-background transition-colors"
              >
                더보기
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
