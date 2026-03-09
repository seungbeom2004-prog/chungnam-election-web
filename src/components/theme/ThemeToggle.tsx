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
    setTheme(next);          // apply immediately — don't wait for the route page's useEffect
    router.push(`/${next}`);
  };

  return (
    <button
      onClick={handleToggle}
      className="md:hidden absolute bottom-20 left-4 z-30 w-12 h-12 rounded-full
        bg-white/95 backdrop-blur-sm border-2 border-primary shadow-lg
        flex items-center justify-center text-lg
        hover:scale-105 active:scale-95 transition-transform"
      title={isCute ? "일반 모드로 전환" : "귀여운 모드로 전환"}
    >
      {isCute ? "🏛️" : "✨"}
    </button>
  );
}
