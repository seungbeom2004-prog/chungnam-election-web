"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface Alert {
  id: string;
  message: string;
  href: string;
  level: "warning" | "info";
}

interface CandidateProfile {
  name: string;
  profileImage: string | null;
  slogan: string | null;
  bio: string | null;
  electionType: string | null;
  district: string | null;
  electionId: string | null;
  verified: boolean;
}

interface AdminStats {
  pendingCount: number;
  noElectionCount: number;
  noElectionTypeCount: number;
}

function useAlerts(role: "admin" | "candidate") {
  const { data: session } = useSession();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const candidateId = (session?.user as { id?: string })?.id;
  const userName = session?.user?.name ?? "님";

  const buildCandidateAlerts = useCallback((profile: CandidateProfile): Alert[] => {
    const list: Alert[] = [];

    if (!profile.profileImage) {
      list.push({
        id: "profileImage",
        message: `${profile.name} 님, 프로필 사진 에 대한 정보 입력이 필요합니다`,
        href: "/dashboard/profile",
        level: "warning",
      });
    }
    if (!profile.electionType) {
      list.push({
        id: "electionType",
        message: `${profile.name} 님, 선거 종류 에 대한 정보 입력이 필요합니다`,
        href: "/dashboard/profile",
        level: "warning",
      });
    }
    if (!profile.slogan) {
      list.push({
        id: "slogan",
        message: `${profile.name} 님, 슬로건 에 대한 정보 입력이 필요합니다`,
        href: "/dashboard/profile",
        level: "info",
      });
    }
    if (!profile.bio) {
      list.push({
        id: "bio",
        message: `${profile.name} 님, 자기소개 에 대한 정보 입력이 필요합니다`,
        href: "/dashboard/profile",
        level: "info",
      });
    }
    // Ward-level election: check if ward is set
    const isWardLevel =
      profile.electionType?.includes("의회의원선거") &&
      !profile.electionType?.includes("시·도의회") &&
      !profile.electionType?.includes("시도의회");
    if (isWardLevel && profile.district && !profile.district.includes(" ")) {
      list.push({
        id: "ward",
        message: `${profile.name} 님, 세부 선거구 에 대한 정보 입력이 필요합니다`,
        href: "/dashboard/profile",
        level: "warning",
      });
    }
    if (!profile.verified) {
      list.push({
        id: "verified",
        message: `${profile.name} 님, 관리자 승인 대기 중입니다`,
        href: "/dashboard/profile",
        level: "info",
      });
    }

    return list;
  }, []);

  const buildAdminAlerts = useCallback((stats: AdminStats): Alert[] => {
    const list: Alert[] = [];
    if (stats.pendingCount > 0) {
      list.push({
        id: "pending",
        message: `승인 대기 출마자 ${stats.pendingCount}명이 있습니다`,
        href: "/admin/candidates",
        level: "warning",
      });
    }
    if (stats.noElectionCount > 0) {
      list.push({
        id: "noElection",
        message: `선거 미지정 출마자 ${stats.noElectionCount}명이 있습니다`,
        href: "/admin/candidates",
        level: "info",
      });
    }
    if (stats.noElectionTypeCount > 0) {
      list.push({
        id: "noElectionType",
        message: `선거 종류 미지정 출마자 ${stats.noElectionTypeCount}명이 있습니다`,
        href: "/admin/candidates",
        level: "info",
      });
    }
    return list;
  }, []);

  useEffect(() => {
    if (!session) return;

    if (role === "candidate" && candidateId) {
      fetch(`/api/candidates/${candidateId}`)
        .then((r) => r.json())
        .then((json) => {
          const d = json.data ?? json;
          const profile: CandidateProfile = {
            name: d.name ?? userName,
            profileImage: d.profileImage ?? null,
            slogan: d.slogan ?? null,
            bio: d.bio ?? null,
            electionType: d.electionType ?? null,
            district: d.district ?? null,
            electionId: d.electionId ?? null,
            verified: d.verified ?? false,
          };
          setAlerts(buildCandidateAlerts(profile));
        })
        .catch(() => setAlerts([]))
        .finally(() => setLoading(false));
    } else if (role === "admin") {
      fetch("/api/admin/candidates")
        .then((r) => r.json())
        .then((json) => {
          const candidates: Array<{
            verified: boolean;
            role: string;
            electionId: string | null;
            electionType: string | null;
          }> = json.data ?? [];
          const real = candidates.filter((c) => c.role !== "admin");
          const stats: AdminStats = {
            pendingCount: real.filter((c) => !c.verified).length,
            noElectionCount: real.filter((c) => c.verified && !c.electionId).length,
            noElectionTypeCount: real.filter((c) => c.verified && !c.electionType).length,
          };
          setAlerts(buildAdminAlerts(stats));
        })
        .catch(() => setAlerts([]))
        .finally(() => setLoading(false));
    }
  }, [session, candidateId, role, userName, buildCandidateAlerts, buildAdminAlerts]);

  return { alerts, loading };
}

interface AlertSidebarProps {
  role: "admin" | "candidate";
}

export default function AlertSidebar({ role }: AlertSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { alerts, loading } = useAlerts(role);
  const router = useRouter();

  const warningCount = alerts.filter((a) => a.level === "warning").length;
  const totalCount = alerts.length;

  return (
    <div
      className={`hidden md:flex flex-col shrink-0 border-l border-border bg-surface/60 transition-all duration-200 ${
        collapsed ? "w-10" : "w-64"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-2 border-b border-border sticky top-0 bg-surface/95 backdrop-blur-sm z-10">
        {!collapsed && (
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs font-semibold text-foreground truncate">알림</span>
            {totalCount > 0 && (
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  warningCount > 0 ? "bg-red-500 text-white" : "bg-yellow-400 text-yellow-900"
                }`}
              >
                {totalCount}
              </span>
            )}
          </div>
        )}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="w-6 h-6 flex items-center justify-center rounded text-muted hover:text-foreground hover:bg-background/60 transition-colors shrink-0 ml-auto"
          title={collapsed ? "알림 열기" : "알림 닫기"}
        >
          {collapsed ? (
            // bell icon with optional badge
            <span className="relative">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {totalCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
              )}
            </span>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M9 18l6-6-6-6" />
            </svg>
          )}
        </button>
      </div>

      {/* Alert list */}
      {!collapsed && (
        <div className="flex-1 overflow-y-auto py-1">
          {loading ? (
            <div className="flex justify-center py-6">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted px-3 text-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-2 opacity-40">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <p className="text-xs">모든 정보가 입력되었습니다</p>
            </div>
          ) : (
            <div className="space-y-1 p-1.5">
              {alerts.map((alert) => (
                <button
                  key={alert.id}
                  onClick={() => router.push(alert.href)}
                  className={`w-full text-left px-2.5 py-2 rounded-lg text-xs leading-snug transition-colors cursor-pointer ${
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
  );
}
