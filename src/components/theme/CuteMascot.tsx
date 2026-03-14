"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

/**
 * Decorative mascot overlay on the cute map page.
 * Shows a mascot character in the bottom-right with a speech bubble.
 * Tap to dismiss (session only — comes back on next visit).
 * pointer-events-none on container so it doesn't block map interaction.
 */
export default function CuteMascot() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('tooltipDismissed')) setVisible(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem('tooltipDismissed', '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-40 pointer-events-none select-none"
      style={{ maxWidth: 260 }}
    >
      {/* Speech bubble */}
      <div className="pointer-events-auto bg-white/95 backdrop-blur-sm rounded-2xl px-4 py-3 mb-2 shadow-lg border-2 border-pink-200 relative">
        <button
          onClick={dismiss}
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-pink-100 text-pink-500 flex items-center justify-center text-xs hover:bg-pink-200 transition-colors"
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

      {/* Mascot image — graceful fallback */}
      <div className="pointer-events-auto flex justify-end">
        <Image
          src="/themes/cute/images/mascot.png"
          width={120}
          height={160}
          alt="마스코트"
          className="drop-shadow-lg cursor-pointer hover:scale-105 transition-transform"
          onClick={dismiss}
          onError={(e) => {
            // Fallback: show a large emoji if image not available yet
            const el = e.target as HTMLImageElement;
            el.style.display = "none";
            const fallback = document.createElement("span");
            fallback.textContent = "🐯";
            fallback.style.fontSize = "80px";
            fallback.style.cursor = "pointer";
            el.parentElement?.appendChild(fallback);
            fallback.addEventListener("click", dismiss);
          }}
        />
      </div>
    </div>
  );
}
