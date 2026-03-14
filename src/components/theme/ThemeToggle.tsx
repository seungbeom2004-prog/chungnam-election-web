"use client";

import { useTheme } from "@/contexts/ThemeContext";
import { useRouter } from "next/navigation";

/**
 * Mobile floating action button (FAB) for theme switching.
 * Desktop toggle lives in Navbar.tsx.
 */
export default function ThemeToggleFAB() {
  const { isCute, setTheme } = useTheme();
  const router = useRouter();

  const handleToggle = () => {
    const next = isCute ? "regular" : "cute";
    setTheme(next);
    router.push(`/${next}`);
  };

  return (
    <button
      onClick={handleToggle}
      className="md:hidden fixed right-4 z-50 w-10 h-10 rounded-full
        bg-white/95 backdrop-blur-sm border-2 border-primary shadow-lg
        flex items-center justify-center text-base
        hover:scale-105 active:scale-95 transition-transform"
      style={{ top: "calc(3.5rem + 0.75rem)" }}
      title={isCute ? "일반 모드로 전환" : "귀여운 모드로 전환"}
      aria-label={isCute ? "일반 모드로 전환" : "귀여운 모드로 전환"}
    >
      {isCute ? "🏛️" : "✨"}
    </button>
  );
}
