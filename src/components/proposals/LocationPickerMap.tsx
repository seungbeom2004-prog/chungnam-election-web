"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  lat?: number | null;
  lng?: number | null;
  onChange?: (lat: number, lng: number) => void;
  cityCenter?: { lat: number; lng: number } | null;
  readOnly?: boolean;
  height?: number;
}

// Naver Maps SDK type shims
declare global {
  interface Window {
    naver?: {
      maps: {
        Map: new (el: HTMLElement, opts: object) => NaverMapInst;
        LatLng: new (lat: number, lng: number) => NaverLatLng;
        Marker: new (opts: object) => NaverMarker;
        Event: { addListener: (t: object, e: string, h: () => void) => void };
      };
    };
  }
}

interface NaverMapInst {
  destroy: () => void;
  getCenter: () => NaverLatLng;
  setCenter: (pos: NaverLatLng) => void;
  panTo?: (pos: NaverLatLng) => void;
}
interface NaverLatLng {
  lat: () => number;
  lng: () => number;
}
interface NaverMarker {
  setPosition: (p: NaverLatLng) => void;
  setMap: (m: NaverMapInst | null) => void;
}

const DEFAULT_CENTER = { lat: 36.5184, lng: 126.8 };
const NAVER_SCRIPT_ID = "naver-maps-sdk";

function isSdkReady(): boolean {
  try {
    return !!(window.naver?.maps?.Map);
  } catch {
    return false;
  }
}

export default function LocationPickerMap({
  lat,
  lng,
  onChange,
  cityCenter,
  readOnly = false,
  height = 240,
}: Props) {
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
    // Poll after load to ensure SDK is fully initialized (not just script tag parsed)
    s.onload = () => {
      const t = setInterval(() => { if (isSdkReady()) { setSdkReady(true); clearInterval(t); } }, 50);
    };
    document.head.appendChild(s);
  }, []);

  // Init map once SDK is ready
  useEffect(() => {
    if (!sdkReady || !containerRef.current || !window.naver?.maps) return;
    const maps = window.naver.maps;

    const initLat = lat ?? cityCenter?.lat ?? DEFAULT_CENTER.lat;
    const initLng = lng ?? cityCenter?.lng ?? DEFAULT_CENTER.lng;

    const map = new maps.Map(containerRef.current, {
      center: new maps.LatLng(initLat, initLng),
      zoom: readOnly ? 15 : (cityCenter ? 13 : 9),
      zoomControl: !readOnly,
      zoomControlOptions: { position: 3 }, // TOP_RIGHT
      draggable: !readOnly,
      scrollWheel: !readOnly,
      pinchZoom: !readOnly,
      mapDataControl: false,
      logoControl: false,
    });
    mapRef.current = map;

    if (readOnly) {
      // Static marker at specified location for confirmation view
      if (lat != null && lng != null) {
        const marker = new maps.Marker({
          position: new maps.LatLng(lat, lng),
          map,
        });
        markerRef.current = marker;
      }
    } else {
      // Pin-in-center drag mode: update coords on map idle
      maps.Event.addListener(map, "idle", () => {
        if (!mapRef.current || !window.naver?.maps) return;
        const center = mapRef.current.getCenter();
        onChange?.(center.lat(), center.lng());
      });
    }

    return () => {
      try { map.destroy(); } catch { /* ignore SDK cleanup errors */ }
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sdkReady, readOnly]);

  // Pan to city center when city changes (interactive mode only)
  useEffect(() => {
    const nMaps = window.naver?.maps;
    if (!sdkReady || !mapRef.current || !nMaps?.LatLng || !cityCenter || readOnly) return;
    try {
      const pos = new nMaps.LatLng(cityCenter.lat, cityCenter.lng);
      // panTo is optional in some SDK versions; fall back to setCenter
      if (mapRef.current.panTo) {
        mapRef.current.panTo(pos);
      } else {
        mapRef.current.setCenter(pos);
      }
    } catch { /* SDK not fully ready — ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityCenter?.lat, cityCenter?.lng, sdkReady, readOnly]);

  if (!process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID && typeof window !== "undefined") {
    return (
      <div
        className="w-full rounded-lg border border-border bg-muted/20 flex items-center justify-center"
        style={{ height }}
      >
        <span className="text-xs text-muted">지도 API 키가 설정되지 않았습니다</span>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div style={{ position: "relative" }}>
        <div
          ref={containerRef}
          className="w-full rounded-lg overflow-hidden border border-border bg-muted/10"
          style={{ height }}
        />
        {/* Fixed center pin — visible only in interactive (drag) mode */}
        {!readOnly && (
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -100%)",
              pointerEvents: "none",
              zIndex: 100,
              filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.45))",
            }}
          >
            <svg width="30" height="38" viewBox="0 0 30 38" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M15 0C6.716 0 0 6.716 0 15C0 23.284 15 38 15 38C15 38 30 23.284 30 15C30 6.716 23.284 0 15 0Z"
                fill="#EF4444"
              />
              <circle cx="15" cy="15" r="5.5" fill="white" />
            </svg>
          </div>
        )}
      </div>
      {!readOnly && (
        <p className="text-[11px] text-muted text-center">
          지도를 드래그해서 📍 핀 위치를 맞춰주세요
        </p>
      )}
    </div>
  );
}
