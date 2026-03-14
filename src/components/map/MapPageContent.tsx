"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import NaverMap from "@/components/map/NaverMap";
import PledgePanel from "@/components/map/PledgePanel";
import CandidatePopup from "@/components/map/CandidatePopup";
import { useMapStore } from "@/store/useMapStore";
import { useUITexts } from "@/hooks/useUITexts";
import { useTheme } from "@/contexts/ThemeContext";
import ThemeToggleFAB from "@/components/theme/ThemeToggle";
import type { Pledge } from "@/types";

const CITY_ZOOM = 6;

// Icon map for categories
const CATEGORY_ICONS: Record<string, string> = {
  "교통": "🚌",
  "안전": "⚠️",
  "교육": "📚",
  "복지": "🏥",
  "경제": "📈",
  "조례": "📜",
};

export interface CandidateForMap {
  id: string;
  name: string;
  district: string;
  profileImage: string | null;
  electionType: string | null;
  electionName: string | null;
  candidateStatus: string;
  pinLat: number | null;
  pinLng: number | null;
  youtube: string | null;
  instagram: string | null;
  twitter: string | null;
  facebook: string | null;
  tiktok: string | null;
  kakao: string | null;
  naverBlog: string | null;
}

export interface DistrictCoords {
  name: string;
  centerLat: number;
  centerLng: number;
}

// ─── Candidate sidebar ──────────────────────────────────────────────────────

