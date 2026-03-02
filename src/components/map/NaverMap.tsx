"use client";

import { useEffect, useRef, useCallback } from "react";
import { useMapStore } from "@/store/useMapStore";
import type { Pledge } from "@/types";

interface NaverMapProps {
  pledges: Pledge[];
  onPledgeClick: (pledge: Pledge) => void;
}

// Naver Maps zoom: higher = more zoomed in (opposite of Kakao)
// Naver zoom ~10 ≈ province level, ~13 ≈ city, ~15 ≈ neighborhood
// We convert our store zoomLevel (Kakao-style, lower = more zoomed in)
// to Naver zoom: naverZoom ≈ 21 - kakaoLevel
function toNaverZoom(storeLevel: number): number {
  return 21 - storeLevel;
}

function toStoreLevel(naverZoom: number): number {
  return 21 - naverZoom;
}

/** Default orange teardrop pin (used when no category emoji/color is set) */
const ORANGE_PIN_SVG =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40">' +
    '<path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.268 21.732 0 14 0z" fill="%23FF5A00"/>' +
    '<circle cx="14" cy="14" r="6" fill="white"/>' +
    "</svg>"
  );

/**
 * Build a circular emoji marker SVG with a colored border.
 * Falls back to the orange pin when no emoji or color is available.
 */
function buildMarkerIcon(pledge: Pledge): { url: string; size: [number, number] } {
  const emoji = pledge.category?.emoji;
  const color = pledge.category?.color ?? "#FF5A00";

  if (!emoji) return { url: ORANGE_PIN_SVG, size: [28, 40] };

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">` +
    `<circle cx="20" cy="20" r="18" fill="white" stroke="${color}" stroke-width="3"/>` +
    `<text x="20" y="26" text-anchor="middle" font-size="18" font-family="sans-serif">${emoji}</text>` +
    `</svg>`;

  return {
    url: "data:image/svg+xml," + encodeURIComponent(svg),
    size: [40, 40],
  };
}

export default function NaverMap({ pledges, onPledgeClick }: NaverMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<naver.maps.Map | null>(null);
  const markersRef = useRef<naver.maps.Marker[]>([]);
  const listenersRef = useRef<naver.maps.MapEventListener[]>([]);
  const { center, zoomLevel, setCenter, setZoomLevel } = useMapStore();

  const clearMarkers = useCallback(() => {
    listenersRef.current.forEach((l) => naver.maps.Event.removeListener(l));
    listenersRef.current = [];
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
  }, []);

  const addPledgeMarkers = useCallback(
    (map: naver.maps.Map) => {
      clearMarkers();
      if (!Array.isArray(pledges)) return;

      pledges.forEach((pledge) => {
        const position = new naver.maps.LatLng(
          pledge.latitude,
          pledge.longitude
        );

        const { url, size } = buildMarkerIcon(pledge);

        const marker = new naver.maps.Marker({
          map,
          position,
          icon: {
            url,
            size: new naver.maps.Size(size[0], size[1]),
            anchor: new naver.maps.Point(size[0] / 2, size[1] / 2),
          },
        });

        const listener = naver.maps.Event.addListener(marker, "click", () => {
          onPledgeClick(pledge);
        });

        markersRef.current.push(marker);
        listenersRef.current.push(listener);
      });
    },
    [pledges, onPledgeClick, clearMarkers]
  );

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || typeof naver === "undefined") return;

    const map = new naver.maps.Map(mapRef.current, {
      center: new naver.maps.LatLng(center.lat, center.lng),
      zoom: toNaverZoom(zoomLevel),
      zoomControl: true,
      zoomControlOptions: {
        position: naver.maps.Position.TOP_RIGHT,
      },
    });

    mapInstance.current = map;

    naver.maps.Event.addListener(map, "zoom_changed", () => {
      setZoomLevel(toStoreLevel(map.getZoom()));
      addPledgeMarkers(map);
    });

    naver.maps.Event.addListener(map, "dragend", () => {
      const c = map.getCenter() as naver.maps.LatLng;
      setCenter(c.lat(), c.lng());
    });

    addPledgeMarkers(map);

    return () => {
      clearMarkers();
      map.destroy();
      mapInstance.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync external center/zoom changes to map
  useEffect(() => {
    if (!mapInstance.current) return;
    mapInstance.current.setCenter(
      new naver.maps.LatLng(center.lat, center.lng)
    );
    mapInstance.current.setZoom(toNaverZoom(zoomLevel));
  }, [center, zoomLevel]);

  // Update markers when pledges change
  useEffect(() => {
    if (!mapInstance.current) return;
    addPledgeMarkers(mapInstance.current);
  }, [pledges, addPledgeMarkers]);

  return <div ref={mapRef} className="w-full h-full" />;
}
