"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import type { ProposalResponse } from "@/types";
import PledgeLinkButton from "./PledgeLinkButton";

// ─── 전체 상태 설정 (8가지) ───────────────────────────────────────────────────
const STATUS_CONFIG = {
  "접수됨":         { emoji: "📋", label: "접수됨",          color: "text-gray-700",   bg: "bg-gray-50",    border: "border-gray-200" },
  "검토 중":        { emoji: "🔍", label: "검토 중",          color: "text-blue-700",   bg: "bg-blue-50",    border: "border-blue-200" },
  "민원 접수":      { emoji: "📨", label: "민원 접수",        color: "text-indigo-700", bg: "bg-indigo-50",  border: "border-indigo-200" },
  "민원 해결":      { emoji: "🏛️", label: "민원 해결",        color: "text-purple-700", bg: "bg-purple-50",  border: "border-purple-200" },
  "민원 실패":      { emoji: "⚠️", label: "민원 실패",        color: "text-orange-700", bg: "bg-orange-50",  border: "border-orange-200" },
  "공약 반영 예정": { emoji: "📝", label: "공약 반영 예정",   color: "text-amber-700",  bg: "bg-amber-50",   border: "border-amber-200" },
  "공약 반영 완료": { emoji: "✅", label: "공약 반영 완료",   color: "text-green-700",  bg: "bg-green-50",   border: "border-green-200" },
  "반영 불가":      { emoji: "❌", label: "반영 불가",         color: "text-red-700",    bg: "bg-red-50",     border: "border-red-200" },
} as const;

type StatusKey = keyof typeof STATUS_CONFIG;

// 민원 글 vs 제안 글에서 보여줄 상태 분리
const MINWON_STATUSES: StatusKey[][] = [
  ["접수됨", "검토 중"],
  ["민원 접수", "민원 해결", "민원 실패"],
];
const PLEDGE_STATUSES: StatusKey[][] = [
  ["접수됨", "검토 중"],
  ["공약 반영 예정", "공약 반영 완료", "반영 불가"],
];

// 단계별 코멘트 placeholder
const CONTENT_PLACEHOLDERS: Partial<Record<StatusKey, string>> = {
  "접수됨":         "민원을 접수했음을 시민에게 알려주세요.",
  "검토 중":        "현재 내용을 검토 중임을 알려주세요.",
  "민원 접수":      "어떤 담당 부서/기관에 민원을 제출하셨나요? 접수번호·처리 내용을 작성해주세요.",
  "민원 해결":      "어떻게 해결됐는지 설명해주세요. 관공서의 공식 답변이 있다면 아래 칸에 첨부하세요.",
  "민원 실패":      "처리가 어려웠던 이유를 설명해주세요. 관공서의 공식 답변이 있다면 아래 칸에 첨부하세요.",
  "공약 반영 예정": "이 민원·제안을 공약에 반영할 계획을 알려주세요.",
  "공약 반영 완료": "어떤 공약에 어떻게 반영됐는지 설명해주세요.",
  "반영 불가":      "반영이 어려운 이유를 설명해주세요.",
};

const OFFICIAL_RESPONSE_STATUSES: StatusKey[] = ["민원 해결", "민원 실패"];

const relativeTime = (date: string) => {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return "방금 전";
  if (diff < 3600) return Math.floor(diff / 60) + "분 전";
  if (diff < 86400) return Math.floor(diff / 3600) + "시간 전";
  return Math.floor(diff / 86400) + "일 전";
};

interface Props {
  proposalId: string;
  /** "민원" | "제안" | 기타 — 상태 선택지 필터링에 사용 */
  postType?: string | null;
  /** Pre-loaded responses (optional — fetched client-side if not provided) */
  initialResponses?: ProposalResponse[];
}

