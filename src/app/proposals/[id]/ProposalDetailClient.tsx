"use client";

import { useState } from "react";
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
  const [likeCount, setLikeCount] = useState<number | null>(null);
  const [hasLiked, setHasLiked] = useState(false);
  const [likePending, setLikePending] = useState(false);
  const [shared, setShared] = useState(false);

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
      </div>

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
