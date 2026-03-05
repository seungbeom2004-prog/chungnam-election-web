"use client";

/**
 * CityView – renders the full pledge map pre-centred on a specific district.
 * Shows both pledge markers and candidate profile markers for the city.
 */
import { useEffect, useState, useCallback } from "react";
import NaverMap from "@/components/map/NaverMap";
import PledgePanel from "@/components/map/PledgePanel";
import CandidatePopup from "@/components/map/CandidatePopup";
import { useMapStore } from "@/store/useMapStore";
import type { Pledge } from "@/types";
import type { CandidateForMap, DistrictCoords } from "@/app/page";

interface DistrictInfo {
  name: string;
  code: string;
  centerLat: number;
  centerLng: number;
}

interface Props {
  district: DistrictInfo;
}

const CITY_ZOOM = 6; // store level 6 → naverZoom 15 ≈ city scale

export default function CityView({ district }: Props) {
  const [pledges, setPledges] = useState<Pledge[]>([]);
  const [candidates, setCandidates] = useState<CandidateForMap[]>([]);
  const [districts, setDistricts] = useState<DistrictCoords[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [selectedCandidate, setSelectedCandidate] =
    useState<CandidateForMap | null>(null);

  const { setCenter, setZoomLevel, setSelectedDistrict, setSelectedPledge } =
    useMapStore();

  // Pre-select the district in the map store
  useEffect(() => {
    setCenter(district.centerLat, district.centerLng);
    setZoomLevel(CITY_ZOOM);
    setSelectedDistrict(district.name);
  }, [district, setCenter, setZoomLevel, setSelectedDistrict]);

  // Fetch pledges for this district
  useEffect(() => {
    fetch(
      `/api/pledges?limit=1000&district=${encodeURIComponent(district.name)}`
    )
      .then((res) => res.json())
      .then((json) => {
        const data = json.data ?? json;
        setPledges(Array.isArray(data) ? data : []);
      })
      .catch(console.error);
  }, [district.name]);

  // Fetch candidates for this district
  useEffect(() => {
    fetch(
      `/api/candidates?limit=200&district=${encodeURIComponent(district.name)}`
    )
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
            pinLat: (c as { pinLat?: number | null }).pinLat ?? null,
            pinLng: (c as { pinLng?: number | null }).pinLng ?? null,
          }))
        );
      })
      .catch(console.error);
  }, [district.name]);

  // Fetch all districts for candidate marker coordinates
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

  // Dynamically load Naver Maps SDK — same approach as home page.
  useEffect(() => {
    const SCRIPT_ID = "__naver_map_sdk__";

    (window as unknown as Record<string, unknown>).navermap_authFailure =
      function () {
        setMapError("네이버 지도 인증에 실패했습니다.");
      };

    // Already loaded
    if ((window as unknown as { naver?: { maps?: unknown } }).naver?.maps) {
      setMapReady(true);
      return;
    }

    // Script tag already injected (home page may have loaded it)
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      const onLoad = () => setMapReady(true);
      const onError = () => setMapError("네이버 지도 SDK를 불러올 수 없습니다.");
      existing.addEventListener("load", onLoad);
      existing.addEventListener("error", onError);
      return () => {
        existing.removeEventListener("load", onLoad);
        existing.removeEventListener("error", onError);
      };
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID}`;
    script.async = true;
    script.onload = () => setMapReady(true);
    script.onerror = () => setMapError("네이버 지도 SDK를 불러올 수 없습니다.");
    document.head.appendChild(script);
  }, []);

  const handlePledgeClick = useCallback(
    (pledge: Pledge) => setSelectedPledge(pledge),
    [setSelectedPledge]
  );

  const handleCandidateClick = useCallback(
    (candidate: CandidateForMap) => setSelectedCandidate(candidate),
    []
  );

  return (
    <div className="relative w-full h-[calc(100vh-3.5rem)]">
      {mapReady ? (
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

      {/* District label overlay */}
      <div className="absolute top-3 left-3 z-10 bg-surface/90 backdrop-blur-sm px-3 py-1.5 rounded-full border border-border shadow-sm">
        <span className="text-sm font-medium text-foreground">
          📍 {district.name}
        </span>
      </div>

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
