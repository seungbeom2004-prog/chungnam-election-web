"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { CHUNGNAM_DISTRICTS, nearestDistrict } from "@/lib/districts";
import { Badge } from "@/components/ui";

interface NecDistrict {
  name: string;
  wOrder: number;
}

interface Candidate {
  id: string;
  name: string;
  district: string;
  profileImage: string | null;
  slogan: string | null;
  party: string;
  candidateStatus: string;
  caucusStatus: string;
}

type GpsState = "idle" | "loading" | "success" | "denied" | "error";

// Map candidateStatus → badge variant
const STATUS_VARIANT: Record<string, "primary" | "secondary" | "muted"> = {
  후보자: "primary",
  예비후보자: "secondary",
  출마예정자: "muted",
};

export default function CandidatesPage() {
  const [districts, setDistricts] = useState<NecDistrict[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<string>("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loadingDistricts, setLoadingDistricts] = useState(true);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [gpsState, setGpsState] = useState<GpsState>("idle");
  const tabsRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // ── Load districts from NEC API ─────────────────────────────
  useEffect(() => {
    fetch("/api/nec?type=districts")
      .then((r) => r.json())
      .then((json) => {
        const data: NecDistrict[] = json.data ?? [];
        // Sort by wOrder (official NEC ordering)
        data.sort((a, b) => a.wOrder - b.wOrder);
        setDistricts(data);
        if (data.length > 0) setSelectedDistrict(data[0].name);
      })
      .catch(() => {
        // Fallback to static districts
        const fallback = CHUNGNAM_DISTRICTS.map((d, i) => ({
          name: d.name,
          wOrder: i + 1,
        }));
        setDistricts(fallback);
        if (fallback.length > 0) setSelectedDistrict(fallback[0].name);
      })
      .finally(() => setLoadingDistricts(false));
  }, []);

  // ── Load candidates for selected district ──────────────────
  useEffect(() => {
    if (!selectedDistrict) return;
    setLoadingCandidates(true);
    fetch(`/api/candidates?district=${encodeURIComponent(selectedDistrict)}&limit=50`)
      .then((r) => r.json())
      .then((json) => setCandidates(json.data ?? []))
      .catch(() => setCandidates([]))
      .finally(() => setLoadingCandidates(false));
  }, [selectedDistrict]);

  // ── Scroll selected tab into view ──────────────────────────
  const scrollTabIntoView = useCallback((districtName: string) => {
    const btn = tabRefs.current[districtName];
    if (btn && tabsRef.current) {
      btn.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, []);

  const handleSelectDistrict = useCallback(
    (name: string) => {
      setSelectedDistrict(name);
      scrollTabIntoView(name);
    },
    [scrollTabIntoView]
  );

  // ── GPS: find nearest district ──────────────────────────────
  const handleGps = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsState("error");
      return;
    }
    setGpsState("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const nearest = nearestDistrict(latitude, longitude);
        setGpsState("success");
        handleSelectDistrict(nearest.name);
        // Reset indicator after 2 s
        setTimeout(() => setGpsState("idle"), 2000);
      },
      (err) => {
        console.error("[GPS]", err);
        setGpsState(err.code === 1 ? "denied" : "error");
        setTimeout(() => setGpsState("idle"), 3000);
      },
      { timeout: 8000, enableHighAccuracy: false }
    );
  }, [handleSelectDistrict]);

  // ── GPS status message ──────────────────────────────────────
  const gpsLabel: Record<GpsState, string> = {
    idle: "내 위치",
    loading: "위치 확인 중...",
    success: "완료!",
    denied: "위치 권한 거부됨",
    error: "위치 오류",
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-background">
      {/* Page Header */}
      <div className="border-b border-border bg-surface px-4 pt-5 pb-3">
        <h1 className="text-lg font-bold text-foreground">후보자 목록</h1>
        <p className="text-xs text-muted mt-0.5">
          제9회 전국동시지방선거 · 충청남도
        </p>
      </div>

      {/* District tabs + GPS button */}
      <div className="border-b border-border bg-surface sticky top-14 z-10">
        <div className="flex items-center gap-2 px-3 py-2">
          {/* GPS button */}
          <button
            onClick={handleGps}
            disabled={gpsState === "loading"}
            title="현재 위치에서 가장 가까운 지역으로 이동"
            className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors
              ${gpsState === "success"
                ? "bg-green-50 border-green-300 text-green-700"
                : gpsState === "denied" || gpsState === "error"
                ? "bg-red-50 border-red-300 text-red-600"
                : "bg-background border-border text-muted hover:text-primary hover:border-primary"
              }`}
          >
            {gpsState === "loading" ? (
              <span className="w-3.5 h-3.5 border border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                <path d="M12 8a4 4 0 100 8 4 4 0 000-8z" opacity=".3" />
              </svg>
            )}
            <span>{gpsLabel[gpsState]}</span>
          </button>

          {/* Scrollable district tabs */}
          <div
            ref={tabsRef}
            className="flex gap-1.5 overflow-x-auto scrollbar-hide flex-1"
            style={{ scrollbarWidth: "none" }}
          >
            {loadingDistricts
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="shrink-0 h-7 w-20 bg-border/40 rounded-lg animate-pulse"
                  />
                ))
              : districts.map((d) => (
                  <button
                    key={d.name}
                    ref={(el) => { tabRefs.current[d.name] = el; }}
                    onClick={() => handleSelectDistrict(d.name)}
                    className={`shrink-0 px-3 py-1 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                      selectedDistrict === d.name
                        ? "bg-primary text-white"
                        : "bg-background text-muted hover:text-foreground border border-border"
                    }`}
                  >
                    {d.name}
                  </button>
                ))}
          </div>
        </div>
      </div>

      {/* Candidates list */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        {loadingCandidates ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-4 rounded-xl border border-border bg-surface animate-pulse">
                <div className="w-14 h-14 rounded-full bg-border/40 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-border/40 rounded w-24" />
                  <div className="h-3 bg-border/40 rounded w-40" />
                </div>
              </div>
            ))}
          </div>
        ) : candidates.length === 0 ? (
          <div className="text-center py-16 text-muted">
            <svg
              className="mx-auto mb-3 opacity-40"
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
            <p className="text-sm font-medium">등록된 후보가 없습니다</p>
            <p className="text-xs mt-1 text-muted/70">{selectedDistrict}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {candidates.map((c) => (
              <Link
                key={c.id}
                href={`/candidates/${c.id}`}
                className="flex items-center gap-3 p-4 rounded-xl border border-border bg-surface hover:border-primary/40 hover:shadow-sm transition-all group"
              >
                {/* Profile image */}
                <div className="relative w-14 h-14 shrink-0">
                  {c.profileImage ? (
                    <Image
                      src={c.profileImage}
                      alt={c.name}
                      fill
                      className="object-cover rounded-full"
                      sizes="56px"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-bold text-lg">
                        {c.name[0]}
                      </span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">
                      {c.name}
                    </span>
                    <Badge variant={STATUS_VARIANT[c.candidateStatus] ?? "muted"}>
                      {c.candidateStatus}
                    </Badge>
                    {c.caucusStatus === "공천 확정" && (
                      <Badge variant="primary">공천 확정</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted mt-0.5">
                    {c.party} · {c.district}
                  </p>
                  {c.slogan && (
                    <p className="text-xs text-foreground/70 mt-1 truncate">
                      {c.slogan}
                    </p>
                  )}
                </div>

                {/* Chevron */}
                <svg
                  className="shrink-0 text-muted group-hover:text-primary transition-colors"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </Link>
            ))}
          </div>
        )}

        {/* GPS permission hint */}
        {gpsState === "denied" && (
          <p className="text-xs text-center text-muted mt-6 px-4">
            GPS 위치 접근이 차단되어 있습니다. 브라우저 설정에서 위치 권한을 허용해주세요.
          </p>
        )}
      </div>
    </div>
  );
}
