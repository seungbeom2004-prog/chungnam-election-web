"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import type { ProposalPost, ProposalResponse, Pledge } from "@/types";

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
  pinLat?: number | null;
  pinLng?: number | null;
  onRegisterAsPledge?: (data: { title: string; description: string }) => void;
}

// ─── Haversine 거리 계산 ──────────────────────────────────────────────────────
function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── 상태 설정 ───────────────────────────────────────────────────────────────
const STATUS_CONFIG = [
  { value: "접수됨",        label: "📋 접수됨",        bg: "bg-gray-100",   text: "text-gray-700",   border: "border-gray-300" },
  { value: "검토 중",       label: "🔍 검토 중",       bg: "bg-blue-100",   text: "text-blue-700",   border: "border-blue-300" },
  // ── 민원 해결 트랙 ─────────────────────────────────────────────
  { value: "민원 접수",     label: "📨 민원 접수",     bg: "bg-indigo-100", text: "text-indigo-700", border: "border-indigo-300" },
  { value: "민원 해결",     label: "🏛️ 민원 해결",    bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-300" },
  { value: "민원 실패",     label: "⚠️ 민원 실패",    bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-300" },
  // ── 공약 반영 트랙 ─────────────────────────────────────────────
  { value: "공약 반영 예정", label: "📝 공약 반영 예정", bg: "bg-amber-100",  text: "text-amber-700",  border: "border-amber-300" },
  { value: "공약 반영 완료", label: "✅ 공약 반영 완료", bg: "bg-green-100",  text: "text-green-700",  border: "border-green-300" },
  { value: "반영 불가",     label: "❌ 반영 불가",     bg: "bg-red-100",    text: "text-red-700",    border: "border-red-300" },
] as const;

type StatusValue = (typeof STATUS_CONFIG)[number]["value"];
type DraftData = { status: StatusValue; content: string; pledgeId: string };

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG.find(s => s.value === status) ?? STATUS_CONFIG[0];
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      {cfg.label}
    </span>
  );
}

// ─── 답변 패널 ───────────────────────────────────────────────────────────────

// 민원 트랙과 공약 트랙을 분리한 상태 그룹
const STATUS_GROUPS_MINWON = [
  {
    label: "🏛️ 민원 직접 해결 트랙",
    items: STATUS_CONFIG.filter(s => ["접수됨","검토 중","민원 접수","민원 해결","민원 실패"].includes(s.value)),
  },
  {
    label: "📋 공약으로 해결 트랙",
    items: STATUS_CONFIG.filter(s => ["공약 반영 예정","공약 반영 완료","반영 불가"].includes(s.value)),
  },
];

const STATUS_GROUPS_PLEDGE = [
  {
    label: "처리 상태",
    items: STATUS_CONFIG.filter(s => !["민원 접수","민원 해결","민원 실패"].includes(s.value)),
  },
];

