"use client";

import { useEffect, useState } from "react";

interface Props {
  candidateId: string;
}

export default function CandidateLikeButton({ candidateId }: Props) {
  const [likeCount, setLikeCount] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    fetch(`/api/candidates/${candidateId}/like`)
      .then((r) => r.json())
      .then((json) => {
        setLikeCount(json.likeCount ?? 0);
        setHasLiked(json.hasLiked ?? false);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [candidateId]);

  const handleClick = async () => {
    if (pending) return;
    // Optimistic update
    const nextLiked = !hasLiked;
    const nextCount = likeCount + (nextLiked ? 1 : -1);
    setHasLiked(nextLiked);
    setLikeCount(nextCount);
    setPending(true);
    try {
      const res = await fetch(`/api/candidates/${candidateId}/like`, {
        method: "POST",
      });
      const json = await res.json();
      if (res.ok) {
        setLikeCount(json.likeCount ?? nextCount);
        setHasLiked(json.hasLiked ?? nextLiked);
      } else {
        // Revert on error
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

  if (loading) return null;

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
        hasLiked
          ? "bg-red-500 text-white hover:bg-red-600"
          : "bg-white/20 text-white hover:bg-white/30"
      }`}
      aria-label="응원하기"
    >
      <svg
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
      <span>응원하기 ({likeCount})</span>
    </button>
  );
}
