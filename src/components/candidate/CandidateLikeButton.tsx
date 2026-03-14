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
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/candidates/${candidateId}/like`)
      .then((r) => r.json())
      .then((json) => {
        // Response shape: { success: true, data: { likeCount, hasLiked } }
        setLikeCount(json.data?.likeCount ?? 0);
        setHasLiked(json.data?.hasLiked ?? false);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [candidateId]);

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 4000);
  };

  const handleClick = async () => {
    if (pending || hasLiked) return;
    setPending(true);
    // Optimistic update
    setHasLiked(true);
    setLikeCount((c) => c + 1);
    try {
      const res = await fetch(`/api/candidates/${candidateId}/like`, {
        method: "POST",
      });
      const json = await res.json();

      if (res.ok) {
        // { success: true, data: { liked, likeCount } }
        setLikeCount(json.data?.likeCount ?? likeCount + 1);
        setHasLiked(true);
      } else if (res.status === 429) {
        // Daily limit hit — server says they've already liked today
        setHasLiked(true);
        setLikeCount((c) => c - 1); // revert the optimistic +1 (count didn't change)
        showNotice(json.message ?? "같은 후보자에게 응원은 하루에 한번만 할 수 있습니다.");
      } else {
        // Other error: revert
        setHasLiked(false);
        setLikeCount((c) => c - 1);
      }
    } catch {
      setHasLiked(false);
      setLikeCount((c) => c - 1);
    } finally {
      setPending(false);
    }
  };

  if (loading) return null;

  return (
    <div className="flex flex-col items-start gap-1.5">
      <button
        onClick={handleClick}
        disabled={pending || hasLiked}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
          hasLiked
            ? "bg-red-500 text-white cursor-default"
            : "bg-white/20 text-white hover:bg-white/30"
        }`}
        aria-label={hasLiked ? "이미 응원했습니다" : "응원하기"}
        title={hasLiked ? "이미 응원했습니다" : "응원하기"}
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
        <span>{hasLiked ? `응원 중 (${likeCount})` : `응원하기 (${likeCount})`}</span>
      </button>
      {notice && (
        <p className="text-xs text-white/80 bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-lg break-keep max-w-xs">
          {notice}
        </p>
      )}
    </div>
  );
}