export default function CandidateResponseSection({ proposalId, postType, initialResponses }: Props) {
  const { data: session } = useSession();
  const user = session?.user as { id?: string; role?: string } | undefined;
  const isCandidate = user?.role === "candidate";

  const [responses, setResponses] = useState<ProposalResponse[]>(initialResponses ?? []);
  const [loading, setLoading] = useState(!initialResponses);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Form state
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<StatusKey>("접수됨");
  const [officialResponse, setOfficialResponse] = useState("");

  const isMinwon = postType === "민원";
  const statusGroups = isMinwon ? MINWON_STATUSES : PLEDGE_STATUSES;
  const showOfficialResponse = OFFICIAL_RESPONSE_STATUSES.includes(status);
  // 다단계: 같은 후보자의 답변 여러 개 가능 — 모두 표시
  const myResponses = isCandidate && user?.id ? responses.filter(r => r.candidateId === user.id) : [];
  // 현재 폼이 가리키는 status에 이미 답변이 있는지 확인 (수정 vs 신규)
  const editingResponse = isCandidate && user?.id
    ? responses.find(r => r.candidateId === user.id && r.status === status)
    : null;

  useEffect(() => {
    if (initialResponses) return;
    fetch(`/api/proposals/${proposalId}/responses`)
      .then(r => r.json())
      .then(json => setResponses(json.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [proposalId, initialResponses]);

  // 폼이 열릴 때나 status가 바뀔 때, 해당 status의 기존 답변을 pre-fill
  useEffect(() => {
    if (!isCandidate || !user?.id || !showForm) return;
    const existing = responses.find(r => r.candidateId === user.id && r.status === status);
    if (existing) {
      setContent(existing.content);
      setOfficialResponse(existing.officialResponse ?? "");
    } else {
      // 새 단계로 전환 — 비어 있는 폼
      setContent("");
      setOfficialResponse("");
    }
  }, [showForm, status, responses, isCandidate, user?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    setError("");
    setSubmitSuccess(false);
    try {
      const res = await fetch(`/api/proposals/${proposalId}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          status,
          officialResponse: showOfficialResponse ? officialResponse : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "답변 등록에 실패했습니다"); return; }
      // Optimistic update — 같은 (candidate, status) 답변만 교체, 다른 단계 답변은 보존
      setResponses(prev => {
        const others = prev.filter(r => !(r.candidateId === user?.id && r.status === status));
        const updated = json.data ?? { ...json, candidateId: user?.id, candidateName: "", candidateProfileImage: null };
        return [...others, updated];
      });
      setShowForm(false);
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch {
      setError("네트워크 오류가 발생했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;

  const hasResponses = responses.length > 0;

  return (
    <div className="mt-3 border-t border-border pt-4 space-y-3">
      {/* ── 기존 답변 목록 ─────────────────────────────────────── */}
      {hasResponses && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted uppercase tracking-wide">후보자 답변</p>
          {responses.map(r => {
            const cfg = STATUS_CONFIG[r.status as StatusKey] ?? STATUS_CONFIG["접수됨"];
            return (
              <div key={r.id} className={`rounded-xl border p-3.5 ${cfg.bg} ${cfg.border}`}>
                {/* 후보자 프로필 + 상태 */}
                <div className="flex items-start gap-2.5 mb-2.5">
                  <div className="w-8 h-8 rounded-full bg-primary/10 overflow-hidden shrink-0 flex items-center justify-center">
                    {r.candidateProfileImage ? (
                      <Image src={r.candidateProfileImage} alt={r.candidateName} width={32} height={32} className="object-cover w-full h-full" />
                    ) : (
                      <span className="text-primary font-bold text-xs">{r.candidateName.charAt(0)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-semibold text-foreground">{r.candidateName}</span>
                      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] font-medium border bg-white/70 ${cfg.color} ${cfg.border}`}>
                        {cfg.emoji} {cfg.label}
                      </span>
                    </div>
                    <time className="text-[10px] text-muted">{relativeTime(r.createdAt)}</time>
                  </div>
                </div>
                {/* 코멘트 내용 */}
                <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap pl-[2.625rem]">{r.content}</p>
                {/* 관공서 답변 첨부 */}
                {r.officialResponse && (
                  <div className="mt-2.5 ml-[2.625rem] p-3 bg-white/60 border border-current/10 rounded-lg">
                    <p className="text-[10px] font-semibold text-muted mb-1 flex items-center gap-1">
                      🏛️ 관공서 공식 답변
                    </p>
                    <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{r.officialResponse}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── 성공 토스트 ───────────────────────────────────────── */}
      {submitSuccess && (
        <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-center">
          ✅ 답변이 등록됐습니다.
        </p>
      )}

      {/* ── 후보자 답변 / 공약 연결 버튼 ────────────────────────────── */}
      {isCandidate && !showForm && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowForm(true)}
            className="text-xs font-semibold text-white bg-primary hover:bg-primary/90 px-3 py-1.5 rounded-full transition-colors"
          >
            {myResponses.length > 0 ? "✏️ 단계별 답변 추가/수정" : "💬 후보자 답변 달기"}
          </button>
          <PledgeLinkButton proposalId={proposalId} candidateId={user?.id ?? ""} onLinked={(pid) => {
            // 자동으로 "공약 반영 완료" 답변이 추가되므로 응답 목록 새로고침
            fetch(`/api/proposals/${proposalId}/responses`)
              .then(r => r.json())
              .then(j => setResponses(j.data ?? []));
            void pid;
          }} />
        </div>
      )}

      {isCandidate && showForm && (
        <form onSubmit={handleSubmit} className="space-y-3 p-4 rounded-xl border border-primary/30 bg-primary/5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-foreground">후보자 공식 답변</p>
            <button type="button" onClick={() => setShowForm(false)} className="text-muted hover:text-foreground text-xs">✕ 닫기</button>
          </div>

          {/* 상태 선택 — 트랙 구분 */}
          <div className="space-y-1.5">
            {statusGroups.map((group, gi) => (
              <div key={gi} className="flex flex-wrap gap-1">
                {group.map(s => {
                  const cfg = STATUS_CONFIG[s];
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatus(s)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                        status === s
                          ? `${cfg.bg} ${cfg.color} ${cfg.border} ring-1 ring-current/30`
                          : "bg-background text-muted border-border hover:text-foreground"
                      }`}
                    >
                      {cfg.emoji} {cfg.label}
                    </button>
                  );
                })}
                {gi < statusGroups.length - 1 && <div className="w-full border-t border-border/50 my-0.5" />}
              </div>
            ))}
          </div>

          {/* 코멘트 텍스트 */}
          <div>
            <label className="block text-[10px] font-semibold text-muted mb-1">
              {status === "민원 접수" ? "📨 민원 접수 내용" :
               status === "민원 해결" ? "✅ 해결 과정 설명" :
               status === "민원 실패" ? "⚠️ 처리 경과 설명" :
               "💬 답변 내용"}
              <span className="text-red-400 ml-0.5">*</span>
            </label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder={CONTENT_PLACEHOLDERS[status] ?? "답변을 입력하세요..."}
              maxLength={2000}
              rows={4}
              required
              className="w-full text-sm px-3 py-2 rounded-lg border border-border bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <p className="text-[10px] text-muted text-right mt-0.5">{content.length}/2000</p>
          </div>

          {/* 관공서 답변 첨부 (민원 해결/실패 시) */}
          {showOfficialResponse && (
            <div>
              <label className="block text-[10px] font-semibold text-muted mb-1">
                🏛️ 관공서 공식 답변 첨부 <span className="text-muted font-normal">(선택)</span>
              </label>
              <textarea
                value={officialResponse}
                onChange={e => setOfficialResponse(e.target.value)}
                placeholder="담당 공무원이나 기관의 공식 답변·공문 내용을 그대로 붙여넣거나 요약해서 입력하세요."
                maxLength={3000}
                rows={4}
                className="w-full text-sm px-3 py-2 rounded-lg border border-indigo-200 bg-indigo-50/30 text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <p className="text-[10px] text-muted text-right mt-0.5">{officialResponse.length}/3000</p>
            </div>
          )}

          {error && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { setShowForm(false); setError(""); }}
              className="px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground border border-border rounded-lg transition-colors">
              취소
            </button>
            <button type="submit" disabled={submitting || content.trim().length < 5}
              className="px-4 py-1.5 text-xs font-bold text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1.5">
              {submitting && <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {submitting ? "등록 중..." : editingResponse ? `'${editingResponse.status}' 단계 수정` : `'${status}' 단계 답변 등록`}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

/** Compact status badge for list view */
export function ResponseStatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as StatusKey];
  if (!cfg) return null;
  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] font-medium border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
      {cfg.emoji} {cfg.label}
    </span>
  );
}
