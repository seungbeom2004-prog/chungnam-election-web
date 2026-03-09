"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

const DISMISS_KEY = "cute-invite-dismissed";

/**
 * Floating invitation box shown on the regular page.
 * Entices users to try the cute layout mode.
 * Dismissible — hides permanently once closed.
 * Appears after 3 seconds so it doesn't block the initial map experience.
 */
export default function CuteInviteBox() {
  const [visible, setVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY) === "true") return;
    } catch {
      return; // private browsing — don't show
    }
    const timer = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, "true");
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 bg-white rounded-2xl shadow-2xl border-2 border-pink-200 p-4 max-w-[280px] animate-slideUp">
      {/* Close button */}
      <button
        onClick={dismiss}
        className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors text-sm"
        aria-label="닫기"
      >
        ✕
      </button>

      {/* Mascot image — graceful fallback if image doesn't exist yet */}
      <div className="flex justify-center">
        <Image
          src="/themes/cute/images/mascot-invite.png"
          width={80}
          height={80}
          alt="귀여운 모드 마스코트"
          className="mx-auto"
          onError={(e) => {
            // Hide image if file doesn't exist yet
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      </div>

      {/* Text */}
      <p className="text-center text-sm font-semibold mt-2 text-purple-700">
        귀여운 모드를 체험해보세요! ✨
      </p>
      <p className="text-center text-xs text-gray-500 mt-1">
        지도를 더 재미있게 둘러볼 수 있어요
      </p>

      {/* CTA */}
      <button
        onClick={() => router.push("/cute")}
        className="w-full mt-3 py-2 rounded-full bg-pink-400 text-white text-sm font-bold hover:bg-pink-500 transition-colors"
      >
        귀여운 모드로 전환 →
      </button>
    </div>
  );
}
