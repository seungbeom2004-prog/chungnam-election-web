"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Root page — redirects to /regular or /cute based on stored preference.
 * Preserves ?pledge=ID query param for pledge deep-linking.
 */
function RootRedirectInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    let target = "/regular";
    try {
      const stored = localStorage.getItem("theme-mode");
      if (stored === "cute") target = "/cute";
    } catch {
      // SSR or private browsing — default to regular
    }
    const pledgeId = searchParams.get("pledge");
    if (pledgeId) target += `?pledge=${encodeURIComponent(pledgeId)}`;
    router.replace(target);
  }, [router, searchParams]);

  return (
    <div className="w-full h-[calc(100vh-3.5rem)] flex items-center justify-center">
      <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function RootRedirect() {
  return (
    <Suspense fallback={
      <div className="w-full h-[calc(100vh-3.5rem)] flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <RootRedirectInner />
    </Suspense>
  );
}