function CandidateSidebar({
  candidates,
  selectedDistrict,
  onSelect,
  allCandidatesLabel,
  noCandidateLabel,
}: {
  candidates: CandidateForMap[];
  selectedDistrict: string | null;
  onSelect: (c: CandidateForMap) => void;
  allCandidatesLabel: string;
  noCandidateLabel: string;
}) {
  const filtered = selectedDistrict
    ? candidates.filter(
        (c) =>
          c.district === selectedDistrict ||
          c.district.startsWith(selectedDistrict)
      )
    : candidates;

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border sticky top-0 bg-surface/95 backdrop-blur-sm z-10">
        <p className="text-xs font-semibold text-foreground">
          {selectedDistrict ? selectedDistrict : allCandidatesLabel}
        </p>
        <p className="text-xs text-muted">{filtered.length}명</p>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-2 opacity-40">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
          </svg>
          <p className="text-xs">{noCandidateLabel}</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelect(c)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-background/60 transition-colors text-left"
            >
              {/* Profile image */}
              <div className="relative w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-primary/10 border-2 border-primary/30">
                {c.profileImage ? (
                  <Image
                    src={c.profileImage}
                    alt={c.name}
                    fill
                    sizes="40px"
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-primary font-bold text-sm">{c.name[0]}</span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 overflow-hidden">
                <p className="font-semibold text-foreground text-sm leading-tight">{c.name}</p>
                {c.electionType && (
                  <p className="text-xs text-muted truncate leading-tight mt-0.5">{c.electionType}</p>
                )}
                <p className="text-xs text-primary truncate leading-tight">{c.district}</p>
              </div>

              {/* Status badge */}
              {c.candidateStatus && (
                <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                  {c.candidateStatus}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main page content ──────────────────────────────────────────────────────

export default function MapPageContent() {
  const [pledges, setPledges] = useState<Pledge[]>([]);
  const [candidates, setCandidates] = useState<CandidateForMap[]>([]);
  const [districts, setDistricts] = useState<DistrictCoords[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [candidatesLoaded, setCandidatesLoaded] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [emptyOverlayDismissed, setEmptyOverlayDismissed] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateForMap | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [districtDropdownOpen, setDistrictDropdownOpen] = useState(false);
  const districtDropdownRef = useRef<HTMLDivElement>(null);

  const { setSelectedPledge, selectedDistrict, isPanelOpen, setCenter, setZoomLevel, setSelectedDistrict } = useMapStore();
  const t = useUITexts();
  const { isCute } = useTheme();

  const primaryColor = isCute ? "#FF6B9D" : "#FF5A00";

  // Count candidates visible in sidebar
  const filteredCount = selectedDistrict
    ? candidates.filter((c) => c.district === selectedDistrict || c.district.startsWith(selectedDistrict)).length
    : candidates.length;

  // Compute active categories from pledges (only those with > 0 pledges)
  const activeCategories = (() => {
    const map = new Map<string, { icon: string; count: number }>();
    pledges.forEach((p) => {
      const name = p.category?.name;
      if (name) {
        const existing = map.get(name);
        map.set(name, {
          icon: p.category?.emoji || CATEGORY_ICONS[name] || "📌",
          count: (existing?.count ?? 0) + 1,
        });
      }
    });
    return Array.from(map.entries()).map(([name, info]) => ({ id: name, ...info }));
  })();

  // Fetch map pledges
  useEffect(() => {
    fetch("/api/pledges?limit=1000&pledgeType=map")
      .then((res) => res.json())
      .then((json) => {
        const data = json.data ?? json;
        setPledges(Array.isArray(data) ? data : []);
      })
      .catch(console.error);
  }, []);

  // Fetch all verified candidates
  useEffect(() => {
    fetch("/api/candidates?limit=500")
      .then((res) => res.json())
      .then((json) => {
        const data: Array<{
          id: string;
          name: string;
          district: string;
          profileImage: string | null;
          electionType: string | null;
          candidateStatus: string;
          pinLat: number | null;
          pinLng: number | null;
          youtube: string | null;
          instagram: string | null;
          twitter: string | null;
          facebook: string | null;
          tiktok: string | null;
          kakao: string | null;
          naverBlog: string | null;
          election?: { id: string; name: string } | null;
        }> = json.data ?? [];
        setCandidates(
          data.map((c) => ({
            id: c.id,
            name: c.name,
            district: c.district,
            profileImage: c.profileImage,
            electionType: c.electionType ?? null,
            electionName: c.election?.name ?? null,
            candidateStatus: c.candidateStatus ?? "",
            pinLat: c.pinLat ?? null,
            pinLng: c.pinLng ?? null,
            youtube: c.youtube ?? null,
            instagram: c.instagram ?? null,
            twitter: c.twitter ?? null,
            facebook: c.facebook ?? null,
            tiktok: c.tiktok ?? null,
            kakao: c.kakao ?? null,
            naverBlog: c.naverBlog ?? null,
          }))
        );
      })
      .catch(console.error)
      .finally(() => setCandidatesLoaded(true));
  }, []);

  // Fetch district center coordinates
  useEffect(() => {
    fetch("/api/districts")
      .then((res) => res.json())
      .then((json) => {
        const data: DistrictCoords[] = (json.data ?? []).map(
          (d: { name: string; centerLat: number; centerLng: number }) => ({
            name: d.name,
            centerLat: d.centerLat,
            centerLng: d.centerLng,
          })
        );
        setDistricts(data);
      })
      .catch(console.error);
  }, []);

  // Wait for Naver Maps SDK
  useEffect(() => {
    (window as unknown as Record<string, unknown>).navermap_authFailure = function () {
      setMapError(
        "네이버 지도 인증에 실패했습니다. NCP 콘솔에서 Web Dynamic Map API 활성화 및 도메인 등록을 확인하세요."
      );
    };

    const isSdkReady = () => {
      try {
        const w = window as unknown as { naver?: { maps?: { Map?: unknown } } };
        return !!w.naver?.maps && typeof w.naver.maps.Map === "function";
      } catch { return false; }
    };

    if (isSdkReady()) {
      setMapReady(true);
      return;
    }

    let polls = 0;
    const timer = setInterval(() => {
      if (isSdkReady()) {
        clearInterval(timer);
        setMapReady(true);
      } else if (++polls > 75) {
        clearInterval(timer);
        setMapError("네이버 지도 SDK를 불러올 수 없습니다. 페이지를 새로고침 해주세요.");
      }
    }, 200);

    return () => clearInterval(timer);
  }, []);

  // Close district dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (districtDropdownRef.current && !districtDropdownRef.current.contains(e.target as Node)) {
        setDistrictDropdownOpen(false);
      }
    };
    if (districtDropdownOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [districtDropdownOpen]);

  const handleDistrictSelect = useCallback((district: DistrictCoords) => {
    setCenter(district.centerLat, district.centerLng);
    setZoomLevel(CITY_ZOOM);
    setSelectedDistrict(district.name);
    setDistrictDropdownOpen(false);
  }, [setCenter, setZoomLevel, setSelectedDistrict]);

  const handlePledgeClick = useCallback(
    (pledge: Pledge) => { setSelectedPledge(pledge); },
    [setSelectedPledge]
  );

  const handleCandidateClick = useCallback((candidate: CandidateForMap) => {
    setSelectedCandidate(candidate);
  }, []);

  return (
    <div className="flex w-full overflow-hidden" style={{ height: "calc(100dvh - 3.5rem)" }}>
      {/* Map area */}
      <div className="flex-1 relative min-w-0">
        {mapReady && !mapError ? (
          <NaverMap
            pledges={pledges}
            candidates={candidates}
            districts={districts}
            onPledgeClick={handlePledgeClick}
            onCandidateClick={handleCandidateClick}
            isCute={isCute}
            selectedCategory={selectedCategory}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-background">
            <div className="text-center">
              {mapError ? (
                <>
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
                    <span className="text-red-500 text-lg">!</span>
                  </div>
                  <p className="text-sm text-red-600 max-w-xs">{mapError}</p>
                  <p className="text-xs text-muted mt-2">
                    Client ID:{" "}
                    {process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID?.slice(0, 4)}***
                  </p>
                  <button
                    onClick={() => window.location.reload()}
                    className="mt-4 px-4 py-2 text-xs bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    다시 시도
                  </button>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm text-muted">지도를 불러오는 중...</p>
                </>
              )}
            </div>
          </div>
        )}

        {/* City (시군구) selector — top-left of map */}
        <div ref={districtDropdownRef} className="absolute top-3 left-3 z-20">
          <button
            onClick={() => setDistrictDropdownOpen((o) => !o)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/95 backdrop-blur-sm border border-border rounded-xl shadow-md text-xs font-medium text-foreground hover:bg-background transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {selectedDistrict ?? "도시 (시군구) 별"}
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              style={{ transition: "transform 0.15s", transform: districtDropdownOpen ? "rotate(180deg)" : "rotate(0deg)" }}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          {districtDropdownOpen && districts.length > 0 && (
            <div className="absolute top-full left-0 mt-1.5 bg-white/98 backdrop-blur-sm border border-border rounded-xl shadow-lg overflow-hidden min-w-[140px] max-h-64 overflow-y-auto">
              <button
                onClick={() => { setSelectedDistrict(null); setDistrictDropdownOpen(false); }}
                className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors ${
                  !selectedDistrict ? "bg-primary/10 text-primary" : "text-foreground hover:bg-background/60"
                }`}
              >
                전체 지역
              </button>
              {districts.map((d) => (
                <button
                  key={d.name}
                  onClick={() => handleDistrictSelect(d)}
                  className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors ${
                    selectedDistrict === d.name ? "bg-primary/10 text-primary" : "text-foreground hover:bg-background/60"
                  }`}
                >
                  {d.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Empty city state overlay */}
        {mapReady && !mapError && candidatesLoaded && candidates.length === 0 && !emptyOverlayDismissed && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none"
            style={{ top: "60px" }}
          >
            <div className="pointer-events-auto bg-white/95 backdrop-blur-sm rounded-2xl px-6 py-5 shadow-lg border border-border text-center max-w-xs mx-4">
              <p className="text-sm font-semibold text-foreground mb-3">아직 등록된 후보자가 없습니다</p>
              <a
                href="/signup"
                className="inline-block px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary/90 transition-colors"
              >
                후보자로 등록하기 →
              </a>
              <button
                onClick={() => setEmptyOverlayDismissed(true)}
                className="block w-full mt-2 text-xs text-muted hover:text-foreground transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        )}

        {/* Legend — bottom-left, fixed position for safe area */}
        <div
          className="absolute left-3 z-10"
          style={{ bottom: "calc(1rem + env(safe-area-inset-bottom))" }}
        >
          {legendOpen ? (
            <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-border shadow-md p-3 min-w-[140px]">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-semibold text-foreground">카테고리</span>
                <button onClick={() => setLegendOpen(false)} className="text-muted hover:text-foreground ml-3 text-xs">✕</button>
              </div>
              {/* "전체" option */}
              <button
                onClick={() => setSelectedCategory("all")}
                className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs transition-colors mb-0.5 ${
                  selectedCategory === "all"
                    ? "font-semibold"
                    : "text-foreground hover:bg-background/60"
                }`}
                style={selectedCategory === "all" ? { background: `${primaryColor}18`, color: primaryColor } : {}}
              >
                <span className="w-5 text-center text-sm">🗺️</span>
                <span className="flex-1 text-left">전체</span>
              </button>
              {activeCategories.map(({ id, icon, count }) => (
                <button
                  key={id}
                  onClick={() => setSelectedCategory(selectedCategory === id ? "all" : id)}
                  className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs transition-colors mb-0.5 ${
                    selectedCategory === id
                      ? "font-semibold"
                      : "text-foreground hover:bg-background/60"
                  }`}
                  style={selectedCategory === id ? { background: `${primaryColor}18`, color: primaryColor } : {}}
                >
                  <span className="w-5 text-center text-sm">{icon}</span>
                  <span className="flex-1 text-left">{id}</span>
                  <span
                    className="text-[10px] px-1 rounded-full"
                    style={{ background: `${primaryColor}18`, color: primaryColor }}
                  >
                    {count}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <button
              onClick={() => setLegendOpen(true)}
              className="bg-white/95 backdrop-blur-sm border border-border rounded-full px-3 py-1.5 text-xs font-medium text-foreground shadow-md hover:bg-background transition-colors"
            >
              카테고리
            </button>
          )}
        </div>

        <PledgePanel />

        {selectedCandidate && (
          <CandidatePopup
            candidate={selectedCandidate}
            onClose={() => setSelectedCandidate(null)}
          />
        )}

        {/* Desktop sidebar toggle */}
        <button
          onClick={() => setSidebarOpen((o) => !o)}
          className="hidden md:flex absolute top-3 right-3 z-20 items-center gap-1.5 px-3 py-1.5 bg-white/95 backdrop-blur-sm border border-border rounded-xl shadow-md hover:bg-background transition-colors text-xs font-medium text-foreground"
          title={sidebarOpen ? "후보자 목록 닫기" : "후보자 목록 열기"}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ transition: "transform 0.2s", transform: sidebarOpen ? "rotate(180deg)" : "rotate(0deg)" }}
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
          후보자 {filteredCount}명
        </button>

        {/* Mobile bottom candidate button — fixed to avoid Chrome UI overlap */}
        {!isPanelOpen && (
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="md:hidden fixed left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-2.5 bg-white/95 backdrop-blur-sm border border-border rounded-full shadow-lg text-sm font-semibold text-foreground"
            style={{ bottom: "calc(1rem + env(safe-area-inset-bottom))" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
            후보자 {filteredCount}명
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              style={{ transition: "transform 0.2s", transform: sidebarOpen ? "rotate(180deg)" : "rotate(0deg)" }}
            >
              <path d="M18 15l-6-6-6 6" />
            </svg>
          </button>
        )}

        {/* Mobile theme toggle FAB */}
        <ThemeToggleFAB />
      </div>

      {/* Desktop: right candidate sidebar */}
      <div
        className={`hidden md:flex shrink-0 border-l border-border bg-surface flex-col overflow-hidden transition-all duration-200 ${
          sidebarOpen ? "w-64" : "w-0 border-l-0"
        }`}
      >
        <CandidateSidebar
          candidates={candidates}
          selectedDistrict={selectedDistrict}
          onSelect={handleCandidateClick}
          allCandidatesLabel={t.sidebarAllCandidates}
          noCandidateLabel={t.sidebarNoCandidate}
        />
      </div>

      {/* Mobile: bottom drawer */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="absolute bottom-0 left-0 right-0 bg-surface rounded-t-2xl flex flex-col"
            style={{ maxHeight: "70dvh" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div
              className="flex justify-center pt-3 pb-1 cursor-pointer shrink-0"
              onClick={() => setSidebarOpen(false)}
            >
              <div className="w-10 h-1 bg-border rounded-full" />
            </div>
            <div className="flex-1 overflow-y-auto">
              <CandidateSidebar
                candidates={candidates}
                selectedDistrict={selectedDistrict}
                onSelect={(c) => { handleCandidateClick(c); setSidebarOpen(false); }}
                allCandidatesLabel={t.sidebarAllCandidates}
                noCandidateLabel={t.sidebarNoCandidate}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
