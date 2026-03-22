"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

interface Issue {
  id: string;
  title: string;
  city: string | null;
  reportCount: number;
}

interface CtaConfig {
  id: string;
  headline: string;
  subtext: string | null;
  targetPages: string[];
  triggerDelay: number;
  cooldownHours: number;
  maxShows: number;
  showIssues: boolean;
  ctaUrl: string;
  ctaLabel: string;
  issues?: Issue[];
}

function canShow(config: CtaConfig): boolean {
  try {
    const lastKey = `cta_last_${config.id}`;
    const countKey = `cta_count_${config.id}`;
    const showCount = parseInt(localStorage.getItem(countKey) ?? "0", 10);

    if (config.maxShows > 0 && showCount >= config.maxShows) return false;

    const lastShown = localStorage.getItem(lastKey);
    if (lastShown && config.cooldownHours > 0) {
      const hoursSince = (Date.now() - parseInt(lastShown, 10)) / 3_600_000;
      if (hoursSince < config.cooldownHours) return false;
    }

    return true;
  } catch {
    return true;
  }
}

function markShown(configId: string): void {
  try {
    const countKey = `cta_count_${configId}`;
    const lastKey = `cta_last_${configId}`;
    const count = parseInt(localStorage.getItem(countKey) ?? "0", 10);
    localStorage.setItem(countKey, String(count + 1));
    localStorage.setItem(lastKey, String(Date.now()));
  } catch {
    // ignore
  }
}

export default function CtaBanner() {
  const pathname = usePathname();
  const [config, setConfig] = useState<CtaConfig | null>(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const isExcluded =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/api");

  const handleDismiss = useCallback(() => {
    setVisible(false);
    setTimeout(() => setDismissed(true), 350);
  }, []);

  useEffect(() => {
    if (isExcluded) return;

    // Reset banner state on page change
    setConfig(null);
    setVisible(false);
    setDismissed(false);

    let timer: ReturnType<typeof setTimeout>;

    const init = async () => {
      try {
        const res = await fetch(
          `/api/cta/config?page=${encodeURIComponent(pathname)}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!data.config) return;

        const cfg: CtaConfig = data.config;
        if (!canShow(cfg)) return;

        timer = setTimeout(() => {
          setConfig(cfg);
          setVisible(true);
          markShown(cfg.id);
        }, cfg.triggerDelay * 1000);
      } catch {
        // silent fail
      }
    };

    init();
    return () => clearTimeout(timer);
  }, [pathname, isExcluded]);

  if (isExcluded || dismissed || !config) return null;

  return (
    <div
      role="dialog"
      aria-label="지역 이슈 안내"
      className={`fixed z-50 transition-all duration-300 ease-out
        bottom-[4.5rem] right-3 left-3
        md:bottom-6 md:right-5 md:left-auto md:w-80
        ${visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0 pointer-events-none"}`}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-orange-100 overflow-hidden">
        {/* Gradient Header */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 px-4 py-3 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl shrink-0">📢</span>
            <p className="text-white font-bold text-sm leading-snug">{config.headline}</p>
          </div>
          <button
            onClick={handleDismiss}
            aria-label="배너 닫기"
            className="shrink-0 mt-0.5 text-white/70 hover:text-white transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Issues list */}
        {config.showIssues && config.issues && config.issues.length > 0 && (
          <div className="px-4 pt-3 pb-1 space-y-1.5 max-h-36 overflow-y-auto">
            {config.issues.map((issue) => (
              <div key={issue.id} className="flex items-center gap-2 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
                <span className="text-gray-700 truncate flex-1">{issue.title}</span>
                {issue.city && (
                  <span className="text-gray-400 text-xs shrink-0">{issue.city}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Subtext + CTA Button */}
        <div className="px-4 pt-2 pb-4">
          {config.subtext && (
            <p className="text-gray-500 text-xs mb-3 leading-relaxed">{config.subtext}</p>
          )}
          <Link
            href={config.ctaUrl}
            onClick={handleDismiss}
            className="block w-full bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-center py-2.5 rounded-xl text-sm font-bold transition-colors"
          >
            {config.ctaLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
