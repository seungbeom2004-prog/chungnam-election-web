"use client";

import { useTheme } from "@/contexts/ThemeContext";
import { useRouter } from "next/navigation";
import { useMapStore } from "@/store/useMapStore";

/**
 * Mobile floating action button (FAB) for theme switching.
 * Desktop toggle lives in Navbar.tsx.
 * Uses fixed positioning so it stays above the PledgePanel bottom sheet.
 * When the pledge panel is open it shifts up above the panel (≈ 70 vh).
 */
export default function ThemeToggleFAB() {
  const { isCute, setTheme } = useTheme();
  const router = useRouter();
  const isPanelOpen = useMapStore((s) => s.isPanelOpen);

  const handleToggle = () => {
    const next = isCute ? "regular" : "cute";
    setTheme(next);          // apply immediately — don't wait for the route page's useEffect
    router.push(`/${next}`);
  };

  return (
    <button
      onClick={handleToggle}
      className={`md:hidden fixed left-4 z-50 w-12 h-12 rounded-full
        bg-white/95 backdrop-blur-sm border-2 border-primary shadow-lg
        flex items-center justify-center text-lg
        hover:scale-105 active:scale-95 transition-all duration-300
        ${isPanelOpen ? "bottom-[calc(70vh+4rem)]" : "bottom-36"}`}
      title={isCute ? "일반 모드로 전환" : "귀여운 모드로 전환"}
    >
      {isCute ? "🏛️" : "✨"}
    </button>
  );
}
