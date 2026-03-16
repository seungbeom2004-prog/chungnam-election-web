"use client";

import { useCallback, useEffect, useState } from "react";
import type { ProposalPost } from "@/types";

const relativeTime = (date: string) => {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return "방금 전";
  if (diff < 3600) return Math.floor(diff / 60) + "분 전";
  if (diff < 86400) return Math.floor(diff / 3600) + "시간 전";
  return Math.floor(diff / 86400) + "일 전";
};

// ─── PledgeProposal 타입 ────────────────────────────────────────────────────
interface PledgeProposalItem {
  id: string;
  title: string;
  content: string;
  authorName: string;
  authorType: string;
  candidateId: string | null;
  status: string;
  createdAt: string;
  minwonLinks?: { minwonId: string }[];
  candidate?: { id: string; name: string; district: string } | null;
}

interface Props {
  candidateId: string;
  candidateName?: string;
}

// ─── 민원 카드 ────────────────────────────────────────────────────────────────
function MinwonCard({
  proposal,
  onAction,
  isPending,
}: {
  proposal: ProposalPost;
  onAction: (id: string, action: "accept" | "delete") => void;
  isPending: boolean;
}) {
  return (
    <div className="p-4 border border-orange-200 rounded-xl bg-orange-50">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white bg-orange-500">
              📢 민원
            </span>
            <span className="text-sm font-medium text-foreground">{proposal.authorName}</span>
            <time className="text-xs text-muted">{relativeTime(proposal.createdAt)}</time>
            {proposal.status === "accepted" && (
              <span className="text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full border border-green-200">
                ✅ 채택됨
              </span>
            )}
          </div>
          {proposal.title && (
            <h4 className="text-sm font-bold text-foreground mb-0.5">{proposal.title}</h4>
          )}
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap line-clamp-4">
            {proposal.content}
          </p>
          {proposal.likeCount != null && proposal.likeCount > 0 && (
            <p className="text-xs text-muted mt-1">공감 {proposal.likeCount}명</p>
          )}
        </div>
        <div className="flex gap-2 shrink-0 flex-col">
          {proposal.status !== "accepted" && (
            <button
              onClick={() => onAction(proposal.id, "accept")}
              disabled={isPending}
              className="px-3 py-1.5 text-xs font-medium text-white bg-primary rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-60"
            >
              채택
            </button>
          )}
          <button
            onClick={() => onAction(proposal.id, "delete")}
            disabled={isPending}
            className="px-3 py-1.5 text-xs font-medium text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-60"
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 공약 제안 카드 ──────────────────────────────────────────────────────────
function PledgeProposalCard({
  item,
  candidateId,
  onAction,
  isPending,
}: {
  item: PledgeProposalItem;
  candidateId: string;
  onAction: (id: string, action: "accept" | "delete") => void;
  isPending: boolean;
}) {
  const isMine = item.candidateId === candidateId;
  return (
    <div
      className={`p-4 border rounded-xl ${
        item.authorType === "candidate"
          ? "bg-blue-50 border-blue-200"
          : "bg-purple-50 border-purple-200"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            {item.authorType === "candidate" ? (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white bg-blue-600">
                🏛️ 후보자 제안
              </span>
            ) : (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white bg-purple-600">
                🙋 방문자 제안
              </span>
            )}
            <span className="text-sm font-medium text-foreground">{item.authorName}</span>
            <time className="text-xs text-muted">{relativeTime(item.createdAt)}</time>
            {item.status === "accepted" && (
              <span className="text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full border border-green-200">
                ✅ 채택됨
              </span>
            )}
          </div>
          <h4 className="text-sm font-bold text-foreground mb-0.5">{item.title}</h4>
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap line-clamp-4">
            {item.content}
          </p>
          {(item.minwonLinks?.length ?? 0) > 0 && (
            <p className="text-xs text-muted mt-1">
              연결된 민원 {item.minwonLinks!.length}개
            </p>
          )}
        </div>
        {/* 내 공약에 연결된 제안이거나 방문자 제안이면 채택/삭제 가능 */}
        {(isMine || item.authorType === "visitor") && (
          <div className="flex gap-2 shrink-0 flex-col">
            {item.status !== "accepted" && (
              <button
                onClick={() => onAction(item.id, "accept")}
                disabled={isPending}
                className="px-3 py-1.5 text-xs font-medium text-white bg-primary rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-60"
              >
                채택
              </button>
            )}
            <button
              onClick={() => onAction(item.id, "delete")}
              disabled={isPending}
              className="px-3 py-1.5 text-xs font-medium text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-60"
            >
              삭제
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 메인 탭 컴포넌트 ────────────────────────────────────────────────────────
type TabKey = "minwon" | "visitor-proposal" | "candidate-proposal";

export default function ProposalsTab({ candidateId, candidateName }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>("minwon");
  const [proposals, setProposals]       = useState<ProposalPost[]>([]);
  const [pledgeProposals, setPledgeProposals] = useState<PledgeProposalItem[]>([]);
  const [loading, setLoading]           = useState(true);
  const [ppLoading, setPpLoading]       = useState(false);
  const [actionPending, setActionPending] = useState<Set<string>>(new Set());
  const [ppActionPending, setPpActionPending] = useState<Set<string>>(new Set());

  // ── fetch 민원/제안 (ProposalPost linked to this candidate) ────────────
  const fetchProposals = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/proposals?candidateId=${candidateId}&limit=100`);
      const json = await res.json();
      setProposals(json.data ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [candidateId]);

  // ── fetch 공약 제안 (PledgeProposal targeting this candidate) ──────────
  const fetchPledgeProposals = useCallback(async () => {
    setPpLoading(true);
    try {
      const res  = await fetch(`/api/pledge-proposals?candidateId=${candidateId}&limit=100`);
      const json = await res.json();
      setPledgeProposals(json.data ?? []);
    } catch {
      // ignore
    } finally {
      setPpLoading(false);
    }
  }, [candidateId]);

  useEffect(() => {
    fetchProposals();
    fetchPledgeProposals();
  }, [fetchProposals, fetchPledgeProposals]);

  // ── 민원/제안 액션 ─────────────────────────────────────────────────────
  const handleProposalAction = async (id: string, action: "accept" | "delete") => {
    if (actionPending.has(id)) return;
    if (action === "delete" && !confirm("삭제하시겠습니까?")) return;
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
      setActionPending((s) => { const n = new Set(s); n.delete(id); return n; });
    }
  };

  // ── 공약 제안 액션 ─────────────────────────────────────────────────────
  const handlePpAction = async (id: string, action: "accept" | "delete") => {
    if (ppActionPending.has(id)) return;
    if (action === "delete" && !confirm("삭제하시겠습니까?")) return;
    setPpActionPending((s) => new Set(s).add(id));
    try {
      await fetch(`/api/pledge-proposals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      await fetchPledgeProposals();
    } catch {
      // ignore
    } finally {
      setPpActionPending((s) => { const n = new Set(s); n.delete(id); return n; });
    }
  };

  const minwons         = proposals.filter((p) => p.postType === "민원");
  const generalProposals = proposals.filter((p) => p.postType !== "민원");
  const visitorPledgeProposals   = pledgeProposals.filter((p) => p.authorType === "visitor");
  const candidatePledgeProposals = pledgeProposals.filter((p) => p.authorType === "candidate");

  const TAB_LABELS: Record<TabKey, string> = {
    "minwon":             `민원 (${minwons.length})`,
    "visitor-proposal":   `방문자 공약 제안 (${visitorPledgeProposals.length})`,
    "candidate-proposal": `후보자 공약 제안 (${candidatePledgeProposals.length})`,
  };

  if (loading && ppLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-1 flex-wrap border-b border-border pb-1">
        {(Object.keys(TAB_LABELS) as TabKey[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              activeTab === tab
                ? "bg-primary text-white"
                : "text-muted hover:text-foreground hover:bg-background"
            }`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* ── 민원 탭 ─────────────────────────────────────────────────────── */}
      {activeTab === "minwon" && (
        <section>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : minwons.length === 0 ? (
            <div className="py-8 text-center border border-border rounded-xl bg-surface">
              <p className="text-sm text-muted">받은 민원이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {minwons.map((p) => (
                <MinwonCard
                  key={p.id}
                  proposal={p}
                  onAction={handleProposalAction}
                  isPending={actionPending.has(p.id)}
                />
              ))}
            </div>
          )}

          {/* 일반 제안 (postType이 민원이 아닌 것) */}
          {generalProposals.length > 0 && (
            <div className="mt-6">
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">일반 제안</h3>
              <div className="space-y-3">
                {generalProposals.map((p) => (
                  <div key={p.id} className="p-4 border border-border rounded-xl bg-surface">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-sm font-medium text-foreground">{p.authorName}</span>
                          <time className="text-xs text-muted">{relativeTime(p.createdAt)}</time>
                          {p.status === "accepted" && (
                            <span className="text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full border border-green-200">✅ 채택됨</span>
                          )}
                        </div>
                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                          {p.content}
                        </p>
                        {p.likeCount != null && p.likeCount > 0 && (
                          <p className="text-xs text-muted mt-1">공감 {p.likeCount}명</p>
                        )}
                      </div>
                      <div className="flex gap-2 shrink-0 flex-col">
                        {p.status !== "accepted" && (
                          <button
                            onClick={() => handleProposalAction(p.id, "accept")}
                            disabled={actionPending.has(p.id)}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-primary rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-60"
                          >채택</button>
                        )}
                        <button
                          onClick={() => handleProposalAction(p.id, "delete")}
                          disabled={actionPending.has(p.id)}
                          className="px-3 py-1.5 text-xs font-medium text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-60"
                        >삭제</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── 방문자 공약 제안 탭 ─────────────────────────────────────────── */}
      {activeTab === "visitor-proposal" && (
        <section>
          {ppLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : visitorPledgeProposals.length === 0 ? (
            <div className="py-8 text-center border border-border rounded-xl bg-surface">
              <p className="text-sm text-muted">방문자가 제안한 공약이 없습니다.</p>
              <p className="text-xs text-muted mt-1">민원 게시판에서 방문자들이 공약을 제안할 수 있습니다.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {visitorPledgeProposals.map((item) => (
                <PledgeProposalCard
                  key={item.id}
                  item={item}
                  candidateId={candidateId}
                  onAction={handlePpAction}
                  isPending={ppActionPending.has(item.id)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── 후보자 공약 제안 탭 ─────────────────────────────────────────── */}
      {activeTab === "candidate-proposal" && (
        <section>
          {ppLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : candidatePledgeProposals.length === 0 ? (
            <div className="py-8 text-center border border-border rounded-xl bg-surface">
              <p className="text-sm text-muted">후보자가 제안한 공약이 없습니다.</p>
              <p className="text-xs text-muted mt-1">
                민원 게시판에서 민원을 확인하고 공약을 제안하세요.
                <a href="/proposals" className="ml-1 text-primary hover:underline">민원 게시판 →</a>
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {candidatePledgeProposals.map((item) => (
                <PledgeProposalCard
                  key={item.id}
                  item={item}
                  candidateId={candidateId}
                  onAction={handlePpAction}
                  isPending={ppActionPending.has(item.id)}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
