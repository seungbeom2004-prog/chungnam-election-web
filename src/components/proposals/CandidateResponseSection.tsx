"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import type { ProposalResponse } from "@/types";

const STATUS_CONFIG: Record<string, { emoji: string; label: string; color: string; bg: string; border: string }> = {
  "접수됨":          { emoji: "📋", label: "접수됨",          color: "text-gray-700",  bg: "bg-gray-50",   border: "border-gray-200" },
  "검토 중":         { emoji: "🔍", label: "검토 중",          color: "text-blue-700",  bg: "bg-blue-50",   border: "border-blue-200" },
  "공약 반영 예정":  { emoji: "📝", label: "공약 반영 예정",   color: "text-amber-700", bg: "bg-amber-50",  border: "border-amber-200" },
  "공약 반영 완료":  { emoji: "✅", label: "공약 반영 완료",   color: "text-green-700", bg: "bg-green-50",  border: "border-green-200" },
  "반영 불가":       { emoji: "❌", label: "반영 불가",         color: "text-red-700",   bg: "bg-red-50",    border: "border-red-200" },
};

const VALID_STATUSES = Object.keys(STATUS_CONFIG);

const relativeTime = (date: string) => {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return "방금 전";
  if (diff < 3600) return Math.floor(diff / 60) + "분 전";
  if (diff < 86400) return Math.floor(diff / 3600) + "시간 전";
  return Math.floor(diff / 86400) + "일 전";
};

interface Props {
  proposalId: string;
  /** Pre-loaded responses (optional — fetched client-side if not provided) */
  initialResponses?: ProposalResponse[];
}

export default function CandidateResponseSection({ proposalId, initialResponses }: Props) {
  const { data: session } = useSession();
  const user = session?.user as { id?: string; role?: string } | undefined;
  const isCandidate = user?.role === "candidate";

  const [responses, setResponses] = useState<ProposalResponse[]>(initialResponses ?? []);
  const [loading, setLoading] = useState(!initialResponses);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [content, setContent] = useState("");
  const [status, setStatus] = useState("접수됨");

  useEffect(() => {
    if (initialResponses) return;
    fetch(`/api/proposals/${proposalId}/responses`)
      .then((r) => r.json())
      .then((json) => setResponses(json.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [proposalId, initialResponses]);

  // Pre-fill form if candidate already has a response
  useEffect(() => {
    if (!isCandidate || !user?.id) return;
    const mine = responses.find((r) => r.candidateId === user.id);
    if (mine) {
      setContent(mine.content);
      setStatus(mine.status);
    }
  }, [responses, isCandidate, user?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/proposals/${proposalId}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, status }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "답변 등록에 실패했습니다");
        return;
      }
      // Refresh responses
      const refreshed = await fetch(`/api/proposals/${proposalId}/responses`).then((r) => r.json());
      setResponses(refreshed.data ?? []);
      setShowForm(false);
    } catch {
      setError("네트워크 오류가 발생했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;

  const hasResponses = responses.length > 0;
  const myResponse = isCandidate && user?.id ? responses.find((r) => r.candidateId === user.id) : null;

  return (
    <div className="mt-3">
      {/* Response list */}
      {hasResponses && (
        <div className="space-y-2.5">
          <p className="text-xs font-semibold text-muted uppercase tracking-wide">후보자 답변</p>
          {responses.map((r) => {
            const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG["접수됨"]!;
            return (
              <div
                key={r.id}
                className="rounded-xl border p-3 bg-surface"
                style={{ borderColor: "var(--border)" }}
              >
                {/* Candidate info + status badge */}
                <div className="flex items-start gap-2.5 mb-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 overflow-hidden shrink-0 flex items-center justify-center">
                    {r.candidateProfileImage ? (
                      <Image
                        src={r.candidateProfileImage}
                        alt={r.candidateName}
                        width={32}
                        height={32}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <span className="text-primary font-bold text-xs">{r.candidateName.charAt(0)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-semibold text-foreground">{r.candidateName}</span>
                      <span
                        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] font-medium border ${cfg.bg} ${cfg.color} ${cfg.border}`}
                      >
                        {cfg.emoji} {cfg.label}
                      </span>
                    </div>
                    <time className="text-[10px] text-muted">{relativeTime(r.createdAt)}</time>
                  </div>
                </div>
                <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap pl-10">
                  {r.content}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Candidate answer button / form */}
      {isCandidate && !showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="mt-2 text-xs font-medium text-primary hover:underline"
        >
          {myResponse ? "✏️ 답변 수정하기" : "💬 후보자 답변 달기"}
        </button>
      )}

      {isCandidate && showForm && (
        <form onSubmit={handleSubmit} className="mt-3 space-y-2.5 p-3 rounded-xl border border-primary/30 bg-primary/5">
          <p className="text-xs font-semibold text-foreground">후보자 공식 답변</p>

          {/* Status selector */}
          <div className="flex flex-wrap gap-1.5">
            {VALID_STATUSES.map((s) => {
              const cfg = STATUS_CONFIG[s]!;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                    status === s
                      ? `${cfg.bg} ${cfg.color} ${cfg.border}`
                      : "bg-background text-muted border-border hover:text-foreground"
                  }`}
                >
                  {cfg.emoji} {cfg.label}
                </button>
              );
            })}
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="제보/제안에 대한 공식 답변을 입력하세요..."
            maxLength={2000}
            rows={4}
            className="w-full text-sm px-3 py-2 rounded-lg border border-border bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-muted">{content.length}/2000</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setShowForm(false); setError(""); }}
                className="px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={submitting || !content.trim()}
                className="px-3 py-1.5 text-xs font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {submitting ? "등록 중..." : myResponse ? "수정하기" : "답변 등록"}
              </button>
            </div>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </form>
      )}
    </div>
  );
}

/** Compact status badge for list view */
export function ResponseStatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status];
  if (!cfg) return null;
  return (
    <span
      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] font-medium border ${cfg.bg} ${cfg.color} ${cfg.border}`}
    >
      {cfg.emoji} {cfg.label}
    </span>
  );
}
