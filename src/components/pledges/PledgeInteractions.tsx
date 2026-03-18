"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { useSession } from "next-auth/react";
import type { PledgeComment } from "@/types";

// ─── Helpers ────────────────────────────────────────────────────────────────

const relativeTime = (date: string) => {
  const d = new Date(date);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
};

// ─── Comment Item ────────────────────────────────────────────────────────────

function CommentItem({
  comment: c,
  deletingId,
  deletePassword,
  deleteError,
  onDeleteStart,
  onDeleteCancel,
  onDeleteConfirm,
  onPasswordChange,
}: {
  comment: PledgeComment;
  deletingId: string | null;
  deletePassword: string;
  deleteError: string | null;
  onDeleteStart: (id: string) => void;
  onDeleteCancel: () => void;
  onDeleteConfirm: () => void;
  onPasswordChange: (v: string) => void;
}) {
  const isCandidate = !!c.candidateId;
  const isDeleting = deletingId === c.id;
  return (
    <div className={`p-3 border rounded-xl ${isCandidate ? "bg-primary/5 border-primary/20" : "bg-surface border-border"}`}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-foreground">{c.authorName}</span>
          {isCandidate && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white bg-primary">🏛️ 후보자</span>
          )}
          <time className="text-[11px] text-muted">{relativeTime(c.createdAt)}</time>
        </div>
        {isDeleting ? (
          <div className="flex items-center gap-1.5">
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => onPasswordChange(e.target.value)}
              placeholder="비밀번호"
              className="w-24 px-2 py-1 text-xs border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-red-300"
            />
            <button onClick={onDeleteConfirm} className="text-xs px-2 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">확인</button>
            <button onClick={onDeleteCancel} className="text-xs px-2 py-1 border border-border rounded-lg text-muted hover:text-foreground transition-colors">취소</button>
          </div>
        ) : (
          <button onClick={() => onDeleteStart(c.id)} className="text-[11px] text-muted hover:text-red-500 transition-colors">삭제</button>
        )}
      </div>
      {isDeleting && deleteError && (
        <p className="text-xs text-red-500 mb-1">{deleteError}</p>
      )}
      <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{c.content}</p>
    </div>
  );
}

// ─── Like Button ─────────────────────────────────────────────────────────────

interface LikeButtonProps {
  pledgeId: string;
  isCute?: boolean;
}

