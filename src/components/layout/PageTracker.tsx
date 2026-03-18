"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function PageTracker() {
  const pathname = usePathname();

  useEffect(() => {
    let city: string | null = null;
    try { city = localStorage.getItem("mapLastCity"); } catch {}
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname, referrer: document.referrer || null, city: city || null }),
    }).catch(() => {});
  }, [pathname]);

  return null;
}
