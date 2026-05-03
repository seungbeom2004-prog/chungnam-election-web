"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { signOut, useSession } from "next-auth/react";

const navItems = [
  {
    href: "/dashboard/pledges",
    label: "공약 관리",
    shortLabel: "공약",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path
          d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2v-2M13.586 3.586a2 2 0 112.828 2.828L9 13.828V16H6.172l7.414-7.414z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: "/dashboard/schedule",
    label: "일정 관리",
    shortLabel: "일정",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path
          d="M6 2v2M14 2v2M3 8h14M5 4h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: "/dashboard/profile",
    label: "내 프로필",
    shortLabel: "프로필",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path
          d="M10 10a3 3 0 100-6 3 3 0 000 6zM3 18a7 7 0 0114 0H3z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: "/dashboard/feed",
    label: "AI 피드",
    shortLabel: "AI피드",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M3 5h14M3 10h14M3 15h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="16" cy="15" r="2" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    href: "/dashboard/qr",
    label: "QR 코드",
    shortLabel: "QR",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="2" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="4" y="4" width="3" height="3" fill="currentColor" />
        <rect x="11" y="2" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="13" y="4" width="3" height="3" fill="currentColor" />
        <rect x="2" y="11" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="4" y="13" width="3" height="3" fill="currentColor" />
        <path d="M11 11h2v2h-2zM15 11h2v2h-2zM13 13h2v2h-2zM11 15h2v2h-2zM15 15h2v2h-2z" fill="currentColor" />
      </svg>
    ),
  },
  {
    href: "/dashboard/settings",
    label: "개인 정보 관리",
    shortLabel: "설정",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path
          d="M10.325 4.317a1.724 1.724 0 013.35 0 1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M13 10a3 3 0 11-6 0 3 3 0 016 0z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
    ),
  },
  {
    href: "/dashboard/nec-sync",
    label: "선관위 연동",
    shortLabel: "선관위",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path
          d="M4 4h12v2H4zM4 9h12v2H4zM4 14h8v2H4z"
          fill="currentColor"
          opacity="0.8"
        />
        <circle cx="16" cy="15" r="3" stroke="currentColor" strokeWidth="1.5" />
        <path d="M15 15l.8.8 1.5-1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export default function DashboardSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  // Prefetch dashboard routes for instant navigation
  const router = useRouter();
  useEffect(() => {
    navItems.forEach((item) => router.prefetch(item.href));
    router.prefetch("/");
  }, [router]);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-60 bg-surface border-r border-border h-screen">
        {/* Candidate Info */}
        <div className="p-4 border-b border-border">
          <p className="font-semibold text-foreground truncate">
            {session?.user?.name}
          </p>
          <p className="text-xs text-muted mt-0.5">
            {(session?.user as { district?: string })?.district}
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                aria-label={item.label}
                className={`
                  relative group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                  transition-colors mb-0.5
                  ${
                    isActive
                      ? "bg-primary-light text-primary"
                      : "text-muted hover:text-foreground hover:bg-background"
                  }
                `}
              >
                {item.icon}
                {item.label}
                {/* Tooltip (visible on hover even when sidebar is collapsed in future) */}
                <span className="absolute left-full ml-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-hover:opacity-100 bg-gray-900 text-white text-xs py-1 px-2 rounded whitespace-nowrap transition-opacity z-50 hidden">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-2 border-t border-border space-y-0.5">
          {/* Visitor View */}
          <Link
            href="/"
            title="방문자 화면으로 이동"
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-muted hover:text-foreground hover:bg-background transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M9 22V12h4v10"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            방문자 화면
          </Link>
          {/* Logout */}
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            title="로그아웃"
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-muted hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M13 14l4-4m0 0l-4-4m4 4H5m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h4a2 2 0 012 2v1"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            로그아웃
          </button>
        </div>
      </aside>

      {/* Mobile Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-border z-50">
        <div
          className="flex overflow-x-auto"
          style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
        >
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  shrink-0 flex flex-col items-center gap-1 py-2 px-3 text-[10px]
                  ${isActive ? "text-primary" : "text-muted"}
                `}
              >
                {item.icon}
                <span className="leading-tight">{item.shortLabel}</span>
              </Link>
            );
          })}
          {/* Separator */}
          <div className="shrink-0 w-px bg-border my-2" />
          {/* Visitor View */}
          <Link
            href="/"
            className="shrink-0 flex flex-col items-center gap-1 py-2 px-3 text-[10px] text-muted hover:text-foreground"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="leading-tight">방문자</span>
          </Link>
          {/* Logout */}
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="shrink-0 flex flex-col items-center gap-1 py-2 px-3 text-[10px] text-muted hover:text-red-500"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M13 14l4-4m0 0l-4-4m4 4H5m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h4a2 2 0 012 2v1"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="leading-tight">로그아웃</span>
          </button>
        </div>
      </nav>
    </>
  );
}
