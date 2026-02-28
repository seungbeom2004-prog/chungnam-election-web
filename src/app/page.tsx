"use client";

import { useEffect, useState, useCallback } from "react";
import NaverMap from "@/components/map/NaverMap";
import PledgePanel from "@/components/map/PledgePanel";
import { useMapStore } from "@/store/useMapStore";
import type { Pledge } from "@/types";

export default function HomePage() {
  const [pledges, setPledges] = useState<Pledge[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const { setSelectedPledge } = useMapStore();

  useEffect(() => {
    fetch("/api/pledges")
      .then((res) => res.json())
      .then(setPledges)
      .catch(console.error);
  }, []);

  // Register auth failure handler & wait for Naver Maps SDK
  useEffect(() => {
    // Auth failure callback from Naver Maps SDK
    (window as unknown as Record<string, unknown>).navermap_authFailure =
      function () {
        console.error("[NaverMap] Authentication failed. Check:");
        console.error("1. ncpKeyId is correct");
        console.error("2. Web Dynamic Map API is enabled in NCP console");
        console.error("3. Domain is registered in NCP Application settings");
        setMapError("네이버 지도 인증에 실패했습니다. NCP 콘솔에서 Web Dynamic Map API 활성화 및 도메인 등록을 확인하세요.");
      };

    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max

    const check = () => {
      attempts++;
      if (typeof naver !== "undefined" && naver.maps) {
        setMapReady(true);
      } else if (attempts >= maxAttempts) {
        setMapError("네이버 지도 SDK를 불러올 수 없습니다. 네트워크 연결을 확인하세요.");
      } else {
        setTimeout(check, 100);
      }
    };
    check();
  }, []);

  const handlePledgeClick = useCallback(
    (pledge: Pledge) => {
      setSelectedPledge(pledge);
    },
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
                <p className="text-xs text-muted mt-2">
                  Client ID: {process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID?.slice(0, 4)}***
                </p>
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
    </div>
  );
}
