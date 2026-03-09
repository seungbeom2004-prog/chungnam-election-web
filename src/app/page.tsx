"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Root page — redirects to /regular or /cute based on stored preference.
 * The actual map content lives in MapPageContent, rendered by the route pages.
 */
export default function RootRedirect() {
  const router = useRouter();

  useEffect(() => {
    let target = "/regular";
    try {
      const stored = localStorage.getItem("theme-mode");
      if (stored === "cute") target = "/cute";
    } catch {
      // SSR or private browsing — default to regular
    }
    router.replace(target);
  }, [router]);

  // Brief loading spinner while redirecting
  return (
    <div className="w-full h-[calc(100vh-3.5rem)] flex items-center justify-center">
      <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
