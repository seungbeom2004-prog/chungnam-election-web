"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";

const PledgeProposalSection = dynamic(
  () => import("@/components/proposals/PledgeProposalSection"),
  { ssr: false }
);
const CandidateResponseSection = dynamic(
  () => import("@/components/proposals/CandidateResponseSection"),
  { ssr: false }
);

interface Post {
  id: string;
  title: string;
  content: string;
  authorName: string;
  postType: string | null;
  status: string;
  createdAt: string;
  latitude: number | null;
  longitude: number | null;
  candidateId: string | null;
  candidate: { id: string; name: string; district: string; profileImage: string | null; role?: string | null } | null;
}

interface Props {
  post: Post;
}

const relativeTime = (date: string) => {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return "방금 전";
  if (diff < 3600) return Math.floor(diff / 60) + "분 전";
  if (diff < 86400) return Math.floor(diff / 3600) + "시간 전";
  return Math.floor(diff / 86400) + "일 전";
};

export default function ProposalDetailClient({ post }: Props) {
  const searchParams = useSearchParams();
  const [likeCount, setLikeCount] = useState<number | null>(null);
  const [hasLiked, setHasLiked] = useState(false);
  const [likePending, setLikePending] = useState(false);
  const [shared, setShared] = useState(false);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Revision suggestion state
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [revisionAuthorName, setRevisionAuthorName] = useState("");
  const [revisionContent, setRevisionContent] = useState("");
  const [revisionSubmitting, setRevisionSubmitting] = useState(false);
  const [revisionError, setRevisionError] = useState<string | null>(null);
  const [revisionSuccess, setRevisionSuccess] = useState(false);
  const [revisions, setRevisions] = useState<{ id: string; candidateName: string; content: string; createdAt: string }[]>([]);
  const [revisionsLoading, setRevisionsLoading] = useState(false);

  // Fetch revisions on mount (for 제안 type)
  useEffect(() => {
    if (post.postType === "민원") return;
    setRevisionsLoading(true);
    fetch(`/api/proposals/${post.id}/revisions`)
      .then((r) => r.json())
      .then((json) => setRevisions(json.data ?? []))
      .catch(() => {})
      .finally(() => setRevisionsLoading(false));
  }, [post.id, post.postType]);

  // Auto-open revision form when ?revise=1
  useEffect(() => {
    if (searchParams.get("revise") === "1") {
      setShowRevisionForm(true);
    }
  }, [searchParams]);

  const typeLabel = post.postType === "민원" ? "불편 제보" : "공약 제안";
  const typeEmoji = post.postType === "민원" ? "📢" : "💡";

  const handleLike = async () => {
    if (likePending) return;
    const nextLiked = !hasLiked;
    const nextCount = (likeCount ?? 0) + (nextLiked ? 1 : -1);
    setHasLiked(nextLiked);
    setLikeCount(nextCount);
    setLikePending(true);
    try {
      const res = await fetch(`/api/proposals/${post.id}/like`, { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        setHasLiked(json.hasLiked ?? json.liked ?? nextLiked);
        setLikeCount(json.likeCount ?? nextCount);
      } else {
        setHasLiked(!nextLiked);
        setLikeCount(likeCount);
      }
    } catch {
      setHasLiked(!nextLiked);
      setLikeCount(likeCount);
    } finally {
      setLikePending(false);
    }
  };

  const handleDelete = async () => {
    setDeleteError(null);
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/proposals/${post.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      });
      const json = await res.json();
      if (!res.ok) {
        setDeleteError(json.error ?? "삭제에 실패했습니다.");
        return;
      }
      window.location.href = "/proposals";
    } catch {
      setDeleteError("네트워크 오류가 발생했습니다.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/proposals/${post.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: post.title || typeLabel, url });
        return;
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch {
      window.prompt("링크를 복사하세요:", url);
    }
  };

  return (
    <article className="bg-surface border border-border rounded-2xl p-6 space-y-5">
      {/* Header */}
      <div className="space-y-3">
        {/* Type badge */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
              post.postType === "민원"
                ? "bg-red-50 text-red-700 border border-red-200"
                : "bg-yellow-50 text-yellow-700 border border-yellow-200"
            }`}
          >
            {typeEmoji} {typeLabel}
          </span>
          {post.status === "accepted" && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
              ✅ 채택됨
            </span>
          )}
          {post.latitude && post.longitude && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
              📍 위치 첨부됨
            </span>
          )}
        </div>

        {/* Title */}
        {post.title && (
          <h1 className="text-xl font-bold text-foreground leading-snug">
            {post.title}
          </h1>
        )}

        {/* Author row */}
        <div className="flex items-center gap-2 flex-wrap">
          {post.candidateId && post.candidate && (post.candidate.role == null || post.candidate.role === "candidate") ? (
            <>
              <div className="w-8 h-8 rounded-full bg-primary/10 overflow-hidden shrink-0 flex items-center justify-center">
                {post.candidate.profileImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.candidate.profileImage}
                    alt={post.candidate.name}
                    width={32}
                    height={32}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <span className="text-primary font-bold text-xs">{post.candidate.name.charAt(0)}</span>
                )}
              </div>
              <span className="text-sm font-semibold text-blue-600">{post.candidate.name}</span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                후보자 작성
              </span>
              <span className="text-xs text-muted">{post.candidate.district}</span>
            </>
          ) : (
            <span className="text-sm font-medium text-muted">{post.authorName}</span>
          )}
          <time className="text-xs text-muted ml-auto" dateTime={post.createdAt}>
            {relativeTime(post.createdAt)}
          </time>
        </div>
      </div>

      {/* Divider */}
      <hr className="border-border" />

      {/* Content */}
      <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
        {post.content}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleLike}
          disabled={likePending}
          aria-label={hasLiked ? "좋아요 취소" : "좋아요"}
          aria-pressed={hasLiked}
          className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full border transition-all ${
            hasLiked
              ? "bg-red-50 text-red-500 border-red-200 hover:bg-red-100"
              : "bg-background text-muted border-border hover:text-foreground hover:bg-border/50"
          }`}
        >
          <svg
            aria-hidden="true"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill={hasLiked ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <span>{likeCount ?? 0}</span>
        </button>

        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full border border-border bg-background text-muted hover:text-foreground hover:bg-border/50 transition-all"
        >
          <svg
            aria-hidden="true"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/>
            <polyline points="16 6 12 2 8 6"/>
            <line x1="12" y1="2" x2="12" y2="15"/>
          </svg>
          <span>{shared ? "복사됨!" : "공유"}</span>
        </button>

        <button
          onClick={() => { setShowDeleteModal(true); setDeletePassword(""); setDeleteError(null); }}
          className="ml-auto flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full border border-red-200 bg-background text-red-400 hover:text-red-600 hover:bg-red-50 transition-all"
        >
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
          </svg>
          <span>삭제</span>
        </button>
      </div>

      {/* Delete modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 space-y-4">
            <h2 className="text-base font-bold text-foreground">게시글 삭제</h2>
            <p className="text-sm text-muted">작성 시 입력한 비밀번호를 입력하면 게시글이 삭제됩니다.</p>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleDelete(); }}
              placeholder="비밀번호"
              className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-red-400"
              autoFocus
            />
            {deleteError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{deleteError}</p>
            )}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm text-muted border border-border rounded-lg hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteLoading || !deletePassword}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-60 flex items-center gap-2"
              >
                {deleteLoading && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {deleteLoading ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revision Suggestion Section — for 제안 type */}
      {post.postType !== "민원" && (
        <div className="border-t border-border pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-violet-700 flex items-center gap-1.5">
              ✏️ 수정 제안
              {revisions.length > 0 && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 text-violet-700">
                  {revisions.length}
                </span>
              )}
            </p>
            <button
              onClick={() => setShowRevisionForm((v) => !v)}
              className="text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 px-3 py-1 rounded-full transition-colors"
            >
              {showRevisionForm ? "✕ 취소" : "✍️ 수정제안 하기"}
            </button>
          </div>

          {/* Existing revisions */}
          {revisionsLoading ? (
            <div className="flex justify-center py-2">
              <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : revisions.length > 0 ? (
            <div className="space-y-2">
              {revisions.map((r) => (
                <div key={r.id} className="bg-violet-50 border border-violet-200 rounded-xl px-3 py-2.5 text-xs">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-violet-800">{r.candidateName}</span>
                    <time className="text-muted ml-auto">{relativeTime(r.createdAt)}</time>
                  </div>
                  <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap">{r.content}</p>
                </div>
              ))}
            </div>
          ) : !showRevisionForm ? (
            <p className="text-xs text-muted text-center py-2">아직 수정 제안이 없습니다. 첫 번째 수정 제안을 남겨보세요!</p>
          ) : null}

          {/* Revision form */}
          {showRevisionForm && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setRevisionError(null);
                setRevisionSubmitting(true);
                try {
                  const res = await fetch(`/api/proposals/${post.id}/revisions`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ authorName: revisionAuthorName, content: revisionContent }),
                  });
                  const json = await res.json();
                  if (!res.ok) { setRevisionError(json.error ?? "등록에 실패했습니다."); return; }
                  setRevisionSuccess(true);
                  setRevisionContent("");
                  setShowRevisionForm(false);
                  // Refresh list
                  const updated = await fetch(`/api/proposals/${post.id}/revisions`).then(r => r.json());
                  setRevisions(updated.data ?? []);
                } catch {
                  setRevisionError("네트워크 오류가 발생했습니다.");
                } finally {
                  setRevisionSubmitting(false);
                }
              }}
              className="space-y-2.5 bg-violet-50 border border-violet-200 rounded-xl p-4"
            >
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">이름 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={revisionAuthorName}
                  onChange={(e) => setRevisionAuthorName(e.target.value)}
                  maxLength={30}
                  required
                  placeholder="작성자 이름"
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-violet-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">수정 제안 내용 <span className="text-red-500">*</span></label>
                <textarea
                  value={revisionContent}
                  onChange={(e) => setRevisionContent(e.target.value)}
                  maxLength={1000}
                  required
                  rows={4}
                  placeholder="이 공약 제안을 어떻게 수정하면 좋을지 구체적으로 작성해주세요..."
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-violet-400 resize-none"
                />
              </div>
              {revisionError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{revisionError}</p>
              )}
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowRevisionForm(false)}
                  className="px-4 py-2 text-sm text-muted border border-border rounded-lg hover:bg-background transition-colors">
                  취소
                </button>
                <button type="submit" disabled={revisionSubmitting}
                  className="px-4 py-2 text-sm font-semibold text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-60 flex items-center gap-2">
                  {revisionSubmitting && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {revisionSubmitting ? "등록 중..." : "수정제안 등록"}
                </button>
              </div>
            </form>
          )}

          {revisionSuccess && (
            <p className="text-xs text-violet-700 bg-violet-50 border border-violet-200 rounded-lg px-3 py-2 text-center">
              ✅ 수정 제안이 등록되었습니다. 감사합니다!
            </p>
          )}
        </div>
      )}

      {/* Pledge Proposal Section (민원 only) */}
      {post.postType === "민원" && (
        <PledgeProposalSection
          minwonId={post.id}
          minwonTitle={post.title || post.content.slice(0, 30)}
          isCandidate={false}
        />
      )}

      {/* Candidate Response Section */}
      <CandidateResponseSection proposalId={post.id} />
    </article>
  );
}
