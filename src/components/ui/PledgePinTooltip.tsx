"use client";

import { useState, useEffect } from "react";

const TOOLTIP_KEY = "pledge-pin-hint-seen";

/**
 * First-interaction tooltip hint for pledge pins.
 * Appears briefly at the bottom center of the screen on first visit.
 */
export default function PledgePinTooltip() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(TOOLTIP_KEY)) {
        // Show after a 2-second delay
        const timer = setTimeout(() => setVisible(true), 2000);
        return () => clearTimeout(timer);
      }
    } catch {
      // private browsing
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    // Auto-hide after 5 seconds
    const timer = setTimeout(() => dismiss(), 5000);
    return () => clearTimeout(timer);
  }, [visible]);

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(TOOLTIP_KEY, "1");
    } catch {
      // ignore
    }
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 bg-gray-900/90 text-white text-sm font-medium px-4 py-2.5 rounded-full shadow-lg backdrop-blur-sm animate-bounce-gentle">
        <span>📍</span>
        <span>공약 핀을 클릭하면 자세한 내용을 볼 수 있어요!</span>
        <button
          onClick={(e) => { e.stopPropagation(); dismiss(); }}
          className="pointer-events-auto ml-1 opacity-60 hover:opacity-100 transition-opacity text-white"
          aria-label="닫기"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
