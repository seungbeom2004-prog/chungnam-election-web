"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface Notification {
  id: string;
  title: string;
  message: string;
  level: "info" | "warning" | "urgent";
  isRead: boolean;
  createdAt: string;
}

interface SystemAlert {
  id: string;
  message: string;
  href: string;
  level: "warning" | "info";
}

function useNotifications(candidateId: string | undefined) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!candidateId) return;
    setLoading(true);
    try {
      const [notiRes, profileRes] = await Promise.all([
        fetch("/api/notifications?limit=20"),
        fetch(`/api/candidates/${candidateId}`),
      ]);
      const notiJson = await notiRes.json();
      const profileJson = await profileRes.json();

      setNotifications(notiJson.data?.data ?? []);

      // Build system alerts from profile
      const d = profileJson.data ?? profileJson;
      const alerts: SystemAlert[] = [];
      if (!d.profileImage)
        alerts.push({ id: "profileImage", message: "프로필 사진을 등록해 주세요", href: "/dashboard/profile", level: "warning" });
      if (!d.electionType)
        alerts.push({ id: "electionType", message: "선거 종류를 입력해 주세요", href: "/dashboard/profile", level: "warning" });
      if (!d.slogan)
        alerts.push({ id: "slogan", message: "슬로건을 입력해 주세요", href: "/dashboard/profile", level: "info" });
      if (!d.bio)
        alerts.push({ id: "bio", message: "자기소개를 입력해 주세요", href: "/dashboard/profile", level: "info" });
      if (!d.verified)
        alerts.push({ id: "verified", message: "관리자 승인을 기다리고 있습니다", href: "/dashboard/profile", level: "info" });
      setSystemAlerts(alerts);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [candidateId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const markRead = async (id: string) => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
  };

  const markAllRead = async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  return { notifications, systemAlerts, loading, fetchAll, markRead, markAllRead };
}

