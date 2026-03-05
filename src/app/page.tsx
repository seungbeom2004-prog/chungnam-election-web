"use client";

import { useEffect, useState, useCallback } from "react";
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
}

export interface DistrictCoords {
  name: string;
  centerLat: number;
  centerLng: number;
}

export default function HomePage() {
  const [pledges, setPledges] = useState<Pledge[]>([]);
  const [candidates, setCandidates] = useState<CandidateForMap[]>([]);
  const [districts, setDistricts] = useState<DistrictCoords[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateForMap | null>(null);
  const { setSelectedPledge } = useMapStore();

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

  // Fetch all candidates (verified) with election data
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
          }))
        );
      })
      .catch(console.error);
  }, []);

  // Fetch districts for candidate marker coordinates
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

  // Dynamically load Naver Maps SDK — fires onload exactly once when fully ready.
  // This is more reliable than polling because:
  //   1. `script.onload` fires after the JS *and* inline setup runs
  //   2. No race conditions from Next.js Script component in server layouts
  //   3. Works across all browsers/platforms including mobile WebViews
  useEffect(() => {
    const SCRIPT_ID = "__naver_map_sdk__";

    // Set auth-failure handler BEFORE the script runs
    (window as unknown as Record<string, unknown>).navermap_authFailure =
      function () {
        setMapError(
          "네이버 지도 인증에 실패했습니다. NCP 콘솔에서 Web Dynamic Map API 활성화 및 도메인 등록을 확인하세요."
        );
      };

    // Already loaded (e.g., hot-reload or back navigation)
    if (
      (window as unknown as { naver?: { maps?: unknown } }).naver?.maps
    ) {
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
    (pledge: Pledge) => {
      setSelectedPledge(pledge);
    },
    [setSelectedPledge]
  );

  const handleCandidateClick = useCallback((candidate: CandidateForMap) => {
    setSelectedCandidate(candidate);
  }, []);

  return (
    <div className="relative w-full h-[calc(100vh-3.5rem)]">
      {/* Show NaverMap only when SDK is ready AND there's no fatal auth error */}
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
    </div>
  );
}
