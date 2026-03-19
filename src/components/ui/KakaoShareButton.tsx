"use client";

import { useEffect, useRef, useState } from "react";

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
 * SDK를 직접 동적으로 로드하고 onload 후 초기화 — 버튼은 준비 전까지 비활성.
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
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (!appKey) return;

    const tryInit = () => {
      if (initialized.current) {
        setReady(true);
        return;
      }
      try {
        if (window.Kakao && !window.Kakao.isInitialized()) {
          window.Kakao.init(appKey);
        }
        initialized.current = true;
        setReady(true);
      } catch (e) {
        console.error("[KakaoShareButton] init 실패", e);
        // init이 실패해도 setReady(true) — 이미 initialized인 경우 등
        initialized.current = true;
        setReady(true);
      }
    };

    // 1) SDK가 이미 로드된 경우 (동일 페이지 내 다른 인스턴스, hot-reload 등)
    if (window.Kakao) {
      tryInit();
      return;
    }

    const handleLoad = () => tryInit();
    const handleError = () => {
      console.error("[KakaoShareButton] SDK 로드 실패");
      setFailed(true);
    };

    // 2) 다른 인스턴스가 이미 스크립트 태그를 삽입한 경우
    const existing = document.querySelector<HTMLScriptElement>(
      "script[data-kakao-sdk]"
    );
    if (existing) {
      existing.addEventListener("load", handleLoad, { once: true });
      existing.addEventListener("error", handleError, { once: true });
      // ★ 핵심 fix: 리스너 붙인 직후 이미 로드 완료됐을 수 있음 (preload 경쟁 조건)
      if (window.Kakao) tryInit();
      return () => {
        existing.removeEventListener("load", handleLoad);
        existing.removeEventListener("error", handleError);
      };
    }

    // 3) 직접 스크립트 삽입
    const script = document.createElement("script");
    script.src =
      "https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js";
    script.async = true;
    script.setAttribute("data-kakao-sdk", "true");
    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener("error", handleError, { once: true });
    document.head.appendChild(script);

    return () => {
      script.removeEventListener("load", handleLoad);
      script.removeEventListener("error", handleError);
    };
  }, [appKey]);

  // 앱키 없거나 SDK 로드 실패 시 버튼 숨김
  if (!appKey || failed) return null;

  const handleShare = () => {
    if (!ready || !window.Kakao?.isInitialized()) return;

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
      onClick={handleShare}
      disabled={!ready}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-wait ${className}`}
      style={{ backgroundColor: "#FEE500", color: "#3C1E1E" }}
      aria-label={ready ? "카카오톡으로 공유" : "카카오 SDK 로드 중"}
      title={ready ? undefined : "카카오톡 공유 준비 중..."}
    >
      {ready ? (
        /* Kakao logo */
        <svg width="14" height="14" viewBox="0 0 24 24" fill="#3C1E1E" aria-hidden="true">
          <path d="M12 3C6.477 3 2 6.477 2 10.9c0 2.794 1.687 5.248 4.25 6.77l-1.08 3.987c-.097.358.293.647.605.44L10.4 19.13A11.8 11.8 0 0012 19.2c5.523 0 10-3.477 10-7.8S17.523 3 12 3z"/>
        </svg>
      ) : (
        <span className="w-3.5 h-3.5 border-2 border-[#3C1E1E]/40 border-t-[#3C1E1E] rounded-full animate-spin inline-block" />
      )}
      {label}
    </button>
  );
}
