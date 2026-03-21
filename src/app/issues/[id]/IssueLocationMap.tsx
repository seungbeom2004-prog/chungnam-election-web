"use client";

import { useEffect, useRef, useState } from "react";

interface MarkerData {
  lat: number;
  lng: number;
  title: string;
}

interface Props {
  markers: MarkerData[];
}

const NAVER_SCRIPT_ID = "naver-maps-sdk";
const CENTER = { lat: 36.5184, lng: 126.8 };

function isSdkReady(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return !!((window as any).naver?.maps?.Map);
  } catch {
    return false;
  }
}

export default function IssueLocationMap({ markers }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  const [sdkReady, setSdkReady] = useState(false);

  useEffect(() => {
    if (isSdkReady()) {
      setSdkReady(true);
      return;
    }
    if (document.getElementById(NAVER_SCRIPT_ID)) {
      const t = setInterval(() => {
        if (isSdkReady()) {
          setSdkReady(true);
          clearInterval(t);
        }
      }, 150);
      return () => clearInterval(t);
    }
    const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;
    if (!clientId) {
      return;
    }
    const s = document.createElement("script");
    s.id = NAVER_SCRIPT_ID;
    s.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}`;
    s.onload = () => setSdkReady(true);
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    if (!sdkReady || !containerRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const naver = (window as any).naver;
    if (!naver?.maps) return;
    const maps = naver.maps;

    const firstMarker = markers[0];
    const centerLat = firstMarker?.lat ?? CENTER.lat;
    const centerLng = firstMarker?.lng ?? CENTER.lng;

    const map = new maps.Map(containerRef.current, {
      center: new maps.LatLng(centerLat, centerLng),
      zoom: markers.length === 1 ? 14 : 10,
      zoomControl: true,
      zoomControlOptions: { position: 3 },
    });
    mapRef.current = map;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const naverMarkers: any[] = [];

    for (const m of markers) {
      const marker = new maps.Marker({
        position: new maps.LatLng(m.lat, m.lng),
        map,
        title: m.title,
      });
      naverMarkers.push(marker);
    }

    // Fit bounds if multiple markers
    if (markers.length > 1) {
      const sw = new maps.LatLng(
        Math.min(...markers.map((m) => m.lat)),
        Math.min(...markers.map((m) => m.lng))
      );
      const ne = new maps.LatLng(
        Math.max(...markers.map((m) => m.lat)),
        Math.max(...markers.map((m) => m.lng))
      );
      const bounds = new maps.LatLngBounds(sw, ne);
      map.fitBounds(bounds, { top: 30, right: 30, bottom: 30, left: 30 });
    }

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      naverMarkers.forEach((m: any) => m.setMap(null));
      map.destroy();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sdkReady, markers]);

  if (
    !process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID &&
    typeof window !== "undefined"
  ) {
    return (
      <div className="w-full h-64 rounded-lg border border-border bg-surface flex items-center justify-center">
        <span className="text-xs text-muted">
          지도 API 키가 설정되지 않았습니다
        </span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full rounded-lg overflow-hidden border border-border bg-surface"
      style={{ height: 300 }}
    />
  );
}
