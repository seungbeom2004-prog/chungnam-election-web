"use client";

/**
 * CityView – renders the full pledge map pre-centred on a specific district.
 * It reuses the same NaverMap + PledgePanel as the home page, but seeds the
 * Zustand map store with the district's coordinates on first mount.
 */
import { useEffect, useState, useCallback } from "react";
import NaverMap from "@/components/map/NaverMap";
import PledgePanel from "@/components/map/PledgePanel";
import { useMapStore } from "@/store/useMapStore";
import type { Pledge } from "@/types";

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
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const { setCenter, setZoomLevel, setSelectedDistrict, setSelectedPledge } =
    useMapStore();

  // Pre-select the district in the map store
  useEffect(() => {
    setCenter(district.centerLat, district.centerLng);
    setZoomLevel(CITY_ZOOM);
    setSelectedDistrict(district.name);
  }, [district, setCenter, setZoomLevel, setSelectedDistrict]);

  // Fetch all visible pledges (optionally filtered by district via API)
  useEffect(() => {
    fetch(`/api/pledges?limit=1000&district=${encodeURIComponent(district.name)}`)
      .then((res) => res.json())
      .then((json) => {
        const data = json.data ?? json;
        setPledges(Array.isArray(data) ? data : []);
      })
      .catch(console.error);
  }, [district.name]);

  // Wait for Naver Maps SDK
  useEffect(() => {
    (window as unknown as Record<string, unknown>).navermap_authFailure =
      function () {
        setMapError("네이버 지도 인증에 실패했습니다.");
      };

    let attempts = 0;
    const check = () => {
      attempts++;
      if (typeof naver !== "undefined" && naver.maps) {
        setMapReady(true);
      } else if (attempts >= 50) {
        setMapError("네이버 지도 SDK를 불러올 수 없습니다.");
      } else {
        setTimeout(check, 100);
      }
    };
    check();
  }, []);

  const handlePledgeClick = useCallback(
    (pledge: Pledge) => setSelectedPledge(pledge),
    [setSelectedPledge]
  );

  return (
    <div className="relative w-full h-[calc(100vh-3.5rem)]">
      {mapReady ? (
        <NaverMap pledges={pledges} onPledgeClick={handlePledgeClick} />
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
    </div>
  );
}
