"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useUITexts } from "@/hooks/useUITexts";
import { useTheme } from "@/contexts/ThemeContext";
import UserProfileButton from "@/components/layout/UserProfileButton";

// 2026년 지방선거일: 6월 3일(수)
const ELECTION_DATE = new Date("2026-06-03T00:00:00+09:00");

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const IconMapPin = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const IconBulb = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="9" y1="18" x2="15" y2="18" />
    <line x1="10" y1="22" x2="14" y2="22" />
    <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
  </svg>
);

const IconClipboard = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    <line x1="9" y1="12" x2="15" y2="12" />
    <line x1="9" y1="16" x2="13" y2="16" />
  </svg>
);

const IconUsers = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const IconPerson = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
);

// ─── D-Day Badge ──────────────────────────────────────────────────────────────

function ElectionDDay({ compact = false }: { compact?: boolean }) {
  const [dday, setDday] = useState<number | null>(null);

  useEffect(() => {
    const calc = () => {
      const diff = ELECTION_DATE.getTime() - Date.now();
      setDday(Math.ceil(diff / (1000 * 60 * 60 * 24)));
    };
    calc();
    const t = setInterval(calc, 60_000);
    return () => clearInterval(t);
  }, []);

  if (dday === null) return null;
  const label = dday > 0 ? `D-${dday}` : dday === 0 ? "D-Day" : `D+${Math.abs(dday)}`;
  const isUrgent = dday >= 0 && dday <= 30;

  if (compact) {
    return (
      <Link
        href="/about"
        title="2026 전국동시지방선거"
        className={`flex items-center justify-center w-12 h-8 rounded-xl text-[9px] font-bold shrink-0 transition-colors ${
          isUrgent ? "bg-red-500 text-white animate-pulse" : "bg-primary/10 text-primary hover:bg-primary/20"
        }`}
      >
        {label}
      </Link>
    );
  }

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

// ─── Font Size Control ────────────────────────────────────────────────────────

function FontSizeControl({ compact = false }: { compact?: boolean }) {
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

  if (compact) {
    return (
      <div className="flex flex-col gap-0.5 items-center" title="글씨 크기">
        <button onClick={() => applyScale(scale + 0.1)} disabled={scale >= 1.3} className="w-8 h-7 flex items-center justify-center text-[10px] font-bold text-muted hover:bg-background rounded-md disabled:opacity-30 transition-colors" aria-label="글씨 크게">A+</button>
        <button onClick={() => applyScale(scale - 0.1)} disabled={scale <= 0.8} className="w-8 h-7 flex items-center justify-center text-[10px] font-medium text-muted hover:bg-background rounded-md disabled:opacity-30 transition-colors" aria-label="글씨 작게">A-</button>
      </div>
    );
  }

  return (
    <div className="flex items-center border border-border rounded-lg overflow-hidden shrink-0" title="글씨 크기">
      <button onClick={() => applyScale(scale - 0.1)} disabled={scale <= 0.8} className="px-2 py-1 text-xs font-medium text-muted hover:bg-background transition-colors disabled:opacity-30" aria-label="글씨 작게">A-</button>
      <div className="w-px h-4 bg-border" />
      <button onClick={() => applyScale(scale + 0.1)} disabled={scale >= 1.3} className="px-2 py-1 text-xs font-semibold text-muted hover:bg-background transition-colors disabled:opacity-30" aria-label="글씨 크게">A+</button>
    </div>
  );
}

// ─── Rail Nav Item ────────────────────────────────────────────────────────────

function RailNavItem({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`relative group flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all cursor-pointer select-none ${
        active ? "bg-primary/15 text-primary" : "text-muted hover:bg-background/80 hover:text-foreground"
      }`}
      aria-label={label}
      aria-current={active ? "page" : undefined}
    >
      {icon}
      <span className="text-[9px] font-semibold mt-0.5 leading-none tracking-tight">{label}</span>
      {/* Tooltip */}
      <span className="absolute left-full ml-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-hover:opacity-100 bg-gray-900 text-white text-xs py-1.5 px-2.5 rounded-lg whitespace-nowrap transition-opacity z-50 shadow-lg">
        {label}
      </span>
    </Link>
  );
}

