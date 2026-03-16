"use client";

import { useEffect, useRef } from "react";

declare const naver: {
  maps: {
    Map: new (el: HTMLElement, opts: object) => NaverMapInstance;
    LatLng: new (lat: number, lng: number) => NaverLatLng;
    Marker: new (opts: object) => NaverMarker;
    Event: {
      addListener: (target: unknown, event: string, cb: (e: NaverMouseEvent) => void) => NaverListener;
      removeListener: (listener: NaverListener) => void;
    };
  };
};

interface NaverMapInstance {
  destroy(): void;
  setCenter(latlng: NaverLatLng): void;
  setZoom(z: number): void;
  getZoom(): number;
}
interface NaverLatLng { lat(): number; lng(): number; }
interface NaverMarker { setMap(m: NaverMapInstance | null): void; setPosition(p: NaverLatLng): void; }
interface NaverListener { remove?: () => void; }
interface NaverMouseEvent { coord: NaverLatLng; }

function waitForNaver(cb: () => void): () => void {
  let attempts = 0;
  let cancelled = false;
  const check = () => {
    if (cancelled) return;
    if (typeof naver !== "undefined" && naver.maps) { cb(); return; }
    if (++attempts < 40) setTimeout(check, 50);
  };
  check();
  return () => { cancelled = true; };
}

interface PinPickerMapProps {
  lat: number | null;
  lng: number | null;
  centerLat?: number;
  centerLng?: number;
  onPick: (lat: number, lng: number) => void;
}

const BRAND_COLOR = "#FF5A00";

export default function PinPickerMap({
  lat,
  lng,
  centerLat = 36.5184,
  centerLng = 126.8,
  onPick,
}: PinPickerMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<NaverMapInstance | null>(null);
  const markerRef = useRef<NaverMarker | null>(null);
  const clickListenerRef = useRef<NaverListener | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;
    const container = mapRef.current;
    let rafId: number;
    let cancelWait: (() => void) | null = null;

    const pinLat = lat ?? centerLat;
    const pinLng = lng ?? centerLng;

    const initMap = () => {
      if (container.offsetWidth === 0 || container.offsetHeight === 0) {
        rafId = requestAnimationFrame(initMap);
        return;
      }
      while (container.firstChild) container.removeChild(container.firstChild);

      const map = new naver.maps.Map(container, {
        center: new naver.maps.LatLng(pinLat, pinLng),
        zoom: 14,
        zoomControl: false,
        scaleControl: false,
      });
      mapInstance.current = map;

      // Place initial marker
      const marker = new naver.maps.Marker({
        map,
        position: new naver.maps.LatLng(pinLat, pinLng),
        icon: {
          content:
            `<div style="width:28px;height:28px;background:${BRAND_COLOR};border-radius:50%;` +
            `border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);cursor:pointer;` +
            `display:flex;align-items:center;justify-content:center;">` +
            `<span style="font-size:14px;">📍</span></div>`,
          anchor: { x: 14, y: 14 },
        },
      });
      markerRef.current = marker;

      // Click to pick new position
      const listener = naver.maps.Event.addListener(
        map,
        "click",
        (e: NaverMouseEvent) => {
          const newLat = e.coord.lat();
          const newLng = e.coord.lng();
          marker.setPosition(new naver.maps.LatLng(newLat, newLng));
          onPick(newLat, newLng);
        }
      );
      clickListenerRef.current = listener;
    };

    cancelWait = waitForNaver(() => {
      rafId = requestAnimationFrame(initMap);
    });

    return () => {
      cancelWait?.();
      cancelAnimationFrame(rafId);
      if (clickListenerRef.current) {
        naver.maps.Event.removeListener(clickListenerRef.current);
        clickListenerRef.current = null;
      }
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
      if (mapInstance.current) {
        mapInstance.current.destroy();
        mapInstance.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update marker and center when lat/lng prop changes from outside
  useEffect(() => {
    if (!mapInstance.current || !markerRef.current || lat == null || lng == null) return;
    const pos = new naver.maps.LatLng(lat, lng);
    markerRef.current.setPosition(pos);
    mapInstance.current.setCenter(pos);
  }, [lat, lng]);

  return (
    <div className="relative w-full" style={{ height: 220 }}>
      <div
        ref={mapRef}
        className="w-full h-full rounded-lg overflow-hidden border border-border"
        style={{ display: "block" }}
      />
      {/* Custom zoom controls */}
      <div className="absolute top-2 right-2 flex flex-col gap-1 z-10">
        <button
          type="button"
          onClick={() => mapInstance.current?.setZoom((mapInstance.current.getZoom() ?? 14) + 1)}
          className="w-8 h-8 bg-white border border-border rounded-lg shadow-sm flex items-center justify-center text-foreground hover:bg-gray-50 transition-colors font-semibold text-sm leading-none"
          aria-label="확대"
          title="확대"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => mapInstance.current?.setZoom((mapInstance.current.getZoom() ?? 14) - 1)}
          className="w-8 h-8 bg-white border border-border rounded-lg shadow-sm flex items-center justify-center text-foreground hover:bg-gray-50 transition-colors font-semibold text-sm leading-none"
          aria-label="축소"
          title="축소"
        >
          −
        </button>
      </div>
      <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm text-xs text-muted px-2 py-1 rounded shadow-sm pointer-events-none">
        지도를 클릭하여 핀 위치 설정
      </div>
    </div>
  );
}