function ProfileAvatar({ src, name, size = 32 }: { src?: string | null; name?: string | null; size?: number }) {
  const [imgError, setImgError] = useState(false);
  const initials = (name ?? "?").charAt(0).toUpperCase();

  if (src && !imgError) {
    return (
      <Image
        src={src}
        alt={name ?? "프로필"}
        width={size}
        height={size}
        className="rounded-full object-cover w-full h-full"
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <span className="text-white font-bold" style={{ fontSize: size * 0.4 }}>
      {initials}
    </span>
  );
}

function NotificationLevelIcon({ level }: { level: string }) {
  if (level === "urgent") return <span className="text-red-500">🚨</span>;
  if (level === "warning") return <span className="text-amber-500">⚠️</span>;
  return <span className="text-blue-500">ℹ️</span>;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금";
  if (mins < 60) return `${mins}분 전`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}시간 전`;
  const days = Math.floor(hrs / 24);
  return `${days}일 전`;
}

interface PanelProps {
  session: ReturnType<typeof useSession>["data"];
  candidateId: string | undefined;
  profileImage: string | null | undefined;
  onClose: () => void;
}

function PanelContent({ session, candidateId, profileImage, onClose }: PanelProps) {
  const router = useRouter();
  const { notifications, systemAlerts, loading, markRead, markAllRead } = useNotifications(candidateId);
  const isAdmin = session?.user?.role === "admin";
  const dashboardHref = isAdmin ? "/admin" : "/dashboard";
  const dashboardLabel = isAdmin ? "관리자 패널로 가기" : "대시보드로 가기";

  const unreadAdminNoti = notifications.filter((n) => !n.isRead);
  const totalUnread = unreadAdminNoti.length + (isAdmin ? 0 : systemAlerts.filter((a) => a.level === "warning").length);

  return (
    <div className="flex flex-col h-full">
      {/* Profile header */}
      <div className="flex items-center gap-3 p-4 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
        <div
          className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shrink-0 overflow-hidden border-2 border-primary/20"
        >
          <ProfileAvatar src={profileImage} name={session?.user?.name} size={48} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">{session?.user?.name ?? "사용자"}</p>
          <p className="text-xs text-muted truncate">
            {isAdmin ? "관리자" : (session?.user as { district?: string })?.district ?? "후보자"}
          </p>
        </div>
        {totalUnread > 0 && (
          <span className="shrink-0 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {totalUnread > 9 ? "9+" : totalUnread}
          </span>
        )}
      </div>

      {/* Quick actions */}
      <div className="p-3 border-b border-border space-y-1">
        <Link
          href={dashboardHref}
          onClick={onClose}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-foreground hover:bg-primary/10 hover:text-primary transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          {dashboardLabel}
        </Link>
        <button
          onClick={() => { onClose(); signOut({ callbackUrl: "/" }); }}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-muted hover:text-red-500 hover:bg-red-50 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          로그아웃
        </button>
      </div>

      {/* Notifications area */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {/* Admin notifications */}
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-muted uppercase tracking-wide">
              📣 관리자 알림
              {unreadAdminNoti.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-primary text-white text-[10px] font-bold rounded-full">
                  {unreadAdminNoti.length}
                </span>
              )}
            </p>
            {unreadAdminNoti.length > 0 && (
              <button
                onClick={markAllRead}
                className="text-[10px] text-primary hover:underline"
              >
                모두 읽음
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-3">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <p className="text-xs text-muted text-center py-3">새로운 알림이 없습니다</p>
          ) : (
            <div className="space-y-1.5">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    if (!n.isRead) markRead(n.id);
                  }}
                  className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors ${
                    n.isRead
                      ? "bg-background text-muted border border-border/50"
                      : n.level === "urgent"
                      ? "bg-red-50 text-red-800 border border-red-200 font-medium"
                      : n.level === "warning"
                      ? "bg-amber-50 text-amber-800 border border-amber-200 font-medium"
                      : "bg-blue-50 text-blue-800 border border-blue-200 font-medium"
                  }`}
                >
                  <div className="flex items-start gap-1.5">
                    {!n.isRead && <NotificationLevelIcon level={n.level} />}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{n.title}</p>
                      <p className="mt-0.5 leading-snug">{n.message}</p>
                      <p className="mt-1 text-[10px] opacity-60">{timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.isRead && (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* System alerts — not shown for admin */}
        {!isAdmin && (
          <div className="p-3 pt-0">
            <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
              🔔 시스템 알림
              {systemAlerts.filter((a) => a.level === "warning").length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-amber-400 text-amber-900 text-[10px] font-bold rounded-full">
                  {systemAlerts.filter((a) => a.level === "warning").length}
                </span>
              )}
            </p>
            {systemAlerts.length === 0 ? (
              <p className="text-xs text-green-600 text-center py-2">✓ 모든 정보가 입력되었습니다</p>
            ) : (
              <div className="space-y-1">
                {systemAlerts.map((alert) => (
                  <button
                    key={alert.id}
                    onClick={() => { onClose(); router.push(alert.href); }}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs leading-snug transition-colors ${
                      alert.level === "warning"
                        ? "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                        : "bg-yellow-50 text-yellow-800 hover:bg-yellow-100 border border-yellow-200"
                    }`}
                  >
                    <span className="mr-1">{alert.level === "warning" ? "⚠️" : "ℹ️"}</span>
                    {alert.message}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function UserProfileButton() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const dropdownRef = useRef<HTMLDivElement>(null);

  const candidateId = (session?.user as { id?: string })?.id;
  const isAdmin = session?.user?.role === "admin";

  // Fetch profile image + unread count
  useEffect(() => {
    if (!candidateId) return;
    fetch(`/api/candidates/${candidateId}`)
      .then((r) => r.json())
      .then((json) => {
        const d = json.data ?? json;
        setProfileImage(d.profileImage ?? null);
      })
      .catch(() => {});

    // Fetch unread notification count
    if (!isAdmin) {
      fetch("/api/notifications?limit=1")
        .then((r) => r.json())
        .then((json) => setUnreadCount(json.data?.unreadCount ?? 0))
        .catch(() => {});
    }
  }, [candidateId, isAdmin]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (open) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  const handleToggle = () => {
    if (!open) {
      const btn = dropdownRef.current?.querySelector("button") as HTMLButtonElement | null;
      if (btn && typeof window !== "undefined") {
        const rect = btn.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const panelW = Math.min(320, vw - 16);
        const openUpward = rect.top > vh / 2;
        const openLeft   = rect.left > vw / 2;
        const style: React.CSSProperties = { width: panelW };
        if (openUpward) {
          style.bottom = vh - rect.top + 4;
        } else {
          style.top = rect.bottom + 4;
        }
        if (openLeft) {
          style.right = vw - rect.right;
        } else {
          style.left = rect.left;
        }
        setPanelStyle(style);
      }
    }
    setOpen((v) => !v);
  };

  if (!session) return null;

  const name = session.user?.name ?? "?";

  return (
    <div className="relative shrink-0" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        onClick={handleToggle}
        aria-label="사용자 메뉴 열기"
        aria-expanded={open}
        className="relative w-8 h-8 rounded-full bg-primary overflow-hidden flex items-center justify-center border-2 border-transparent hover:border-primary/40 transition-all focus:outline-none focus:ring-2 focus:ring-primary/40"
      >
        {profileImage ? (
          <Image
            src={profileImage}
            alt={name}
            width={32}
            height={32}
            className="w-full h-full object-cover"
            onError={() => setProfileImage(null)}
          />
        ) : (
          <span className="text-white font-bold text-xs">{name.charAt(0).toUpperCase()}</span>
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 border-2 border-surface rounded-full" aria-label={`${unreadCount}개의 읽지 않은 알림`} />
        )}
      </button>

      {open && (
        <>
          {/* Mobile overlay */}
          <div className="md:hidden fixed inset-0 bg-black/50 z-[9998]" onClick={() => setOpen(false)} />
          {/* Mobile bottom sheet */}
          <div className="md:hidden fixed inset-x-0 bottom-0 z-[9999] rounded-t-2xl shadow-2xl border-t border-border max-h-[90vh] bg-surface overflow-hidden flex flex-col">
            <div className="flex justify-center pt-2 pb-1">
              <div className="w-10 h-1 bg-border rounded-full" />
            </div>
            <PanelContent session={session} candidateId={candidateId} profileImage={profileImage} onClose={() => setOpen(false)} />
          </div>
          {/* Desktop positioned panel */}
          <div
            className="hidden md:flex fixed z-[9999] flex-col rounded-xl shadow-xl border border-border max-h-[600px] bg-surface overflow-hidden"
            style={panelStyle}
          >
            <PanelContent session={session} candidateId={candidateId} profileImage={profileImage} onClose={() => setOpen(false)} />
          </div>
        </>
      )}
    </div>
  );
}
