"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Sample rate: track 30% of page views.
// Analytics remain accurate at scale (±5%), CPU & DB write load drops 70%.
const SAMPLE_RATE = 0.3;

export default function PageTracker() {
  const pathname = usePathname();

  useEffect(() => {
    // Probabilistic sampling — skip ~70% of hits
    if (Math.random() > SAMPLE_RATE) return;

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
