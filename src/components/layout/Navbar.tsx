"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useUITexts } from "@/hooks/useUITexts";
import { useTheme } from "@/contexts/ThemeContext";
import UserProfileButton from "@/components/layout/UserProfileButton";

// 2026년 지방선거일: 6월 3일(수) — 짝수 해 6월 첫째 수요일
const ELECTION_DATE = new Date("2026-06-03T00:00:00+09:00");

function ElectionDDay() {
  const [dday, setDday] = useState<number | null>(null);

  useEffect(() => {
    const calc = () => {
      const now = new Date();
      const diff = ELECTION_DATE.getTime() - now.getTime();
      setDday(Math.ceil(diff / (1000 * 60 * 60 * 24)));
    };
    calc();
    const timer = setInterval(calc, 60_000);
    return () => clearInterval(timer);
  }, []);

  if (dday === null) return null;

  const label =
    dday > 0
      ? `D-${dday}`
      : dday === 0
      ? "D-Day"
      : `D+${Math.abs(dday)}`;

  const isUrgent = dday >= 0 && dday <= 30;

  return (
    <Link
      href="/about"
      title="2026 전국동시지방선거"
      className={`shrink-0 hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
        isUrgent
          ? "bg-red-500 text-white border-red-500 animate-pulse"
          : "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
      }`}
    >
      <span>🗳️</span>
      <span>지방선거 {label}</span>
    </Link>
  );
}

/** Persistent font-size scaler stored in localStorage. */
function FontSizeControl() {
  const [scale, setScale] = useState(1.0);

  useEffect(() => {
    const saved = parseFloat(localStorage.getItem("fontScale") ?? "1");
    const valid = isNaN(saved) ? 1 : Math.max(0.8, Math.min(1.3, saved));
    setScale(valid);
    document.documentElement.style.fontSize = `${valid * 16}px`;
  }, []);

  const applyScale = (next: number) => {
    const clamped = Math.max(0.8, Math.min(1.3, next));
    setScale(clamped);
    localStorage.setItem("fontScale", String(clamped));
    document.documentElement.style.fontSize = `${clamped * 16}px`;
  };

  return (
    <div className="flex items-center border border-border rounded-lg overflow-hidden shrink-0" title="글씨 크기">
      <button
        onClick={() => applyScale(scale - 0.1)}
        disabled={scale <= 0.8}
        className="px-2 py-1 text-xs font-medium text-muted hover:bg-background transition-colors disabled:opacity-30"
        aria-label="글씨 작게"
      >
        A-
      </button>
      <div className="w-px h-4 bg-border" />
      <button
        onClick={() => applyScale(scale + 0.1)}
        disabled={scale >= 1.3}
        className="px-2 py-1 text-xs font-semibold text-muted hover:bg-background transition-colors disabled:opacity-30"
        aria-label="글씨 크게"
      >
        A+
      </button>
    </div>
  );
}

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [cuteLogoError, setCuteLogoError] = useState(false);
  const t = useUITexts();
  const { isCute, setTheme } = useTheme();

  const handleThemeToggle = () => {
    const next = isCute ? "regular" : "cute";
    if (next === "cute") setCuteLogoError(false);
    setTheme(next);
    router.push(`/${next}`);
  };

  return (
    <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur-sm border-b border-border">
      <div className="max-w-screen-xl mx-auto px-4 h-14 flex items-center gap-3">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          {isCute ? (
            <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center bg-pink-100">
              {cuteLogoError ? (
                <span className="text-pink-500 font-bold text-sm">개혁</span>
              ) : (
                <Image
                  src="/themes/cute/images/logo-cute.png"
                  width={32}
                  height={32}
                  alt="개혁"
                  onError={() => setCuteLogoError(true)}
                />
              )}
            </div>
          ) : (
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">개혁</span>
            </div>
          )}
          <span className="hidden sm:block font-semibold text-foreground">{t.logoSubText}</span>
        </Link>

        {/* Navigation links — hidden overflow on tiny screens */}
        <nav className="flex-1 flex items-center gap-1 sm:gap-3 min-w-0 overflow-x-auto no-scrollbar" aria-label="주요 메뉴">
          <Link
            href="/"
            className={`shrink-0 text-xs font-medium transition-colors px-1 py-0.5 rounded ${
              pathname === "/" || pathname === "/regular" || pathname === "/cute"
                ? "text-primary"
                : "text-muted hover:text-foreground"
            }`}
            aria-current={pathname === "/" || pathname === "/regular" || pathname === "/cute" ? "page" : undefined}
          >
            {t.navMapLink}
          </Link>
          <Link
            href="/proposals"
            className={`shrink-0 text-xs font-medium transition-colors px-1 py-0.5 rounded ${
              pathname.startsWith("/proposals")
                ? "text-primary"
                : "text-muted hover:text-foreground"
            }`}
            aria-current={pathname.startsWith("/proposals") ? "page" : undefined}
          >
            제안 게시판
          </Link>
          <Link
            href="/pledges"
            className={`shrink-0 text-xs font-medium transition-colors px-1 py-0.5 rounded ${
              pathname.startsWith("/pledges")
                ? "text-primary"
                : "text-muted hover:text-foreground"
            }`}
            aria-current={pathname.startsWith("/pledges") ? "page" : undefined}
          >
            공약 목록
          </Link>
          <Link
            href="/about"
            className={`shrink-0 text-xs font-medium transition-colors px-1 py-0.5 rounded ${
              pathname.startsWith("/about")
                ? "text-primary"
                : "text-muted hover:text-foreground"
            }`}
            aria-current={pathname.startsWith("/about") ? "page" : undefined}
          >
            후보자 소개
          </Link>
        </nav>

        {/* D-Day counter */}
        <ElectionDDay />

        {/* Font size controls — hidden on smallest phones to prevent overflow */}
        <div className="shrink-0">
          <FontSizeControl />
        </div>

        {/* Theme toggle — desktop only */}
        <button
          onClick={handleThemeToggle}
          className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border transition-colors shrink-0 ${
            isCute
              ? "border-pink-300 bg-pink-50 text-pink-600 hover:bg-pink-100"
              : "border-border bg-background text-muted hover:text-foreground hover:bg-border/50"
          }`}
        >
          {isCute ? "🏛️ 일반 모드" : "✨ 귀여운 모드"}
        </button>

        {/* Auth Button */}
        {session ? (
          <UserProfileButton />
        ) : (
          <Link
            href="/login"
            className="shrink-0 px-3 py-1.5 text-xs font-medium text-foreground border border-border rounded-lg hover:bg-background transition-colors"
          >
            {t.navLoginButton}
          </Link>
        )}
      </div>
    </header>
  );
}