export function PledgeLikeButton({ pledgeId, isCute }: LikeButtonProps) {
  const [likeCount, setLikeCount] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [pending, setPending] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`/api/pledges/${pledgeId}/like`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setLikeCount(d.data.likeCount ?? 0);
          setHasLiked(d.data.hasLiked ?? false);
          setLoaded(true);
        }
      })
      .catch(() => setLoaded(true));
  }, [pledgeId]);

  const toggle = async () => {
    if (pending) return;
    const nextLiked = !hasLiked;
    const nextCount = likeCount + (nextLiked ? 1 : -1);
    setHasLiked(nextLiked);
    setLikeCount(nextCount);
    setPending(true);
    try {
      const r = await fetch(`/api/pledges/${pledgeId}/like`, { method: "POST" });
      const d = await r.json();
      if (r.ok) {
        setHasLiked(d.data?.hasLiked ?? nextLiked);
        setLikeCount(d.data?.likeCount ?? nextCount);
      } else {
        setHasLiked(!nextLiked);
        setLikeCount(likeCount);
      }
    } catch {
      setHasLiked(!nextLiked);
      setLikeCount(likeCount);
    } finally {
      setPending(false);
    }
  };

  if (!loaded) return null;

  const accentColor = isCute ? "#FF6B9D" : "#FF5A00";

  return (
    <button
      onClick={toggle}
      disabled={pending}
      title={hasLiked ? "좋아요 취소" : "좋아요"}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border transition-all ${
        hasLiked
          ? "text-white border-transparent scale-105"
          : "bg-background text-muted border-border hover:scale-105"
      } disabled:opacity-60`}
      style={
        hasLiked
          ? { backgroundColor: accentColor, borderColor: accentColor }
          : {}
      }
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill={hasLiked ? "currentColor" : "none"}
        stroke={hasLiked ? "currentColor" : accentColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
      <span>{likeCount > 0 ? `좋아요 ${likeCount}` : "좋아요"}</span>
    </button>
  );
}

// ─── Comments Section ─────────────────────────────────────────────────────────

interface CommentsProps {
  pledgeId: string;
  isCute?: boolean;
  onCountChange?: (count: number) => void;
}

const siteKey =
  typeof process !== "undefined"
    ? (process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "6LeAGYosAAAAAK164nVrXIvD6s5d86YxeJRAC95Z")
    : "6LeAGYosAAAAAK164nVrXIvD6s5d86YxeJRAC95Z";

export function PledgeComments({ pledgeId, isCute, onCountChange }: CommentsProps) {
  const { data: session } = useSession();
  const sessionUser = session
    ? {
        id: (session.user as { id?: string })?.id ?? null,
        name: session.user?.name ?? null,
      }
    : null;

  const [comments, setComments] = useState<PledgeComment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);
  // Form fields (only used for non-candidate / guest users)
  const [authorName, setAuthorName] = useState("");
  const [password, setPassword] = useState("");
  const [content, setContent] = useState("");
  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const recaptchaRef = useRef<ReCAPTCHA>(null);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/pledges/${pledgeId}/comments?limit=50`);
      const d = await r.json();
      const newTotal = d.total ?? 0;
      setComments(d.data ?? []);
      setTotal(newTotal);
      onCountChange?.(newTotal);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [pledgeId]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    let body: Record<string, string>;

    if (sessionUser) {
      // Logged-in candidate: no CAPTCHA or password needed
      body = { content };
    } else {
      const captchaToken = recaptchaRef.current?.getValue();
      if (!captchaToken) {
        setFormError("보안 문자를 완료해주세요.");
        return;
      }
      body = { content, authorName, password, captchaToken };
    }

    setSubmitting(true);
    try {
      const r = await fetch(`/api/pledges/${pledgeId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (r.status === 429) { setFormError("잠시 후 다시 시도해주세요."); recaptchaRef.current?.reset(); return; }
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setFormError(j.error ?? "댓글 작성에 실패했습니다.");
        recaptchaRef.current?.reset();
        return;
      }
      setFormSuccess(true);
      setAuthorName(""); setPassword(""); setContent("");
      recaptchaRef.current?.reset();
      fetchComments();
    } catch {
      setFormError("네트워크 오류가 발생했습니다.");
      recaptchaRef.current?.reset();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    setDeleteError(null);
    if (!deletePassword) { setDeleteError("비밀번호를 입력해주세요."); return; }
    try {
      const r = await fetch(`/api/pledges/${pledgeId}/comments/${commentId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setDeleteError(j.error ?? "삭제에 실패했습니다.");
        return;
      }
      setDeletingId(null);
      setDeletePassword("");
      fetchComments();
    } catch {
      setDeleteError("네트워크 오류가 발생했습니다.");
    }
  };

  const accent = isCute ? "#FF6B9D" : "#FF5A00";
  const MAX_CONTENT = 300;

  return (
    <div className="mt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-foreground">
          💬 댓글 {total > 0 ? `(${total})` : ""}
        </h4>
        <button
          onClick={() => { setShowForm((v) => !v); setFormSuccess(false); setFormError(null); }}
          className="text-xs font-medium px-2.5 py-1 rounded-full border border-border hover:border-primary/40 text-muted hover:text-foreground transition-colors"
        >
          {showForm ? "닫기" : "댓글 달기"}
        </button>
      </div>

      {/* Comment Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-4 p-3 bg-surface border border-border rounded-xl space-y-2.5"
        >
          {formSuccess ? (
            <div className="text-center py-2">
              <p className="text-sm font-medium text-foreground">댓글이 등록되었습니다!</p>
              <button
                type="button"
                onClick={() => setFormSuccess(false)}
                className="mt-1 text-xs text-primary hover:underline"
              >
                추가 댓글 달기
              </button>
            </div>
          ) : sessionUser ? (
            /* ── 후보자 로그인 상태: 간소화 폼 ── */
            <>
              <div className="flex items-center gap-2 px-1">
                <span className="text-xs font-semibold text-foreground">{sessionUser.name}</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white bg-primary">🏛️ 후보자</span>
                <span className="text-[10px] text-muted">로그인 상태</span>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-foreground">내용 *</label>
                  <span className={`text-xs ${content.length > MAX_CONTENT ? "text-red-500" : "text-muted"}`}>
                    {content.length}/{MAX_CONTENT}
                  </span>
                </div>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="이 공약에 대한 의견을 남겨주세요."
                  minLength={2}
                  maxLength={MAX_CONTENT}
                  rows={3}
                  required
                  className="w-full px-2.5 py-1.5 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors resize-none"
                />
              </div>
              {formError && <p className="text-xs text-red-500">{formError}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-60"
                style={{ backgroundColor: accent }}
              >
                {submitting ? "등록 중..." : "댓글 등록"}
              </button>
            </>
          ) : (
            /* ── 비로그인 방문자: 기존 폼 ── */
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">이름 *</label>
                  <input
                    type="text"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="홍길동"
                    minLength={2}
                    maxLength={20}
                    required
                    className="w-full px-2.5 py-1.5 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">비밀번호 * <span className="text-muted font-normal">(삭제용)</span></label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="4~20자"
                    minLength={4}
                    maxLength={20}
                    required
                    className="w-full px-2.5 py-1.5 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-foreground">내용 *</label>
                  <span className={`text-xs ${content.length > MAX_CONTENT ? "text-red-500" : "text-muted"}`}>
                    {content.length}/{MAX_CONTENT}
                  </span>
                </div>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="이 공약에 대한 의견을 남겨주세요."
                  minLength={2}
                  maxLength={MAX_CONTENT}
                  rows={3}
                  required
                  className="w-full px-2.5 py-1.5 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors resize-none"
                />
              </div>
              <div className="flex justify-center">
                <ReCAPTCHA ref={recaptchaRef} sitekey={siteKey} size="compact" />
              </div>
              {formError && <p className="text-xs text-red-500">{formError}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-60"
                style={{ backgroundColor: accent }}
              >
                {submitting ? "등록 중..." : "댓글 등록"}
              </button>
            </>
          )}
        </form>
      )}

      {/* Comment list */}
      {loading ? (
        <div className="flex justify-center py-4">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-xs text-muted text-center py-4">첫 번째 댓글을 남겨보세요!</p>
      ) : (
        <div className="space-y-2.5">
          {comments.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              deletingId={deletingId}
              deletePassword={deletePassword}
              deleteError={deleteError}
              onDeleteStart={(id) => { setDeletingId(id); setDeletePassword(""); setDeleteError(null); }}
              onDeleteCancel={() => { setDeletingId(null); setDeletePassword(""); setDeleteError(null); }}
              onDeleteConfirm={() => handleDelete(c.id)}
              onPasswordChange={(v) => { setDeletePassword(v); setDeleteError(null); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
