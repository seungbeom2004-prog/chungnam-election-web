"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Kakao?: any;
  }
}

interface KakaoShareButtonProps {
  title: string;
  description?: string;
  imageUrl?: string;
  shareUrl: string;
  /** Optional extra label shown inside the button */
  label?: string;
  className?: string;
}

/**
 * Kakao 링크 공유 버튼.
 * NEXT_PUBLIC_KAKAO_APP_KEY 환경변수가 없으면 렌더링하지 않음.
 */
export default function KakaoShareButton({
  title,
  description,
  imageUrl,
  shareUrl,
  label = "카카오톡",
  className = "",
}: KakaoShareButtonProps) {
  const appKey = process.env.NEXT_PUBLIC_KAKAO_APP_KEY;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!appKey) return;

    // Wait for Kakao SDK to load then init once
    const tryInit = () => {
      if (window.Kakao && !initialized.current) {
        if (!window.Kakao.isInitialized()) {
          window.Kakao.init(appKey);
        }
        initialized.current = true;
      }
    };

    tryInit();
    // Retry until SDK loads (it's lazyOnload)
    const interval = setInterval(() => {
      if (window.Kakao) {
        tryInit();
        clearInterval(interval);
      }
    }, 300);

    return () => clearInterval(interval);
  }, [appKey]);

  if (!appKey) return null;

  const handleShare = () => {
    if (!window.Kakao?.isInitialized()) return;

    const content: Record<string, unknown> = {
      title,
      link: {
        mobileWebUrl: shareUrl,
        webUrl: shareUrl,
      },
    };

    if (description) content.description = description;
    if (imageUrl) {
      content.imageUrl = imageUrl;
      content.imageWidth = 800;
      content.imageHeight = 400;
    }

    window.Kakao.Share.sendDefault({
      objectType: "feed",
      content,
      buttons: [
        {
          title: "자세히 보기",
          link: {
            mobileWebUrl: shareUrl,
            webUrl: shareUrl,
          },
        },
      ],
    });
  };

  return (
    <button
      ref={buttonRef}
      onClick={handleShare}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${className}`}
      style={{ backgroundColor: "#FEE500", color: "#3C1E1E" }}
      aria-label="카카오톡으로 공유"
    >
      {/* Kakao logo */}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="#3C1E1E" aria-hidden="true">
        <path d="M12 3C6.477 3 2 6.477 2 10.9c0 2.794 1.687 5.248 4.25 6.77l-1.08 3.987c-.097.358.293.647.605.44L10.4 19.13A11.8 11.8 0 0012 19.2c5.523 0 10-3.477 10-7.8S17.523 3 12 3z"/>
      </svg>
      {label}
    </button>
  );
}
