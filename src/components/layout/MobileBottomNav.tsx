"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import { useTheme } from "@/contexts/ThemeContext";

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

const IconMenu = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const IconPerson = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
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

// ─── Election D-Day ───────────────────────────────────────────────────────────

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

// ─── Font Size Row (horizontal A- / A+) ──────────────────────────────────────

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
        <button
          onClick={() => apply(scale - 0.1)}
          disabled={scale <= 0.8}
          className="w-10 h-9 flex items-center justify-center text-xs font-bold text-muted hover:bg-background rounded-lg disabled:opacity-30 transition-colors border border-border"
          aria-label="글씨 줄이기"
        >
          A-
        </button>
        <button
          onClick={() => apply(scale + 0.1)}
          disabled={scale >= 1.3}
          className="w-10 h-9 flex items-center justify-center text-xs font-semibold text-muted hover:bg-background rounded-lg disabled:opacity-30 transition-colors border border-border"
          aria-label="글씨 키우기"
        >
          A+
        </button>
      </div>
    </div>
  );
}

// ─── Nav Item ─────────────────────────────────────────────────────────────────

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}

function NavItem({ href, icon, label, active }: NavItemProps) {
  return (
    <Link
      href={href}
      className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 transition-colors active:opacity-60 ${
        active ? "text-primary" : "text-muted hover:text-foreground"
      }`}
      style={{ touchAction: "manipulation" }}
      aria-current={active ? "page" : undefined}
    >
      {icon}
      <span className="text-[10px] font-medium leading-none">{label}</span>
    </Link>
  );
}

// ─── Drawer Item ──────────────────────────────────────────────────────────────

function DrawerItem({
  icon,
  label,
  href,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
}) {
  const cls = "flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-background active:bg-background/80 transition-colors text-left w-full";
  const inner = (
    <>
      <span className="w-8 h-8 rounded-xl bg-background flex items-center justify-center shrink-0 text-foreground">{icon}</span>
      <span className="text-sm font-medium text-foreground flex-1">{label}</span>
    </>
  );
  if (href && onClick) return <Link href={href} onClick={onClick} className={cls}>{inner}</Link>;
  if (href) return <Link href={href} className={cls}>{inner}</Link>;
  return <button onClick={onClick} className={cls}>{inner}</button>;
}

// ─── Main Component ───────────────────────────────────────────────────────────

/**
 * Persistent mobile bottom navigation bar for non-map pages.
 * 5 buttons: 지도 / 제안 / 공약 / 소개 / 더보기
 * The 더보기 drawer provides font size, theme toggle, user, D-Day.
 */
export default function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { isCute, setTheme } = useTheme();
  const dday = useDDay();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleThemeToggle = () => {
    const next = isCute ? "regular" : "cute";
    setTheme(next);
    router.push(`/${next}`);
    setDrawerOpen(false);
  };

  const ddayLabel =
    dday === null ? null
    : dday > 0 ? `D-${dday}`
    : dday === 0 ? "D-Day"
    : `D+${Math.abs(dday)}`;
  const isUrgent = dday !== null && dday >= 0 && dday <= 30;

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/97 backdrop-blur-sm border-t border-border"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="하단 메뉴"
      >
        <div className="flex items-center h-14">
          <NavItem
            href="/"
            icon={<IconMapPin />}
            label="지도"
            active={pathname === "/" || pathname === "/regular" || pathname === "/cute"}
          />
          <NavItem href="/proposals" icon={<IconBulb />} label="제안" active={pathname.startsWith("/proposals")} />
          <NavItem href="/pledges" icon={<IconClipboard />} label="공약" active={pathname.startsWith("/pledges")} />
          <NavItem href="/about" icon={<IconUsers />} label="소개" active={pathname.startsWith("/about") || pathname.startsWith("/candidates")} />
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 text-muted hover:text-foreground active:opacity-60 transition-colors"
            style={{ touchAction: "manipulation" }}
            aria-label="더보기 메뉴 열기"
          >
            <IconMenu />
            <span className="text-[10px] font-medium leading-none">더보기</span>
          </button>
        </div>
      </nav>

      {/* ── 더보기 Drawer ───────────────────────────────────────────────────── */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={() => setDrawerOpen(false)} />
          <div
            className="absolute top-0 right-0 bottom-0 w-72 bg-surface shadow-2xl flex flex-col"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            {/* User profile */}
            <div
              className="flex items-center gap-3 px-5 py-5 border-b border-border"
              style={{ paddingTop: "max(1.25rem, env(safe-area-inset-top))" }}
            >
              {session ? (
                <>
                  <div className="w-11 h-11 rounded-full overflow-hidden shrink-0 bg-primary/10 flex items-center justify-center border border-border/50">
                    {session.user?.image ? (
                      <Image src={session.user.image} alt={session.user.name ?? ""} width={44} height={44} className="object-cover" />
                    ) : (
                      <span className="text-primary font-bold text-sm">{(session.user?.name ?? "?")[0]}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate text-sm">{session.user?.name}</p>
                    <p className="text-xs text-muted truncate">{session.user?.email}</p>
                  </div>
                </>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-3 flex-1"
                >
                  <div className="w-11 h-11 rounded-full bg-background border border-border flex items-center justify-center shrink-0">
                    <IconPerson />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">로그인</p>
                    <p className="text-xs text-muted">계정으로 로그인하세요</p>
                  </div>
                </Link>
              )}
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label="메뉴 닫기"
                className="shrink-0 w-8 h-8 flex items-center justify-center rounded-xl hover:bg-background text-muted text-lg transition-colors ml-auto"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>

            {/* Nav links */}
            <div className="flex-1 overflow-y-auto p-3 space-y-0.5">
              <DrawerItem icon={<IconMapPin />} label="공약지도" href="/" onClick={() => setDrawerOpen(false)} />
              <DrawerItem icon={<IconBulb />} label="민원 & 제안" href="/proposals" onClick={() => setDrawerOpen(false)} />
              <DrawerItem icon={<IconClipboard />} label="공약 목록" href="/pledges" onClick={() => setDrawerOpen(false)} />
              <DrawerItem icon={<IconUsers />} label="후보자 소개" href="/about" onClick={() => setDrawerOpen(false)} />
              {session && (
                <>
                  <div className="my-2 h-px bg-border" />
                  <DrawerItem icon={<IconDashboard />} label="대시보드" href="/dashboard" onClick={() => setDrawerOpen(false)} />
                </>
              )}
            </div>

            {/* Footer: font size, D-Day, theme, logout */}
            <div className="p-3 border-t border-border space-y-0.5">
              {/* Font size (A- A+ side by side) */}
              <FontSizeRow />

              {/* D-Day */}
              {ddayLabel && (
                <Link
                  href="/about"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-background active:bg-background/80 transition-colors"
                >
                  <span className="w-8 h-8 rounded-xl bg-background flex items-center justify-center text-base shrink-0" aria-hidden="true">🗳️</span>
                  <span className="text-sm font-medium text-foreground flex-1">2026 지방선거</span>
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded-lg ${
                      isUrgent ? "bg-red-500 text-white animate-pulse" : "bg-primary/10 text-primary"
                    }`}
                  >
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
                  onClick={() => { signOut(); setDrawerOpen(false); }}
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
      )}
    </>
  );
}
