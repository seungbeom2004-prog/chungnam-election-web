"use client";

import { useEffect, useState, useCallback } from "react";
import NaverMap from "@/components/map/NaverMap";
import PledgePanel from "@/components/map/PledgePanel";
import { useMapStore } from "@/store/useMapStore";
import type { Pledge } from "@/types";

export default function HomePage() {
  const [pledges, setPledges] = useState<Pledge[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const { setSelectedPledge } = useMapStore();

  useEffect(() => {
    fetch("/api/pledges")
      .then((res) => res.json())
      .then(setPledges)
      .catch(console.error);
  }, []);

  // Wait for Naver Maps SDK to be available
  useEffect(() => {
    const check = () => {
      if (typeof naver !== "undefined" && naver.maps) {
        setMapReady(true);
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
            <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-muted">지도를 불러오는 중...</p>
          </div>
        </div>
      )}

      <PledgePanel />
    </div>
  );
}