function ResponsePanel({
  proposalId,
  pledgeProposalId,
  initialResponse,
  pledges,
  onSaved,
  onClose,
  postType,
}: {
  proposalId?: string;
  pledgeProposalId?: string;
  initialResponse?: ProposalResponse;
  pledges: Pledge[];
  onSaved: () => void;
  onClose: () => void;
  postType?: string | null;
}) {
  const [loading, setLoading] = useState(!initialResponse && !!pledgeProposalId);
  const [existing, setExisting] = useState<ProposalResponse | undefined>(initialResponse);
  const [status, setStatus] = useState<StatusValue>((initialResponse?.status as StatusValue) ?? "접수됨");
  const [content, setContent] = useState(initialResponse?.content ?? "");
  const [linkedPledgeId, setLinkedPledgeId] = useState(initialResponse?.pledgeId ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // For pledgeProposal: fetch existing response lazily
  useEffect(() => {
    if (!pledgeProposalId) return;
    fetch(`/api/pledge-proposals/${pledgeProposalId}/responses`)
      .then(r => r.json())
      .then(json => {
        const mine = (json.data ?? [])[0] as ProposalResponse | undefined;
        if (mine) {
          setExisting(mine);
          setStatus((mine.status as StatusValue) ?? "접수됨");
          setContent(mine.content);
          setLinkedPledgeId(mine.pledgeId ?? "");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pledgeProposalId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim().length < 5) { setError("5자 이상 입력해주세요."); return; }
    setSubmitting(true);
    setError(null);

    const endpoint = proposalId
      ? `/api/proposals/${proposalId}/responses`
      : `/api/pledge-proposals/${pledgeProposalId}/responses`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        content: content.trim(),
        pledgeId: status === "공약 반영 완료" ? (linkedPledgeId || null) : null,
      }),
    });

    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "저장에 실패했습니다.");
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    onSaved();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-3 mt-2 border-t border-dashed border-gray-200">
        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="mt-3 pt-3 border-t border-dashed border-gray-200">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-xs font-semibold text-foreground">
          💬 {existing ? "답변 수정" : "답변 작성"}
        </span>
        <button onClick={onClose} className="text-xs text-muted hover:text-foreground transition-colors">
          ✕ 닫기
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2.5">
        {/* Status buttons — grouped by track */}
        <div className="space-y-2">
          {(postType === "민원" ? STATUS_GROUPS_MINWON : STATUS_GROUPS_PLEDGE).map(group => (
            <div key={group.label}>
              <p className="text-[10px] text-muted mb-1 font-semibold">{group.label}</p>
              <div className="flex flex-wrap gap-1.5">
                {group.items.map(s => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setStatus(s.value)}
                    className={`px-2 py-1 text-[11px] font-medium rounded-lg border transition-colors ${
                      status === s.value
                        ? `${s.bg} ${s.text} ${s.border}`
                        : "bg-surface text-muted border-border hover:bg-background"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Pledge link (공약 반영 완료) */}
        {status === "공약 반영 완료" && pledges.length > 0 && (
          <div>
            <label className="text-[11px] text-muted mb-1 block font-medium">연결 공약 (선택)</label>
            <select
              value={linkedPledgeId}
              onChange={e => setLinkedPledgeId(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">연결할 공약 선택</option>
              {pledges.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>
        )}

        {/* Content */}
        <div>
          <div className="flex items-center gap-1 mb-1">
            <label className="text-[11px] text-muted font-medium">답변 내용 *</label>
            {status === "반영 불가" && (
              <span className="text-[10px] text-red-500">· 반영 불가 사유를 포함해주세요</span>
            )}
          </div>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder={
              status === "반영 불가"
                ? "반영이 어려운 사유를 설명해주세요 (5자 이상)"
                : "제보자에게 전달할 답변을 작성하세요 (5자 이상)"
            }
            rows={3}
            maxLength={2000}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
          />
          <p className="text-[10px] text-muted text-right mt-0.5">{content.length}/2000</p>
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 py-1.5 text-xs font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg transition-colors disabled:opacity-60"
          >
            {submitting ? "저장 중..." : existing ? "답변 수정" : "답변 등록"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-muted border border-border rounded-lg hover:bg-background transition-colors"
          >
            취소
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── 민원 카드 ────────────────────────────────────────────────────────────────
function MinwonCard({
  proposal,
  candidateId,
  pledges,
  onAction,
  isPending,
  onReply,
  onRefresh,
  onRegisterAsPledge,
}: {
  proposal: ProposalPost;
  candidateId: string;
  pledges: Pledge[];
  onAction: (id: string, action: "accept" | "delete") => void;
  isPending: boolean;
  onReply?: (proposal: ProposalPost) => void;
  onRefresh: () => void;
  onRegisterAsPledge?: (data: { title: string; description: string }) => void;
}) {
  const myResponse = proposal.responses?.find(r => r.candidateId === candidateId);
  const [showResponsePanel, setShowResponsePanel] = useState(false);

  return (
    <div className="p-4 border border-red-200 rounded-xl bg-red-50">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white bg-red-500">
              📢 불편 제보
            </span>
            <span className="text-sm font-medium text-foreground">{proposal.authorName}</span>
            <time className="text-xs text-muted">{relativeTime(proposal.createdAt)}</time>
            {proposal.candidateId === candidateId && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white bg-teal-500">
                ✏️ 내가 쓴 글
              </span>
            )}
            {proposal.status === "accepted" && (
              <span className="text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full border border-green-200">
                ✅ 채택됨
              </span>
            )}
            {myResponse && <StatusBadge status={myResponse.status} />}
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

          {/* 기존 답변 미리보기 */}
          {myResponse && !showResponsePanel && (
            <div className="mt-2 p-2 bg-white/70 rounded-lg border border-red-100 text-xs text-foreground">
              <span className="font-medium text-muted">내 답변: </span>
              <span className="line-clamp-2">{myResponse.content}</span>
            </div>
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
            onClick={() => setShowResponsePanel(v => !v)}
            disabled={isPending}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors disabled:opacity-60 whitespace-nowrap ${
              myResponse
                ? "text-primary border-primary/30 bg-primary/5 hover:bg-primary/10"
                : "text-foreground border-border bg-white hover:bg-background"
            }`}
          >
            {myResponse ? "💬 답변 수정" : "💬 답변하기"}
          </button>
          {onReply && (
            <button
              onClick={() => onReply(proposal)}
              disabled={isPending}
              className="px-3 py-1.5 text-xs font-medium text-yellow-700 bg-yellow-50 border border-yellow-300 rounded-lg hover:bg-yellow-100 transition-colors disabled:opacity-60 whitespace-nowrap"
            >
              💡 공약 제안
            </button>
          )}
          {onRegisterAsPledge && (
            <button
              onClick={() => onRegisterAsPledge({
                title: proposal.title || proposal.content.slice(0, 40),
                description: proposal.content,
              })}
              disabled={isPending}
              className="px-3 py-1.5 text-xs font-medium text-primary border border-primary/30 bg-primary/5 rounded-lg hover:bg-primary/10 transition-colors disabled:opacity-60 whitespace-nowrap"
            >
              📋 공약 등록
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

      {showResponsePanel && (
        <ResponsePanel
          proposalId={proposal.id}
          initialResponse={myResponse}
          pledges={pledges}
          postType={proposal.postType ?? "민원"}
          onSaved={() => { setShowResponsePanel(false); onRefresh(); }}
          onClose={() => setShowResponsePanel(false)}
        />
      )}
    </div>
  );
}

// ─── 민원 테이블 행 (compact list view) ─────────────────────────────────────
function MinwonRow({
  proposal,
  candidateId,
  index,
  pledges,
  onAction,
  isPending,
  onReply,
  onRegisterAsPledge,
  isExpanded,
  onToggle,
  draft,
  onDraftChange,
  onImmediateSubmit,
  isSubmitting,
}: {
  proposal: ProposalPost;
  candidateId: string;
  index: number;
  pledges: Pledge[];
  onAction: (id: string, action: "accept" | "delete") => void;
  isPending: boolean;
  onReply?: (proposal: ProposalPost) => void;
  onRegisterAsPledge?: (data: { title: string; description: string }) => void;
  isExpanded: boolean;
  onToggle: () => void;
  draft: DraftData | undefined;
  onDraftChange: (id: string, d: DraftData) => void;
  onImmediateSubmit: (id: string) => Promise<void>;
  isSubmitting: boolean;
}) {
  const myResponse = proposal.responses?.find(r => r.candidateId === candidateId);
  const hasDraftContent = (draft?.content.trim().length ?? 0) >= 5;

  // Initialise draft state when row first opens (or when response updates externally)
  useEffect(() => {
    if (!isExpanded || draft !== undefined) return;
    onDraftChange(proposal.id, {
      status: (myResponse?.status as StatusValue) ?? "접수됨",
      content: myResponse?.content ?? "",
      pledgeId: myResponse?.pledgeId ?? "",
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExpanded]);

  const title = proposal.title
    ? proposal.title
    : proposal.content.length > 40 ? proposal.content.slice(0, 40) + "…" : proposal.content;

  const curStatus  = draft?.status   ?? (myResponse?.status   as StatusValue) ?? "접수됨";
  const curContent = draft?.content  ?? myResponse?.content   ?? "";
  const curPledge  = draft?.pledgeId ?? myResponse?.pledgeId  ?? "";

  const hasPendingDraft = !!(draft && draft.content.trim().length >= 5);

  return (
    <>
      <tr
        onClick={onToggle}
        className={`border-b border-border cursor-pointer transition-colors select-none ${
          isExpanded ? "bg-red-50" : "hover:bg-red-50/40"
        }`}
      >
        <td className="py-1.5 px-2 text-center text-muted hidden sm:table-cell">{index}</td>
        <td className="py-1.5 px-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-medium text-foreground line-clamp-1 flex-1 min-w-0">{title}</span>
            {hasPendingDraft && (
              <span className="shrink-0 text-[10px] text-blue-600 border border-blue-300 rounded-full px-1.5 py-0.5 bg-blue-50 whitespace-nowrap">✏️ 작성중</span>
            )}
            <span className="shrink-0">
              {myResponse
                ? <StatusBadge status={myResponse.status} />
                : <span className="text-[10px] text-muted border border-border rounded-full px-1.5 py-0.5">미답변</span>
              }
            </span>
          </div>
          {proposal.dong && <span className="text-muted text-[10px]">📍 {proposal.dong}</span>}
        </td>
        <td className="py-1.5 px-2 text-center text-muted hidden sm:table-cell">
          {proposal.city ? proposal.city.replace("시", "").replace("군", "") : "-"}
        </td>
        <td className="py-1.5 px-2 text-center text-muted truncate max-w-[64px]">{proposal.authorName}</td>
        <td className="py-1.5 px-2 text-center text-muted whitespace-nowrap">{relativeTime(proposal.createdAt)}</td>
        <td className="py-1.5 px-2 text-center text-muted">{(proposal.likeCount ?? 0) > 0 ? proposal.likeCount : ""}</td>
      </tr>
      {isExpanded && (
        <tr className="bg-red-50/60 border-b border-red-200">
          <td colSpan={6} className="px-3 py-3" onClick={e => e.stopPropagation()}>

            {/* Full content */}
            <div className="mb-3">
              {proposal.title && <h4 className="text-sm font-bold text-foreground mb-1">{proposal.title}</h4>}
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{proposal.content}</p>
              {(proposal.likeCount ?? 0) > 0 && (
                <p className="text-xs text-muted mt-1">공감 {proposal.likeCount}명</p>
              )}
            </div>

            {/* Row-level action buttons */}
            <div className="flex gap-2 flex-wrap mb-3">
              {proposal.status !== "accepted" && (
                <button onClick={() => onAction(proposal.id, "accept")} disabled={isPending}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-primary rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-60">채택</button>
              )}
              {onReply && (
                <button onClick={() => onReply(proposal)} disabled={isPending}
                  className="px-3 py-1.5 text-xs font-medium text-yellow-700 bg-yellow-50 border border-yellow-300 rounded-lg hover:bg-yellow-100 transition-colors disabled:opacity-60">💡 공약 제안</button>
              )}
              {onRegisterAsPledge && (
                <button onClick={() => onRegisterAsPledge({ title: proposal.title || proposal.content.slice(0, 40), description: proposal.content })} disabled={isPending}
                  className="px-3 py-1.5 text-xs font-medium text-primary border border-primary/30 bg-primary/5 rounded-lg hover:bg-primary/10 transition-colors disabled:opacity-60">📋 공약 등록</button>
              )}
              <button onClick={() => onAction(proposal.id, "delete")} disabled={isPending}
                className="px-3 py-1.5 text-xs font-medium text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-60">삭제</button>
            </div>

            {/* ── 인라인 답변 폼 ── */}
            <div className="pt-3 border-t border-dashed border-gray-200 space-y-2.5">
              <p className="text-xs font-semibold text-foreground">
                💬 {myResponse ? "답변 수정" : "답변 작성"}
                {myResponse && <span className="ml-2 font-normal text-[10px] text-muted">저장된 답변이 있습니다</span>}
              </p>

              {/* 상태 그룹 버튼 */}
              <div className="space-y-2">
                {STATUS_GROUPS_MINWON.map(group => (
                  <div key={group.label}>
                    <p className="text-[10px] text-muted mb-1 font-semibold">{group.label}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {group.items.map(s => (
                        <button key={s.value} type="button"
                          onClick={() => onDraftChange(proposal.id, { status: s.value, content: curContent, pledgeId: curPledge })}
                          className={`px-2 py-1 text-[11px] font-medium rounded-lg border transition-colors ${
                            curStatus === s.value
                              ? `${s.bg} ${s.text} ${s.border}`
                              : "bg-surface text-muted border-border hover:bg-background"
                          }`}
                        >{s.label}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* 연결 공약 */}
              {curStatus === "공약 반영 완료" && pledges.length > 0 && (
                <div>
                  <label className="text-[11px] text-muted mb-1 block font-medium">연결 공약 (선택)</label>
                  <select value={curPledge}
                    onChange={e => onDraftChange(proposal.id, { status: curStatus, content: curContent, pledgeId: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">연결할 공약 선택</option>
                    {pledges.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                </div>
              )}

              {/* 답변 내용 */}
              <div>
                <textarea
                  value={curContent}
                  onChange={e => onDraftChange(proposal.id, { status: curStatus, content: e.target.value, pledgeId: curPledge })}
                  placeholder="제보자에게 전달할 답변을 작성하세요 (5자 이상)"
                  rows={3}
                  maxLength={2000}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                />
                <p className="text-[10px] text-muted text-right mt-0.5">{curContent.length}/2000</p>
              </div>

              {/* 바로 등록 버튼 */}
              <button
                type="button"
                onClick={() => onImmediateSubmit(proposal.id)}
                disabled={isSubmitting || !hasDraftContent}
                className="w-full py-1.5 text-xs font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg transition-colors disabled:opacity-60"
              >
                {isSubmitting ? "저장 중…" : myResponse ? "✅ 바로 수정" : "✅ 바로 등록"}
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── 공약 제안 카드 ──────────────────────────────────────────────────────────
function PledgeProposalCard({
  item,
  candidateId,
  userRole,
  pledges,
  onAction,
  isPending,
  onRefresh,
  onRegisterAsPledge,
}: {
  item: PledgeProposalItem;
  candidateId: string;
  userRole?: string;
  pledges: Pledge[];
  onAction: (id: string, action: "accept" | "delete") => void;
  isPending: boolean;
  onRefresh: () => void;
  onRegisterAsPledge?: (data: { title: string; description: string }) => void;
}) {
  const isMine = item.candidateId === candidateId;
  const isAdmin = userRole === "admin";
  const isCandidate = userRole === "candidate";
  const [showResponsePanel, setShowResponsePanel] = useState(false);
  const [showRevisions, setShowRevisions] = useState(false);
  const [revisions, setRevisions] = useState<Array<{
    id: string; revisionNumber: number; title: string; content: string;
    authorName: string; commitMessage: string | null; createdAt: string;
  }>>([]);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Array<{
    id: string; content: string; authorName: string; authorType: string;
    status: string; createdAt: string;
  }>>([]);
  const [commentText, setCommentText] = useState("");
  const [commentName, setCommentName] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  const loadRevisions = async () => {
    const res = await fetch(`/api/pledge-proposals/${item.id}/revisions`);
    const json = await res.json();
    if (json.success) setRevisions(json.data);
  };

  const loadComments = async () => {
    const res = await fetch(`/api/pledge-proposals/${item.id}/comments`);
    const json = await res.json();
    if (json.success) setComments(json.data);
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || commentText.trim().length < 2) return;
    setCommentSubmitting(true);
    try {
      const res = await fetch(`/api/pledge-proposals/${item.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentText.trim(), authorName: commentName.trim() || "익명" }),
      });
      if (res.ok) {
        setCommentText("");
        await loadComments();
      }
    } finally {
      setCommentSubmitting(false);
    }
  };

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
            {isMine && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white bg-teal-500">
                ✏️ 내가 쓴 글
              </span>
            )}
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

          {/* 버전 이력 / 코멘트 토글 버튼 */}
          <div className="flex gap-2 mt-2 flex-wrap">
            <button
              onClick={() => { setShowRevisions(v => !v); if (!showRevisions) loadRevisions(); }}
              className="text-xs text-muted hover:text-foreground border border-border rounded px-2 py-1"
            >
              📋 버전 이력
            </button>
            <button
              onClick={() => { setShowComments(v => !v); if (!showComments) loadComments(); }}
              className="text-xs text-muted hover:text-foreground border border-border rounded px-2 py-1"
            >
              💬 코멘트 {comments.length > 0 ? `(${comments.length})` : ""}
            </button>
          </div>

          {/* 버전 목록 */}
          {showRevisions && (
            <div className="mt-2 space-y-1 border border-border rounded-lg p-2 bg-background">
              {revisions.length === 0 ? (
                <p className="text-xs text-muted">버전 이력이 없습니다.</p>
              ) : revisions.map(r => (
                <div key={r.id} className="text-xs">
                  <span className="font-mono text-muted">v{r.revisionNumber}</span>
                  <span className="ml-2 font-medium">{r.title}</span>
                  {r.commitMessage && <span className="ml-1 text-muted">({r.commitMessage})</span>}
                  <span className="ml-1 text-muted">{new Date(r.createdAt).toLocaleDateString("ko")}</span>
                </div>
              ))}
            </div>
          )}

          {/* 코멘트 목록 + 작성 */}
          {showComments && (
            <div className="mt-2 border border-border rounded-lg p-2 bg-background space-y-2">
              {comments.length === 0 ? (
                <p className="text-xs text-muted">코멘트가 없습니다.</p>
              ) : (
                <div className="space-y-1">
                  {comments.map(c => (
                    <div key={c.id} className="text-xs border-b border-border pb-1 last:border-0">
                      <span className="font-medium text-foreground">{c.authorName}</span>
                      {c.authorType === "candidate" && (
                        <span className="ml-1 text-[10px] text-blue-600 font-bold">후보자</span>
                      )}
                      <span className="ml-2 text-muted">{new Date(c.createdAt).toLocaleDateString("ko")}</span>
                      <p className="mt-0.5 text-foreground whitespace-pre-wrap">{c.content}</p>
                    </div>
                  ))}
                </div>
              )}
              <form onSubmit={handleCommentSubmit} className="flex flex-col gap-1.5">
                {!isCandidate && !isAdmin && (
                  <input
                    type="text"
                    value={commentName}
                    onChange={e => setCommentName(e.target.value)}
                    placeholder="이름 (익명)"
                    maxLength={30}
                    className="px-2 py-1 text-xs border border-border rounded bg-surface text-foreground"
                  />
                )}
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    placeholder="코멘트 입력 (2자 이상, 500자 이내)"
                    maxLength={500}
                    className="flex-1 px-2 py-1 text-xs border border-border rounded bg-surface text-foreground"
                  />
                  <button
                    type="submit"
                    disabled={commentSubmitting || commentText.trim().length < 2}
                    className="px-2 py-1 text-xs text-white bg-primary rounded hover:bg-primary-hover disabled:opacity-60"
                  >
                    등록
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {(isMine || isAdmin || item.authorType === "visitor") && (
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
            {/* 머지 버튼 (후보자 본인 또는 관리자, pending 상태일 때만) */}
            {(isCandidate || isAdmin) && item.status === "pending" && (
              <button
                onClick={async () => {
                  if (!confirm("이 제안을 정식 공약으로 머지하시겠습니까?")) return;
                  const res = await fetch(`/api/pledge-proposals/${item.id}/merge`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({}),
                  });
                  if (res.ok) onRefresh();
                }}
                disabled={isPending}
                className="text-xs text-green-600 border border-green-300 rounded px-2 py-1 hover:bg-green-50 disabled:opacity-60"
              >
                🔀 머지
              </button>
            )}
            <button
              onClick={() => setShowResponsePanel(v => !v)}
              disabled={isPending}
              className="px-3 py-1.5 text-xs font-medium text-foreground border border-border bg-white rounded-lg hover:bg-background transition-colors disabled:opacity-60 whitespace-nowrap"
            >
              💬 답변하기
            </button>
            {onRegisterAsPledge && (
              <button
                onClick={() => onRegisterAsPledge({ title: item.title, description: item.content })}
                disabled={isPending}
                className="px-3 py-1.5 text-xs font-medium text-primary border border-primary/30 bg-primary/5 rounded-lg hover:bg-primary/10 transition-colors disabled:opacity-60 whitespace-nowrap"
              >
                📋 공약 등록
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

      {showResponsePanel && (
        <ResponsePanel
          pledgeProposalId={item.id}
          pledges={pledges}
          onSaved={() => { setShowResponsePanel(false); onRefresh(); }}
          onClose={() => setShowResponsePanel(false)}
        />
      )}
    </div>
  );
}

// ─── 후보자 공약 제안 작성 폼 ────────────────────────────────────────────────
function CandidateProposalForm({
  replyTo,
  candidateName,
  onSubmit,
  onClose,
}: {
  replyTo: ProposalPost | null;
  candidateName?: string;
  onSubmit: (data: { title: string; content: string }) => Promise<void>;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(
    replyTo?.title ? `[불편 제보 답변] ${replyTo.title}` : ""
  );
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const MAX = 500;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (content.length < 10) { setError("내용을 10자 이상 입력해주세요."); return; }
    setSubmitting(true);
    setError(null);
    await onSubmit({ title, content });
    setSubmitting(false);
  };

  return (
    <div className="p-4 border border-yellow-300 rounded-xl bg-yellow-50 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-yellow-800">💡 공약 제안 작성</span>
          {candidateName && (
            <span className="text-[11px] text-yellow-600">({candidateName} 후보자)</span>
          )}
        </div>
        <button onClick={onClose} className="text-muted hover:text-foreground text-sm transition-colors">✕</button>
      </div>

      {replyTo && (
        <div className="text-xs bg-white border border-yellow-200 rounded-lg px-3 py-2 text-muted">
          <span className="font-medium text-red-600">📢 불편 제보 답변:</span>{" "}
          {replyTo.title || replyTo.content.slice(0, 40) + "…"}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-2.5">
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">제목 *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="공약 제안 제목 (2~50자)"
            minLength={2}
            maxLength={50}
            required
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-yellow-300 transition-colors"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-foreground">내용 *</label>
            <span className={`text-xs ${content.length > MAX ? "text-red-500" : "text-muted"}`}>
              {content.length}/{MAX}
            </span>
          </div>
          <textarea
            ref={contentRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="공약 제안 내용을 입력하세요 (10자 이상)"
            minLength={10}
            maxLength={MAX}
            rows={4}
            required
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-yellow-300 transition-colors resize-none"
          />
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 py-2 text-sm font-semibold text-gray-900 bg-yellow-400 hover:bg-yellow-500 rounded-lg transition-colors disabled:opacity-60"
          >
            {submitting ? "제출 중..." : "💡 공약 제안 게시하기"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-muted border border-border rounded-lg hover:bg-background transition-colors"
          >
            취소
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── 메인 탭 컴포넌트 ────────────────────────────────────────────────────────
type TabKey = "minwon" | "visitor-proposal" | "candidate-proposal";

export default function ProposalsTab({ candidateId, candidateName, pinLat, pinLng, onRegisterAsPledge }: Props) {
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string } | undefined)?.role;
  const [activeTab, setActiveTab] = useState<TabKey>("minwon");
  const [proposals, setProposals]       = useState<ProposalPost[]>([]);
  const [pledgeProposals, setPledgeProposals] = useState<PledgeProposalItem[]>([]);
  const [pledges, setPledges]           = useState<Pledge[]>([]);
  const [loading, setLoading]           = useState(true);
  const [ppLoading, setPpLoading]       = useState(false);
  const [actionPending, setActionPending] = useState<Set<string>>(new Set());
  const [ppActionPending, setPpActionPending] = useState<Set<string>>(new Set());
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [replyToMinwon, setReplyToMinwon] = useState<ProposalPost | null>(null);
  const [proposalFormError, setProposalFormError] = useState<string | null>(null);
  const [expandedMinwonId, setExpandedMinwonId] = useState<string | null>(null);
  const [showOnlyUnanswered, setShowOnlyUnanswered] = useState(false);
  const [rowDrafts, setRowDrafts] = useState<Map<string, DraftData>>(() => new Map());
  const [submittingIds, setSubmittingIds] = useState<Set<string>>(new Set());

  // ── 근처 게시물 ────────────────────────────────────────────────────────────
  const [candidateLat, setCandidateLat] = useState<number | null>(pinLat ?? null);
  const [candidateLng, setCandidateLng] = useState<number | null>(pinLng ?? null);
  const [nearbyPosts, setNearbyPosts]   = useState<ProposalPost[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [showNearby, setShowNearby]     = useState(false);

  const fetchProposals = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/proposals?limit=200&sort=latest`);
      const json = await res.json();
      setProposals(json.data ?? []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  const fetchPledgeProposals = useCallback(async () => {
    setPpLoading(true);
    try {
      const res  = await fetch(`/api/pledge-proposals?limit=200`);
      const json = await res.json();
      setPledgeProposals(json.data ?? []);
    } catch { /* ignore */ }
    finally { setPpLoading(false); }
  }, []);

  const fetchPledges = useCallback(async () => {
    try {
      const res  = await fetch(`/api/pledges?candidateId=${candidateId}&pledgeType=map`);
      const json = await res.json();
      setPledges(json.data ?? json ?? []);
    } catch { /* ignore */ }
  }, [candidateId]);

  useEffect(() => {
    fetchProposals();
    fetchPledgeProposals();
    fetchPledges();
  }, [fetchProposals, fetchPledgeProposals, fetchPledges]);

  // 후보자 핀 좌표 페치 (props에 없을 경우)
  useEffect(() => {
    if (candidateLat != null && candidateLng != null) return;
    fetch(`/api/candidates/${candidateId}`)
      .then(r => r.json())
      .then(json => {
        const c = json.data ?? json;
        if (c?.pinLat != null) setCandidateLat(c.pinLat);
        if (c?.pinLng != null) setCandidateLng(c.pinLng);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidateId]);

  // 근처 게시물 페치
  const fetchNearbyPosts = useCallback(async () => {
    if (candidateLat == null || candidateLng == null) return;
    setNearbyLoading(true);
    try {
      const res = await fetch(`/api/proposals?limit=50&sort=latest`);
      const json = await res.json();
      const all: ProposalPost[] = json.data ?? [];
      type WithDist = ProposalPost & { _dist: number };
      const withDist: WithDist[] = all
        .filter(p => p.latitude != null && p.longitude != null)
        .map(p => ({ ...p, _dist: distanceKm(candidateLat!, candidateLng!, p.latitude!, p.longitude!) }));
      const nearby = withDist
        .filter(p => p._dist <= 10)
        .sort((a, b) => a._dist - b._dist)
        .slice(0, 20);
      setNearbyPosts(nearby);
    } catch { /* ignore */ }
    finally { setNearbyLoading(false); }
  }, [candidateLat, candidateLng]);

  useEffect(() => {
    if (showNearby) fetchNearbyPosts();
  }, [showNearby, fetchNearbyPosts]);

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
    } catch { /* ignore */ }
    finally { setActionPending((s) => { const n = new Set(s); n.delete(id); return n; }); }
  };

  const handleCandidateProposal = async (data: { title: string; content: string }) => {
    setProposalFormError(null);
    try {
      const res = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title,
          content: data.content,
          postType: "제안",
          candidateId,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setProposalFormError(j.error ?? "제출에 실패했습니다.");
        return;
      }
      setShowProposalForm(false);
      setReplyToMinwon(null);
      await fetchProposals();
    } catch {
      setProposalFormError("네트워크 오류가 발생했습니다.");
    }
  };

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
    } catch { /* ignore */ }
    finally { setPpActionPending((s) => { const n = new Set(s); n.delete(id); return n; }); }
  };

  // ── 드래프트 관리 ────────────────────────────────────────────────────────────
  const setDraft = useCallback((id: string, data: DraftData) => {
    setRowDrafts(prev => new Map(prev).set(id, data));
  }, []);

  // 로컬 상태에 응답 즉시 반영 (서버 재조회 없이)
  const applyResponseLocally = useCallback((id: string, data: DraftData) => {
    setProposals(prev => prev.map(p => {
      if (p.id !== id) return p;
      const others = (p.responses ?? []).filter(r => r.candidateId !== candidateId);
      const next: ProposalResponse = {
        id: p.responses?.find(r => r.candidateId === candidateId)?.id ?? `local-${Date.now()}`,
        proposalId: id,
        candidateId,
        candidateName: candidateName ?? "",
        candidateProfileImage: null,
        status: data.status,
        content: data.content,
        pledgeId: data.status === "공약 반영 완료" ? (data.pledgeId || null) : null,
        createdAt: new Date().toISOString(),
      };
      return { ...p, responses: [...others, next] };
    }));
  }, [candidateId, candidateName]);

  // 단일 행 즉시 등록
  const submitRow = useCallback(async (id: string) => {
    const draft = rowDrafts.get(id);
    if (!draft || draft.content.trim().length < 5) return;
    setSubmittingIds(s => new Set(s).add(id));
    try {
      const res = await fetch(`/api/proposals/${id}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: draft.status,
          content: draft.content.trim(),
          pledgeId: draft.status === "공약 반영 완료" ? (draft.pledgeId || null) : null,
        }),
      });
      if (res.ok) {
        applyResponseLocally(id, draft);
        setRowDrafts(prev => { const n = new Map(prev); n.delete(id); return n; });
      }
    } catch { /* ignore */ }
    finally { setSubmittingIds(s => { const n = new Set(s); n.delete(id); return n; }); }
  }, [rowDrafts, applyResponseLocally]);

  // 전부 등록
  const submitAllDrafts = async () => {
    const validIds = [...rowDrafts.entries()]
      .filter(([, d]) => d.content.trim().length >= 5)
      .map(([id]) => id);
    await Promise.all(validIds.map(id => submitRow(id)));
  };

  const minwons          = proposals.filter((p) => p.postType === "민원");
  const generalProposals = proposals.filter((p) => p.postType !== "민원");
  const unansweredMinwons = minwons.filter(p => !p.responses?.some(r => r.candidateId === candidateId));
  const displayedMinwons = showOnlyUnanswered ? unansweredMinwons : minwons;
  const submittableDraftsCount = [...rowDrafts.values()].filter(d => d.content.trim().length >= 5).length;
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
      {/* Sub-tabs + 공약 제안 작성 버튼 */}
      <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
        <div className="flex gap-1 flex-wrap">
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
        <button
          onClick={() => { setReplyToMinwon(null); setShowProposalForm((v) => !v); setProposalFormError(null); }}
          className="shrink-0 px-3 py-1.5 text-xs font-semibold text-gray-900 bg-yellow-400 hover:bg-yellow-500 rounded-lg transition-colors"
        >
          💡 공약 제안 작성
        </button>
      </div>

      {/* 공약 제안 작성 폼 */}
      {showProposalForm && (
        <CandidateProposalForm
          replyTo={replyToMinwon}
          candidateName={candidateName}
          onSubmit={handleCandidateProposal}
          onClose={() => { setShowProposalForm(false); setReplyToMinwon(null); setProposalFormError(null); }}
        />
      )}
      {proposalFormError && (
        <p className="text-xs text-red-500 px-1">{proposalFormError}</p>
      )}

      {/* ── 민원 탭 ─────────────────────────────────────────────────────── */}
      {activeTab === "minwon" && (
        <section>
          {/* 필터 바 */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <button
              onClick={() => setShowOnlyUnanswered(false)}
              className={`px-2.5 py-1 text-xs rounded-full font-semibold transition-colors border ${
                !showOnlyUnanswered
                  ? "bg-red-500 border-red-500 text-white"
                  : "border-border text-muted hover:border-red-300 hover:text-red-600"
              }`}
            >
              전체 {minwons.length}
            </button>
            <button
              onClick={() => setShowOnlyUnanswered(true)}
              className={`px-2.5 py-1 text-xs rounded-full font-semibold transition-colors border ${
                showOnlyUnanswered
                  ? "bg-red-500 border-red-500 text-white"
                  : "border-border text-muted hover:border-red-300 hover:text-red-600"
              }`}
            >
              미답변 {unansweredMinwons.length}
            </button>
            <div className="ml-auto flex items-center gap-2">
              {submittableDraftsCount > 0 && (
                <button
                  onClick={submitAllDrafts}
                  disabled={submittingIds.size > 0}
                  className="px-3 py-1 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-60 flex items-center gap-1"
                >
                  ✅ 전부 등록 ({submittableDraftsCount})
                </button>
              )}
              <button
                onClick={fetchProposals}
                disabled={loading}
                className="px-3 py-1 text-xs font-semibold text-muted border border-border rounded-lg hover:bg-background transition-colors disabled:opacity-60"
              >
                {loading ? "⏳" : "🔄"} 목록 업데이트
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : displayedMinwons.length === 0 ? (
            <div className="py-8 text-center border border-border rounded-xl bg-surface">
              <p className="text-sm text-muted">
                {showOnlyUnanswered ? "미답변 민원이 없습니다. 👏" : "받은 민원이 없습니다."}
              </p>
            </div>
          ) : (
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-red-50 border-b border-border text-muted">
                    <th className="py-2 px-2 text-center font-semibold w-10 hidden sm:table-cell">번호</th>
                    <th className="py-2 px-2 text-left font-semibold">제목 / 답변상태</th>
                    <th className="py-2 px-2 text-center font-semibold w-14 hidden sm:table-cell">지역</th>
                    <th className="py-2 px-2 text-center font-semibold w-14">작성자</th>
                    <th className="py-2 px-2 text-center font-semibold w-12">날짜</th>
                    <th className="py-2 px-2 text-center font-semibold w-8">👍</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedMinwons.map((p, idx) => (
                    <MinwonRow
                      key={p.id}
                      proposal={p}
                      candidateId={candidateId}
                      index={displayedMinwons.length - idx}
                      pledges={pledges}
                      onAction={handleProposalAction}
                      isPending={actionPending.has(p.id)}
                      isExpanded={expandedMinwonId === p.id}
                      onToggle={() => setExpandedMinwonId(v => v === p.id ? null : p.id)}
                      draft={rowDrafts.get(p.id)}
                      onDraftChange={setDraft}
                      onImmediateSubmit={submitRow}
                      isSubmitting={submittingIds.has(p.id)}
                      onReply={(minwon) => {
                        setReplyToMinwon(minwon);
                        setShowProposalForm(true);
                        setProposalFormError(null);
                      }}
                      onRegisterAsPledge={onRegisterAsPledge}
                    />
                  ))}
                </tbody>
              </table>
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
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="text-sm font-medium text-foreground">{p.authorName}</span>
                          <time className="text-xs text-muted">{relativeTime(p.createdAt)}</time>
                          {p.status === "accepted" && (
                            <span className="text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full border border-green-200">✅ 채택됨</span>
                          )}
                          {p.responses?.find(r => r.candidateId === candidateId) && (
                            <StatusBadge status={p.responses.find(r => r.candidateId === candidateId)!.status} />
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
                  userRole={userRole}
                  pledges={pledges}
                  onAction={handlePpAction}
                  isPending={ppActionPending.has(item.id)}
                  onRefresh={fetchPledgeProposals}
                  onRegisterAsPledge={onRegisterAsPledge}
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
                  userRole={userRole}
                  pledges={pledges}
                  onAction={handlePpAction}
                  isPending={ppActionPending.has(item.id)}
                  onRefresh={fetchPledgeProposals}
                  onRegisterAsPledge={onRegisterAsPledge}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── 근처 게시물 섹션 ─────────────────────────────────────────────── */}
      {candidateLat != null && candidateLng != null && (
        <section className="border border-border rounded-xl bg-surface overflow-hidden">
          <button
            onClick={() => setShowNearby(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-background transition-colors"
          >
            <span className="text-sm font-semibold text-foreground flex items-center gap-2">
              🗺️ 내 선거구 근처 게시물 (10km 이내)
              {!nearbyLoading && nearbyPosts.length > 0 && (
                <span className="text-[11px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  {nearbyPosts.length}
                </span>
              )}
            </span>
            <svg
              className={`w-4 h-4 text-muted transition-transform ${showNearby ? "rotate-180" : ""}`}
              fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showNearby && (
            <div className="border-t border-border px-4 py-3">
              {nearbyLoading ? (
                <div className="flex justify-center py-6">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : nearbyPosts.length === 0 ? (
                <p className="text-sm text-muted text-center py-4">10km 반경 내 게시물이 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {nearbyPosts.map((p) => {
                    const dist = p.latitude != null && p.longitude != null
                      ? distanceKm(candidateLat!, candidateLng!, p.latitude, p.longitude)
                      : null;
                    return (
                      <div key={p.id} className="flex items-start gap-2 p-2.5 rounded-lg border border-border hover:bg-background transition-colors">
                        <a
                          href={`/proposals/${p.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 min-w-0 block"
                        >
                          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white ${
                              p.postType === "민원" ? "bg-red-500" : "bg-blue-500"
                            }`}>
                              {p.postType === "민원" ? "📢 민원" : "💡 제안"}
                            </span>
                            <span className="text-xs text-muted">{relativeTime(p.createdAt)}</span>
                          </div>
                          <p className="text-sm font-medium text-foreground truncate hover:text-primary transition-colors">
                            {p.title || p.content.slice(0, 40)}
                          </p>
                          <p className="text-xs text-muted truncate">{p.authorName}</p>
                        </a>
                        <div className="shrink-0 flex flex-col items-end gap-1">
                          {dist != null && (
                            <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                              {dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`}
                            </span>
                          )}
                          {onRegisterAsPledge && (
                            <button
                              onClick={() => onRegisterAsPledge({
                                title: p.title || p.content.slice(0, 40),
                                description: p.content,
                              })}
                              className="text-[10px] font-medium text-primary border border-primary/30 bg-primary/5 px-1.5 py-0.5 rounded-lg hover:bg-primary/10 transition-colors whitespace-nowrap"
                            >
                              📋 공약 등록
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
