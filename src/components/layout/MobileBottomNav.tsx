"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import MobileMenuDrawer from "@/components/layout/MobileMenuDrawer";

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

// ─── Main Component ───────────────────────────────────────────────────────────

/**
 * Persistent mobile bottom navigation bar for non-map pages.
 * 5 buttons: 지도 / 제안 / 공약 / 소개 / 더보기
 * The 더보기 drawer is rendered by the shared MobileMenuDrawer component.
 */
export default function MobileBottomNav() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

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

      <MobileMenuDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
