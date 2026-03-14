"use client";

import { useCallback, useEffect, useState } from "react";
import type { ProposalPost } from "@/types";

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
  candidateId: string;
}

export default function ProposalsTab({ candidateId }: Props) {
  const [proposals, setProposals] = useState<ProposalPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionPending, setActionPending] = useState<Set<string>>(new Set());

  const fetchProposals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/proposals?candidateId=${candidateId}&limit=100`);
      const json = await res.json();
      setProposals(json.data ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [candidateId]);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  const handleAction = async (id: string, action: "accept" | "delete") => {
    if (actionPending.has(id)) return;
    if (action === "delete" && !confirm("이 제안을 삭제하시겠습니까?")) return;

    setActionPending((s) => new Set(s).add(id));
    try {
      await fetch(`/api/proposals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      await fetchProposals();
    } catch {
      // ignore
    } finally {
      setActionPending((s) => {
        const next = new Set(s);
        next.delete(id);
        return next;
      });
    }
  };

  const pending = proposals.filter((p) => p.status === "pending");
  const accepted = proposals.filter((p) => p.status === "accepted");

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Pending proposals */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">
            대기 중인 제안
            {pending.length > 0 && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                {pending.length}
              </span>
            )}
          </h2>
        </div>

        {pending.length === 0 ? (
          <div className="py-8 text-center border border-border rounded-xl bg-surface">
            <p className="text-sm text-muted">대기 중인 제안이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((proposal) => (
              <div
                key={proposal.id}
                className="p-4 border border-border rounded-xl bg-surface"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-sm font-medium text-foreground">
                        {proposal.authorName}
                      </span>
                      <time className="text-xs text-muted">
                        {relativeTime(proposal.createdAt)}
                      </time>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                      {proposal.content}
                    </p>
                    {proposal.likeCount != null && proposal.likeCount > 0 && (
                      <p className="text-xs text-muted mt-2">
                        공감 {proposal.likeCount}명
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleAction(proposal.id, "accept")}
                      disabled={actionPending.has(proposal.id)}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-primary rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-60"
                    >
                      채택
                    </button>
                    <button
                      onClick={() => handleAction(proposal.id, "delete")}
                      disabled={actionPending.has(proposal.id)}
                      className="px-3 py-1.5 text-xs font-medium text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-60"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Accepted proposals */}
      {accepted.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-foreground mb-3">채택된 제안</h2>
          <div className="space-y-3">
            {accepted.map((proposal) => (
              <div
                key={proposal.id}
                className="p-4 border border-green-200 rounded-xl bg-green-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-sm font-medium text-foreground">
                        {proposal.authorName}
                      </span>
                      <time className="text-xs text-muted">
                        {relativeTime(proposal.createdAt)}
                      </time>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                        채택됨
                      </span>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                      {proposal.content}
                    </p>
                  </div>
                  <button
                    onClick={() => handleAction(proposal.id, "delete")}
                    disabled={actionPending.has(proposal.id)}
                    className="px-3 py-1.5 text-xs font-medium text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-60 shrink-0"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