// ─── Main Navbar ──────────────────────────────────────────────────────────────

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const t = useUITexts();
  const { isCute, setTheme } = useTheme();

  const handleThemeToggle = () => {
    const next = isCute ? "regular" : "cute";
    setTheme(next);
    router.push(`/${next}`);
  };

  const isMap = pathname === "/" || pathname === "/regular" || pathname === "/cute";
  const isProposals = pathname.startsWith("/proposals");
  const isPledges = pathname.startsWith("/pledges");
  const isAbout = pathname.startsWith("/about") || pathname.startsWith("/candidates");

  return (
    <>
      {/* ── Desktop: Fixed Left Rail (80px wide) ─────────────────────────── */}
      <aside
        className="hidden md:flex fixed left-0 top-0 bottom-0 w-20 z-40 flex-col items-center py-4 bg-surface border-r border-border gap-1"
        style={{ boxShadow: "1px 0 0 0 var(--color-border)" }}
      >
        {/* Logo */}
        <Link
          href="/"
          className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 shrink-0 transition-transform hover:scale-105 ${isCute ? "bg-pink-100" : "bg-primary"}`}
          title="개혁 충남"
          aria-label="개혁 충남 홈으로"
        >
          <span className={`font-bold text-xs leading-none ${isCute ? "text-pink-600" : "text-white"}`}>개혁</span>
        </Link>

        {/* User profile at top of rail (desktop) */}
        {session ? (
          <UserProfileButton />
        ) : (
          <Link
            href="/login"
            title="로그인"
            className="w-11 h-11 rounded-xl flex items-center justify-center text-muted hover:bg-background hover:text-foreground transition-colors"
            aria-label="로그인"
          >
            <IconPerson />
          </Link>
        )}

        {/* Nav items */}
        <RailNavItem href="/" icon={<IconMapPin />} label="공약지도" active={isMap} />
        <RailNavItem href="/proposals" icon={<IconBulb />} label="제안" active={isProposals} />
        <RailNavItem href="/pledges" icon={<IconClipboard />} label="공약" active={isPledges} />
        <RailNavItem href="/about" icon={<IconUsers />} label="후보자" active={isAbout} />

        <div className="flex-1" />

        {/* D-Day */}
        <ElectionDDay compact />

        {/* Font size */}
        <FontSizeControl compact />

        {/* Theme toggle */}
        <button
          onClick={handleThemeToggle}
          className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg transition-colors ${
            isCute ? "bg-pink-100 text-pink-600 hover:bg-pink-200" : "text-muted hover:bg-background"
          }`}
          title={isCute ? "일반 모드로 전환" : "귀여운 모드로 전환"}
          aria-label={isCute ? "일반 모드로 전환" : "귀여운 모드로 전환"}
        >
          {isCute ? "🏛️" : "✨"}
        </button>

      </aside>

      {/* ── Mobile: Compact Top Bar ──────────────────────────────────────── */}
      <header className="md:hidden sticky top-0 z-40 bg-surface/97 backdrop-blur-sm border-b border-border">
        <div className="px-4 h-12 flex items-center gap-2">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0" aria-label="개혁 충남 홈으로">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isCute ? "bg-pink-100" : "bg-primary"}`}>
              <span className={`font-bold text-[10px] leading-none ${isCute ? "text-pink-600" : "text-white"}`}>개혁</span>
            </div>
            <span className="font-semibold text-sm text-foreground hidden sm:block">{t.logoSubText}</span>
          </Link>

          {/* Nav links */}
          <nav className="flex-1 flex items-center gap-1 overflow-x-auto no-scrollbar" aria-label="주요 메뉴">
            {[
              { href: "/", label: t.navMapLink, active: isMap },
              { href: "/proposals", label: "제안 게시판", active: isProposals },
              { href: "/pledges", label: "공약 목록", active: isPledges },
              { href: "/about", label: "후보자 소개", active: isAbout },
            ].map(({ href, label, active }) => (
              <Link
                key={href}
                href={href}
                className={`shrink-0 text-xs font-medium transition-colors px-1.5 py-0.5 rounded ${
                  active ? "text-primary" : "text-muted hover:text-foreground"
                }`}
                aria-current={active ? "page" : undefined}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* D-Day */}
          <ElectionDDay />

          {/* Font size */}
          <div className="shrink-0 hidden sm:block">
            <FontSizeControl />
          </div>

          {/* Theme toggle */}
          <button
            onClick={handleThemeToggle}
            className={`shrink-0 px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ${
              isCute
                ? "border-pink-300 bg-pink-50 text-pink-600 hover:bg-pink-100"
                : "border-border bg-background text-muted hover:text-foreground hover:bg-border/50"
            }`}
            aria-label={isCute ? "일반 모드로 전환" : "귀여운 모드로 전환"}
          >
            <span className="hidden sm:inline">{isCute ? "🏛️ 일반" : "✨ 귀여운"}</span>
            <span className="sm:hidden">{isCute ? "🏛️" : "✨"}</span>
          </button>

          {/* User */}
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
    </>
  );
}
