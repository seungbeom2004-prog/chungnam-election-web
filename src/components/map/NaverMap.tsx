"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useMapStore } from "@/store/useMapStore";
import type { Pledge } from "@/types";

interface NaverMapProps {
  pledges: Pledge[];
  onPledgeClick: (pledge: Pledge) => void;
}

interface PinSettings {
  emoji: string;
  color: string;
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

/**
 * Build a circle+emoji SVG marker.
 * Per-pledge: category emoji/color take priority.
 * Fallback: admin-configured global pinSettings.
 */
function buildMarkerSVG(emoji: string, color: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">` +
    `<circle cx="22" cy="22" r="20" fill="${color}" stroke="white" stroke-width="2.5"/>` +
    `<text x="22" y="29" font-size="22" text-anchor="middle" font-family="sans-serif">${emoji}</text>` +
    `</svg>`;
  return "data:image/svg+xml," + encodeURIComponent(svg);
}

export default function NaverMap({ pledges, onPledgeClick }: NaverMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<naver.maps.Map | null>(null);
  const markersRef = useRef<naver.maps.Marker[]>([]);
  const listenersRef = useRef<naver.maps.MapEventListener[]>([]);
  // Ref to always hold the latest addPledgeMarkers — fixes stale closure in zoom_changed
  const addPledgeMarkersRef = useRef<(map: naver.maps.Map) => void>(() => {});
  const { center, zoomLevel, setCenter, setZoomLevel } = useMapStore();

  // Admin-configured global pin (used when pledge has no category emoji)
  const [pinSettings, setPinSettings] = useState<PinSettings>({
    emoji: "📍",
    color: "#FF5A00",
  });

  // Fetch current pin appearance from public API
  useEffect(() => {
    fetch("/api/map-settings/pin")
      .then((r) => r.json())
      .then((json) => {
        if (json.data?.emoji && json.data?.color) {
          setPinSettings({ emoji: json.data.emoji, color: json.data.color });
        }
      })
      .catch(() => {
        // Keep defaults — map stays functional even if settings API fails
      });
  }, []);

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

        // Per-pledge pin: use category emoji/color if available,
        // otherwise fall back to admin-configured global pin settings
        const emoji = pledge.category?.emoji ?? pinSettings.emoji;
        const color = pledge.category?.color ?? pinSettings.color;
        const pinUrl = buildMarkerSVG(emoji, color);

        const marker = new naver.maps.Marker({
          map,
          position,
          icon: {
            url: pinUrl,
            size: new naver.maps.Size(44, 44),
            anchor: new naver.maps.Point(22, 22),
          },
        });

        const listener = naver.maps.Event.addListener(marker, "click", () => {
          onPledgeClick(pledge);
        });

        markersRef.current.push(marker);
        listenersRef.current.push(listener);
      });
    },
    [pledges, onPledgeClick, clearMarkers, pinSettings]
  );

  // Keep the ref always pointing to the latest addPledgeMarkers.
  // This lets the stable zoom_changed listener call the latest closure
  // without needing to re-register the listener on every render.
  useEffect(() => {
    addPledgeMarkersRef.current = addPledgeMarkers;
  }, [addPledgeMarkers]);

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
      // Use ref so we always call the latest version (with current pledges + pinSettings)
      addPledgeMarkersRef.current(map);
    });

    naver.maps.Event.addListener(map, "dragend", () => {
      const c = map.getCenter() as naver.maps.LatLng;
      setCenter(c.lat(), c.lng());
    });

    addPledgeMarkersRef.current(map);

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

  // Update markers when pledges or pin settings change
  useEffect(() => {
    if (!mapInstance.current) return;
    addPledgeMarkers(mapInstance.current);
  }, [pledges, addPledgeMarkers]);

  return <div ref={mapRef} className="w-full h-full" />;
}
