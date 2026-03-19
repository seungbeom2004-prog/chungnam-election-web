"use client";

import { useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";

/** Updates <meta name="theme-color"> dynamically when theme changes. */
export default function ThemeColorMeta() {
  const { isCute } = useTheme();

  useEffect(() => {
    const color = isCute ? "#EC4899" : "#F97316";
    // Update existing meta tag
    const existing = document.getElementById("theme-color-meta") as HTMLMetaElement | null;
    if (existing) {
      existing.content = color;
    } else {
      const meta = document.createElement("meta");
      meta.name = "theme-color";
      meta.content = color;
      meta.id = "theme-color-meta";
      document.head.appendChild(meta);
    }
  }, [isCute]);

  return null;
}
