"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import NaverMap from "@/components/map/NaverMap";
import PledgePanel from "@/components/map/PledgePanel";
import CandidatePopup from "@/components/map/CandidatePopup";
import { useMapStore } from "@/store/useMapStore";
import type { Pledge } from "@/types";

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
}: {
  candidates: CandidateForMap[];
  selectedDistrict: string | null;
  onSelect: (c: CandidateForMap) => void;
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
          {selectedDistrict ? selectedDistrict : "전체 후보자"}
        </p>
        <p className="text-xs text-muted">{filtered.length}명</p>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-2 opacity-40">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
          </svg>
          <p className="text-xs">등록된 후보가 없습니다</p>
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
              <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-primary/10 border-2 border-primary/30">
                {c.profileImage ? (
                  <Image
                    src={c.profileImage}
                    alt={c.name}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-primary font-bold text-sm">{c.name[0]}</span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
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

// ─── Main page ──────────────────────────────────────────────────────────────

export default function HomePage() {
  const [pledges, setPledges] = useState<Pledge[]>([]);
  const [candidates, setCandidates] = useState<CandidateForMap[]>([]);
  const [districts, setDistricts] = useState<DistrictCoords[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateForMap | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { setSelectedPledge, selectedDistrict } = useMapStore();

  // Fetch all pledges
  useEffect(() => {
    fetch("/api/pledges?limit=1000")
      .then((res) => res.json())
      .then((json) => {
        const data = json.data ?? json;
        setPledges(Array.isArray(data) ? data : []);
      })
      .catch(console.error);
  }, []);

  // Fetch all verified candidates with election + pin data
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
          }))
        );
      })
      .catch(console.error);
  }, []);

  // Fetch district center coordinates for candidate marker placement
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

  // Dynamically load Naver Maps SDK — fires onload exactly once when fully ready
  useEffect(() => {
    const SCRIPT_ID = "__naver_map_sdk__";

    // Set auth-failure handler BEFORE the script runs
    (window as unknown as Record<string, unknown>).navermap_authFailure = function () {
      setMapError(
        "네이버 지도 인증에 실패했습니다. NCP 콘솔에서 Web Dynamic Map API 활성화 및 도메인 등록을 확인하세요."
      );
    };

    // Already loaded (hot-reload or back navigation)
    if ((window as unknown as { naver?: { maps?: unknown } }).naver?.maps) {
      setMapReady(true);
      return;
    }

    // Script tag already in DOM (another component loaded it)
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      const onLoad = () => setMapReady(true);
      const onError = () =>
        setMapError("네이버 지도 SDK를 불러올 수 없습니다. 네트워크 연결을 확인하세요.");
      existing.addEventListener("load", onLoad);
      existing.addEventListener("error", onError);
      return () => {
        existing.removeEventListener("load", onLoad);
        existing.removeEventListener("error", onError);
      };
    }

    // Inject script for the first time
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID}`;
    script.async = true;
    script.onload = () => setMapReady(true);
    script.onerror = () =>
      setMapError("네이버 지도 SDK를 불러올 수 없습니다. 네트워크 연결을 확인하세요.");
    document.head.appendChild(script);
  }, []);

  const handlePledgeClick = useCallback(
    (pledge: Pledge) => { setSelectedPledge(pledge); },
    [setSelectedPledge]
  );

  const handleCandidateClick = useCallback((candidate: CandidateForMap) => {
    setSelectedCandidate(candidate);
  }, []);

  return (
    <div className="flex w-full h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Map area */}
      <div className="flex-1 relative min-w-0">
        {mapReady && !mapError ? (
          <NaverMap
            pledges={pledges}
            candidates={candidates}
            districts={districts}
            onPledgeClick={handlePledgeClick}
            onCandidateClick={handleCandidateClick}
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

        <PledgePanel />

        {selectedCandidate && (
          <CandidatePopup
            candidate={selectedCandidate}
            onClose={() => setSelectedCandidate(null)}
          />
        )}

        {/* Sidebar toggle button */}
        <button
          onClick={() => setSidebarOpen((o) => !o)}
          className="absolute top-3 right-3 z-20 w-8 h-8 bg-surface/95 backdrop-blur-sm border border-border rounded-lg flex items-center justify-center shadow-sm hover:bg-background transition-colors"
          title={sidebarOpen ? "후보자 목록 닫기" : "후보자 목록 열기"}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform ${sidebarOpen ? "rotate-0" : "rotate-180"}`}
          >
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
          </svg>
        </button>
      </div>

      {/* Right candidate sidebar */}
      {sidebarOpen && (
        <div className="w-64 shrink-0 border-l border-border bg-surface flex flex-col overflow-hidden">
          <CandidateSidebar
            candidates={candidates}
            selectedDistrict={selectedDistrict}
            onSelect={handleCandidateClick}
          />
        </div>
      )}
    </div>
  );
}
