"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

const BUBBLE_KEY = "cute-bubble-dismissed";

/**
 * Decorative mascot overlay on the cute map page.
 * - 캐릭터 이미지: 항상 표시 (닫기 불가)
 * - 말풍선: X 버튼으로 닫기 가능 (localStorage에 저장)
 * pointer-events-none on container so it doesn't block map interaction.
 */
export default function CuteMascot() {
  const [bubbleVisible, setBubbleVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(BUBBLE_KEY)) {
        setBubbleVisible(true);
      }
    } catch {
      // private browsing — skip bubble
    }
  }, []);

  const dismissBubble = () => {
    setBubbleVisible(false);
    try {
      localStorage.setItem(BUBBLE_KEY, "1");
    } catch {
      // ignore
    }
  };

  const showBubble = () => {
    setBubbleVisible(true);
  };

  return (
    <div
      className="fixed right-4 z-50 pointer-events-none select-none"
      style={{
        maxWidth: 260,
        bottom: "calc(3.5rem + 1rem + env(safe-area-inset-bottom))",
      }}
    >
      {/* Speech bubble — dismissible */}
      {bubbleVisible && (
        <div className="pointer-events-auto bg-white/95 backdrop-blur-sm rounded-2xl px-4 py-3 mb-2 shadow-lg border-2 border-pink-200 relative">
          <button
            onClick={dismissBubble}
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-pink-100 text-pink-500 flex items-center justify-content-center text-xs hover:bg-pink-200 transition-colors"
            aria-label="닫기"
          >
            ✕
          </button>
          <p className="text-sm font-semibold text-purple-700 leading-snug">
            아이콘들을 눌러서
            <br />
            공약들을 확인해봐! 💕
          </p>
          {/* Speech bubble tail */}
          <div
            className="absolute -bottom-2 right-8 w-0 h-0"
            style={{
              borderLeft: "8px solid transparent",
              borderRight: "8px solid transparent",
              borderTop: "8px solid white",
            }}
          />
        </div>
      )}

      {/* Mascot image — always visible, click to re-show bubble */}
      <div className="pointer-events-auto flex justify-end">
        <button
          onClick={showBubble}
          className="focus:outline-none"
          aria-label="말풍선 보기"
          title="클릭해서 말풍선 보기"
        >
          <Image
            src="/themes/cute/images/mascot.png"
            width={120}
            height={160}
            alt="마스코트"
            className="drop-shadow-lg hover:scale-105 transition-transform cursor-pointer"
            onError={(e) => {
              // Fallback: show a large emoji if image not available
              const el = e.target as HTMLImageElement;
              el.style.display = "none";
              const fallback = document.createElement("span");
              fallback.textContent = "🐯";
              fallback.style.fontSize = "80px";
              el.parentElement?.appendChild(fallback);
            }}
          />
        </button>
      </div>
    </div>
  );
}
