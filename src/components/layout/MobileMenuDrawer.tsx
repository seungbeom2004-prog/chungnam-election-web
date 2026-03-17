"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "@/contexts/ThemeContext";
import { useRouter } from "next/navigation";

// ─── Icons ────────────────────────────────────────────────────────────────────

const IconMapPin = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const IconBulb = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="9" y1="18" x2="15" y2="18" />
    <line x1="10" y1="22" x2="14" y2="22" />
    <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
  </svg>
);

const IconClipboard = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    <line x1="9" y1="12" x2="15" y2="12" />
    <line x1="9" y1="16" x2="13" y2="16" />
  </svg>
);

const IconUsers = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const IconDashboard = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

const IconPerson = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
);

// ─── Font Size Row ─────────────────────────────────────────────────────────────

function FontSizeRow() {
  const [scale, setScale] = useState(1.0);
  useEffect(() => {
    const saved = parseFloat(localStorage.getItem("fontScale") ?? "1");
    const valid = isNaN(saved) ? 1 : Math.max(0.8, Math.min(1.3, saved));
    setScale(valid);
    document.documentElement.style.fontSize = `${valid * 16}px`;
  }, []);
  const apply = (next: number) => {
    const c = Math.max(0.8, Math.min(1.3, next));
    setScale(c);
    localStorage.setItem("fontScale", String(c));
    document.documentElement.style.fontSize = `${c * 16}px`;
  };
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="w-8 h-8 rounded-xl bg-background flex items-center justify-center text-base shrink-0" aria-hidden="true">🔤</span>
      <span className="text-sm font-medium text-foreground flex-1">글씨 크기</span>
      <div className="flex gap-1">
        <button onClick={() => apply(scale - 0.1)} disabled={scale <= 0.8} className="w-10 h-9 flex items-center justify-center text-xs font-bold text-muted hover:bg-background rounded-lg disabled:opacity-30 transition-colors border border-border" aria-label="글씨 줄이기">A-</button>
        <button onClick={() => apply(scale + 0.1)} disabled={scale >= 1.3} className="w-10 h-9 flex items-center justify-center text-xs font-semibold text-muted hover:bg-background rounded-lg disabled:opacity-30 transition-colors border border-border" aria-label="글씨 키우기">A+</button>
      </div>
    </div>
  );
}

// ─── Drawer Item (exported for extraNavItems) ─────────────────────────────────

export function DrawerItem({
  icon,
  label,
  href,
  onClick,
  external = false,
}: {
  icon: React.ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
  external?: boolean;
}) {
  const cls = "flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-background active:bg-background/80 transition-colors text-left w-full";
  const inner = (
    <>
      <span className="w-8 h-8 rounded-xl bg-background flex items-center justify-center shrink-0 text-foreground">{icon}</span>
      <span className="text-sm font-medium text-foreground flex-1">{label}</span>
      {external && (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted" aria-hidden="true">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" />
        </svg>
      )}
    </>
  );
  if (href && onClick) return <Link href={href} onClick={onClick} className={cls}>{inner}</Link>;
  if (href) return <Link href={href} className={cls} target={external ? "_blank" : undefined}>{inner}</Link>;
  return <button onClick={onClick} className={cls}>{inner}</button>;
}

// ─── D-Day ────────────────────────────────────────────────────────────────────

const ELECTION_DATE = new Date("2026-06-03T00:00:00+09:00");

function useDDay() {
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
  return dday;
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface MobileMenuDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Extra nav items rendered below the default links (e.g. district selector on map page) */
  extraNavItems?: React.ReactNode;
}

