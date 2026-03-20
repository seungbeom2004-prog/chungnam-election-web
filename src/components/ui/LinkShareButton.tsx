"use client";

import { useState } from "react";

interface LinkShareButtonProps {
  url?: string;
  label?: string;
  className?: string;
}

/**
 * 링크 복사 / Web Share API 공유 버튼.
 * 카카오 SDK 로딩 여부와 무관하게 즉시 동작.
 */
export default function LinkShareButton({
  url,
  label = "링크 공유",
  className = "",
}: LinkShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl = url ?? (typeof window !== "undefined" ? window.location.href : "");

  const handleShare = async () => {
    // Web Share API 지원 시 (모바일 등)
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ url: shareUrl });
        return;
      } catch {
        // 사용자가 취소하거나 실패하면 클립보드 복사로 폴백
      }
    }

    // 클립보드 복사
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 최후 폴백: prompt로 URL 표시
      window.prompt("링크를 복사하세요:", shareUrl);
    }
  };

  return (
    <button
      onClick={handleShare}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border text-muted hover:text-foreground hover:border-foreground/30 transition-colors ${className}`}
      aria-label={copied ? "링크가 복사되었습니다" : "링크 복사하기"}
      title={copied ? "복사됨!" : "링크 복사"}
    >
      {copied ? (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      )}
      {copied ? "복사됨!" : label}
    </button>
  );
}
