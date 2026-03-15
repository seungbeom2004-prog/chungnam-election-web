"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  lat?: number | null;
  lng?: number | null;
  onChange: (lat: number, lng: number) => void;
}

// Naver Maps SDK type shims
declare global {
  interface Window {
    naver?: {
      maps: {
        Map: new (el: HTMLElement, opts: object) => NaverMapInst;
        LatLng: new (lat: number, lng: number) => NaverLatLng;
        Marker: new (opts: object) => NaverMarker;
        Event: { addListener: (t: object, e: string, h: (ev: { coord: NaverLatLng }) => void) => void };
      };
    };
  }
}

interface NaverMapInst {
  destroy: () => void;
}
interface NaverLatLng {
  lat: () => number;
  lng: () => number;
}
interface NaverMarker {
  setPosition: (p: NaverLatLng) => void;
  setMap: (m: NaverMapInst | null) => void;
}

const CENTER = { lat: 36.5184, lng: 126.8 };
const NAVER_SCRIPT_ID = "naver-maps-sdk";

function isSdkReady(): boolean {
  try {
    return !!(window.naver?.maps?.Map);
  } catch {
    return false;
  }
}

export default function LocationPickerMap({ lat, lng, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<NaverMapInst | null>(null);
  const markerRef = useRef<NaverMarker | null>(null);
  const [sdkReady, setSdkReady] = useState(false);

  // Load SDK
  useEffect(() => {
    if (isSdkReady()) { setSdkReady(true); return; }
    if (document.getElementById(NAVER_SCRIPT_ID)) {
      const t = setInterval(() => { if (isSdkReady()) { setSdkReady(true); clearInterval(t); } }, 150);
      return () => clearInterval(t);
    }
    const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;
    if (!clientId) { console.warn("NEXT_PUBLIC_NAVER_MAP_CLIENT_ID is not set"); return; }
    const s = document.createElement("script");
    s.id = NAVER_SCRIPT_ID;
    s.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}`;
    s.onload = () => setSdkReady(true);
    document.head.appendChild(s);
  }, []);

  // Init map once SDK is ready
  useEffect(() => {
    if (!sdkReady || !containerRef.current || !window.naver) return;
    const maps = window.naver.maps;

    const initLat = lat ?? CENTER.lat;
    const initLng = lng ?? CENTER.lng;

    const map = new maps.Map(containerRef.current, {
      center: new maps.LatLng(initLat, initLng),
      zoom: lat != null ? 14 : 9,
      zoomControl: true,
      zoomControlOptions: { position: 3 }, // TOP_RIGHT
    });
    mapRef.current = map;

    const marker = new maps.Marker({
      position: new maps.LatLng(initLat, initLng),
      map: lat != null ? map : null,
    });
    markerRef.current = marker;

    maps.Event.addListener(map, "click", (e) => {
      const newLat = e.coord.lat();
      const newLng = e.coord.lng();
      marker.setPosition(e.coord);
      marker.setMap(map);
      onChange(newLat, newLng);
    });

    return () => {
      map.destroy();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sdkReady]);

  // Sync lat/lng when they change externally
  useEffect(() => {
    if (!sdkReady || !mapRef.current || !markerRef.current || !window.naver) return;
    if (lat != null && lng != null) {
      const pos = new window.naver.maps.LatLng(lat, lng);
      markerRef.current.setPosition(pos);
      markerRef.current.setMap(mapRef.current);
    }
  }, [lat, lng, sdkReady]);

  if (!process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID && typeof window !== "undefined") {
    return (
      <div className="w-full h-[200px] rounded-lg border border-border bg-muted/20 flex items-center justify-center">
        <span className="text-xs text-muted">지도 API 키가 설정되지 않았습니다</span>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div
        ref={containerRef}
        className="w-full rounded-lg overflow-hidden border border-border bg-muted/10"
        style={{ height: 220 }}
      />
      <p className="text-[11px] text-muted text-center">지도를 클릭하면 위치가 선택됩니다 📍</p>
    </div>
  );
}