export default function MobileMenuDrawer({ open, onClose, extraNavItems }: MobileMenuDrawerProps) {
  const { data: session } = useSession();
  const { isCute, setTheme } = useTheme();
  const router = useRouter();
  const dday = useDDay();
  const [visitorCount, setVisitorCount] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    fetch("/api/visitor-count")
      .then((r) => r.json())
      .then((j) => setVisitorCount(j.count ?? null))
      .catch(() => {});
  }, [open]);

  // Body scroll lock — Android Chrome에서 drawer 내부 스크롤이 body로 전파되는 것을 방지.
  // iOS Safari는 OS 레벨 스크롤을 사용하므로 overflow: hidden 자체가 큰 영향 없음.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const ddayLabel =
    dday === null ? null
    : dday > 0 ? `D-${dday}`
    : dday === 0 ? "D-Day"
    : `D+${Math.abs(dday)}`;
  const isUrgent = dday !== null && dday >= 0 && dday <= 30;

  const handleThemeToggle = () => {
    const next = isCute ? "regular" : "cute";
    setTheme(next);
    router.push(`/${next}`);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="md:hidden fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className="absolute top-0 right-0 bottom-0 w-72 bg-surface shadow-2xl flex flex-col"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-5 py-5 border-b border-border"
          style={{ paddingTop: "max(1.25rem, env(safe-area-inset-top))" }}
        >
          <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xl">🏘️</div>
          <div className="flex-1 min-w-0">
            {visitorCount !== null ? (
              <p className="font-bold text-foreground text-sm leading-snug">
                오늘 변화를 만들어갈{" "}
                <span className="text-primary">{visitorCount.toLocaleString()}번째</span>{" "}
                방문입니다
              </p>
            ) : (
              <p className="font-bold text-foreground text-sm">우리 동네 변화 플랫폼</p>
            )}
            <p className="text-xs text-muted mt-0.5">함께 우리 동네를 바꿔나가요 ✊</p>
          </div>
          {session && (
            <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 bg-primary/10 flex items-center justify-center border border-border/50">
              {session.user?.image ? (
                <Image src={session.user.image} alt={session.user.name ?? ""} width={32} height={32} className="object-cover" />
              ) : (
                <span className="text-primary font-bold text-xs">{(session.user?.name ?? "?")[0]}</span>
              )}
            </div>
          )}
          <button
            onClick={onClose}
            aria-label="메뉴 닫기"
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-xl hover:bg-background text-muted text-lg transition-colors ml-auto"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        {/* Nav links — overscroll-contain prevents page scroll leaking while scrolling inside drawer */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-3 space-y-0.5">
          <DrawerItem icon={<IconMapPin />} label="공약지도" href="/" onClick={onClose} />
          <DrawerItem icon={<IconBulb />} label="민원 & 제안" href="/proposals" onClick={onClose} />
          <DrawerItem icon={<IconClipboard />} label="공약 목록" href="/pledges" onClick={onClose} />
          <DrawerItem icon={<IconUsers />} label="후보자 소개" href="/about" onClick={onClose} />
          {session && (
            <>
              <div className="my-2 h-px bg-border" />
              <DrawerItem icon={<IconDashboard />} label="대시보드" href="/dashboard" onClick={onClose} />
            </>
          )}
          {extraNavItems}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border space-y-0.5">
          {/* Candidate login link (non-logged-in only) */}
          {!session && (
            <Link
              href="/login"
              onClick={onClose}
              className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs text-muted/60 hover:text-muted transition-colors"
            >
              <IconPerson />
              <span>후보자 로그인</span>
            </Link>
          )}

          {/* Font size */}
          <FontSizeRow />

          {/* D-Day */}
          {ddayLabel && (
            <Link
              href="/about"
              onClick={onClose}
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-background active:bg-background/80 transition-colors"
            >
              <span className="w-8 h-8 rounded-xl bg-background flex items-center justify-center text-base shrink-0" aria-hidden="true">🗳️</span>
              <span className="text-sm font-medium text-foreground flex-1">2026 지방선거</span>
              <span className={`text-xs font-bold px-2 py-1 rounded-lg ${isUrgent ? "bg-red-500 text-white animate-pulse" : "bg-primary/10 text-primary"}`}>
                {ddayLabel}
              </span>
            </Link>
          )}

          {/* Theme toggle */}
          <button
            onClick={handleThemeToggle}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-background active:bg-background/80 transition-colors text-left"
            style={{ touchAction: "manipulation" }}
          >
            <span className="w-8 h-8 rounded-xl bg-background flex items-center justify-center text-base shrink-0">
              {isCute ? "🏛️" : "✨"}
            </span>
            <span className="text-sm font-medium text-foreground">
              {isCute ? "일반 모드로 전환" : "귀여운 모드로 전환"}
            </span>
          </button>

          {/* Logout */}
          {session && (
            <button
              onClick={() => { signOut(); onClose(); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-background active:bg-background/80 transition-colors text-left"
              style={{ touchAction: "manipulation" }}
            >
              <span className="w-8 h-8 rounded-xl bg-background flex items-center justify-center text-sm shrink-0">🚪</span>
              <span className="text-sm font-medium text-muted">로그아웃</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
