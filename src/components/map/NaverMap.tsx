"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useMapStore } from "@/store/useMapStore";
import type { Pledge } from "@/types";
import type { CandidateForMap, DistrictCoords } from "@/app/page";

interface NaverMapProps {
  pledges: Pledge[];
  candidates: CandidateForMap[];
  districts: DistrictCoords[];
  onPledgeClick: (pledge: Pledge) => void;
  onCandidateClick: (candidate: CandidateForMap) => void;
}

interface PinSettings {
  emoji: string;
  color: string;
  iconImage: string | null;
}

// Naver Maps zoom: higher = more zoomed in; naverZoom ≈ 21 - storeLevel
function toNaverZoom(storeLevel: number): number { return 21 - storeLevel; }
function toStoreLevel(naverZoom: number): number { return 21 - naverZoom; }

/**
 * Poll for the naver.maps global up to 20 × 50 ms = 1 s.
 * Returns a cancel function. Handles the race between script.onload →
 * React state update → re-render → useEffect where typeof naver might
 * not yet be defined when the effect body runs.
 */
function waitForNaver(cb: () => void): () => void {
  let attempts = 0;
  let cancelled = false;
  const check = () => {
    if (cancelled) return;
    if (typeof naver !== "undefined" && naver.maps) { cb(); return; }
    if (++attempts < 20) setTimeout(check, 50);
  };
  check();
  return () => { cancelled = true; };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const BRAND_COLOR = "#FF5A00";

/**
 * Build HTML for a pledge/category map marker.
 * Uses a rounded-square pin (no circle). Supports photo icon.
 */
function buildPledgeMarkerHTML(
  emoji: string,
  color: string,
  iconImage: string | null
): string {
  const inner = iconImage
    ? `<img src="${escapeHtml(iconImage)}" style="width:100%;height:100%;object-fit:cover;" />`
    : `<span style="font-size:20px;line-height:1;font-family:sans-serif;">${emoji}</span>`;
  return (
    `<div style="width:40px;height:40px;background:${color};border-radius:10px;` +
    `border:2.5px solid white;display:flex;align-items:center;justify-content:center;` +
    `overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.3);cursor:pointer;">` +
    inner +
    `</div>`
  );
}

/**
 * Build HTML for a candidate map marker.
 * Shows election type and district in the info box.
 */
function buildCandidateMarkerHTML(candidate: CandidateForMap): string {
  // Show election type first, then status
  const electionLabel = candidate.electionType || candidate.electionName || "";
  const statusParts = [electionLabel, candidate.candidateStatus].filter(Boolean);
  const statusLine = statusParts.join(" · ");

  const imgContent = candidate.profileImage
    ? `<img src="${escapeHtml(candidate.profileImage)}" style="width:100%;height:100%;object-fit:cover;display:block;" loading="lazy" />`
    : `<span style="font-size:22px;font-weight:800;color:white;font-family:sans-serif;">${escapeHtml(candidate.name.charAt(0))}</span>`;

  return (
    `<div style="width:110px;text-align:center;cursor:pointer;user-select:none;pointer-events:auto;">` +
    `<div style="display:inline-flex;align-items:center;justify-content:center;width:64px;height:64px;border-radius:14px;overflow:hidden;border:3px solid ${BRAND_COLOR};background:${BRAND_COLOR};box-shadow:0 4px 12px rgba(0,0,0,0.35);">` +
    imgContent +
    `</div>` +
    `<div style="background:#fff;border:2px solid ${BRAND_COLOR};border-radius:10px;padding:5px 8px;margin-top:4px;box-shadow:0 2px 8px rgba(0,0,0,0.15);">` +
    `<div style="font-weight:800;font-size:13px;color:#111;line-height:1.3;font-family:sans-serif;">${escapeHtml(candidate.name)}</div>` +
    (statusLine
      ? `<div style="font-size:9px;color:#666;margin-top:2px;line-height:1.3;font-family:sans-serif;">${escapeHtml(statusLine)}</div>`
      : "") +
    `<div style="font-size:9px;color:${BRAND_COLOR};margin-top:1px;line-height:1.3;font-family:sans-serif;">${escapeHtml(candidate.district)}</div>` +
    `</div>` +
    `</div>`
  );
}

export default function NaverMap({
  pledges,
  candidates,
  districts,
  onPledgeClick,
  onCandidateClick,
}: NaverMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<naver.maps.Map | null>(null);

  const pledgeMarkersRef = useRef<naver.maps.Marker[]>([]);
  const pledgeListenersRef = useRef<naver.maps.MapEventListener[]>([]);
  const candidateMarkersRef = useRef<naver.maps.Marker[]>([]);
  const candidateListenersRef = useRef<naver.maps.MapEventListener[]>([]);

  // Keep refs to latest callbacks to avoid stale closures in stable listeners
  const addPledgeMarkersRef = useRef<(map: naver.maps.Map) => void>(() => {});
  const addCandidateMarkersRef = useRef<(map: naver.maps.Map) => void>(() => {});

  const { center, zoomLevel, setCenter, setZoomLevel } = useMapStore();

  const [pinSettings, setPinSettings] = useState<PinSettings>({
    emoji: "📍",
    color: "#FF5A00",
    iconImage: null,
  });

  useEffect(() => {
    fetch("/api/map-settings/pin")
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          setPinSettings({
            emoji: json.data.emoji || "📍",
            color: json.data.color || "#FF5A00",
            iconImage: json.data.iconImage || null,
          });
          // Apply admin-configured default zoom on first load
          if (json.data.defaultZoom != null) {
            setZoomLevel(Number(json.data.defaultZoom));
          }
        }
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Clear helpers ──────────────────────────────────────────────────────────

  const clearPledgeMarkers = useCallback(() => {
    pledgeListenersRef.current.forEach((l) => naver.maps.Event.removeListener(l));
    pledgeListenersRef.current = [];
    pledgeMarkersRef.current.forEach((m) => m.setMap(null));
    pledgeMarkersRef.current = [];
  }, []);

  const clearCandidateMarkers = useCallback(() => {
    candidateListenersRef.current.forEach((l) => naver.maps.Event.removeListener(l));
    candidateListenersRef.current = [];
    candidateMarkersRef.current.forEach((m) => m.setMap(null));
    candidateMarkersRef.current = [];
  }, []);

  // ─── Pledge markers ────────────────────────────────────────────────────────

  const addPledgeMarkers = useCallback(
    (map: naver.maps.Map) => {
      clearPledgeMarkers();
      if (!Array.isArray(pledges)) return;

      pledges.forEach((pledge) => {
        const position = new naver.maps.LatLng(pledge.latitude, pledge.longitude);
        const emoji = pledge.category?.emoji ?? pinSettings.emoji;
        const color = pledge.category?.color ?? pinSettings.color;
        const iconImage =
          (pledge.category as { iconImage?: string | null } | undefined)?.iconImage ??
          pinSettings.iconImage;

        const marker = new naver.maps.Marker({
          map,
          position,
          icon: {
            content: buildPledgeMarkerHTML(emoji, color, iconImage ?? null),
            anchor: new naver.maps.Point(20, 20),
          },
          zIndex: 50,
        });

        const listener = naver.maps.Event.addListener(
          marker,
          "click",
          () => onPledgeClick(pledge)
        );
        pledgeMarkersRef.current.push(marker);
        pledgeListenersRef.current.push(listener);
      });
    },
    [pledges, onPledgeClick, clearPledgeMarkers, pinSettings]
  );

  // ─── Candidate markers ─────────────────────────────────────────────────────

  const addCandidateMarkers = useCallback(
    (map: naver.maps.Map) => {
      clearCandidateMarkers();
      if (!Array.isArray(candidates) || !Array.isArray(districts)) return;

      // Group by district for spread calculation
      const byDistrict: Record<string, CandidateForMap[]> = {};
      candidates.forEach((c) => {
        if (!byDistrict[c.district]) byDistrict[c.district] = [];
        byDistrict[c.district].push(c);
      });

      candidates.forEach((candidate) => {
        let lat: number;
        let lng: number;

        if (candidate.pinLat != null && candidate.pinLng != null) {
          // Admin-configured custom pin position
          lat = candidate.pinLat;
          lng = candidate.pinLng;
        } else {
          // Fall back to district center, with spreading for co-district candidates
          const districtInfo =
            districts.find((d) => d.name === candidate.district) ||
            // Partial match for ward-level districts (e.g. "천안시동남구 다선거구" → "천안시동남구")
            districts.find((d) => candidate.district.startsWith(d.name));

          if (!districtInfo) return;

          const sameDistrict = byDistrict[candidate.district];
          const idx = sameDistrict.findIndex((c) => c.id === candidate.id);
          const total = sameDistrict.length;

          lat = districtInfo.centerLat;
          lng = districtInfo.centerLng + (idx - (total - 1) / 2) * 0.004;
        }

        const marker = new naver.maps.Marker({
          map,
          position: new naver.maps.LatLng(lat, lng),
          icon: {
            content: buildCandidateMarkerHTML(candidate),
            // Anchor at center of the 64px profile image within the 110px wrapper
            anchor: new naver.maps.Point(55, 35),
          },
          zIndex: 100,
        });

        const listener = naver.maps.Event.addListener(
          marker,
          "click",
          () => onCandidateClick(candidate)
        );
        candidateMarkersRef.current.push(marker);
        candidateListenersRef.current.push(listener);
      });
    },
    [candidates, districts, onCandidateClick, clearCandidateMarkers]
  );

  useEffect(() => { addPledgeMarkersRef.current = addPledgeMarkers; }, [addPledgeMarkers]);
  useEffect(() => { addCandidateMarkersRef.current = addCandidateMarkers; }, [addCandidateMarkers]);

  // ─── Initialize map ────────────────────────────────────────────────────────
  //
  // Three known issues this implementation addresses:
  //
  // 1. NAVER GLOBAL RACE: script.onload fires → React setState → re-render →
  //    useEffect runs. On some devices/browsers the naver global isn't yet
  //    available when the effect body executes. waitForNaver() polls until it is.
  //
  // 2. DIRTY CONTAINER (StrictMode / navigation):
  //    map.destroy() leaves child nodes. new naver.maps.Map() on a dirty div
  //    silently skips tile rendering. Fix: clear all children first.
  //
  // 3. ZERO-DIMENSION CONTAINER:
  //    The container needs non-zero offsetWidth/Height before map creation.
  //    requestAnimationFrame retries until the layout is painted.
  //
  // 4. PREMATURE RESIZE:
  //    Event.trigger(map, "resize") synchronously after new Map() fires before
  //    the tile pipeline is ready. Defer it 300 ms.
  //
  useEffect(() => {
    if (!mapRef.current) return;
    const container = mapRef.current;
    let rafId: number;
    let resizeTimer: ReturnType<typeof setTimeout>;
    let cancelWait: (() => void) | null = null;

    const initMap = () => {
      // Guard: must have painted dimensions (fix 3)
      if (container.offsetWidth === 0 || container.offsetHeight === 0) {
        rafId = requestAnimationFrame(initMap);
        return;
      }

      // Clear any children left by a previous map.destroy() (fix 2)
      while (container.firstChild) container.removeChild(container.firstChild);

      const map = new naver.maps.Map(container, {
        center: new naver.maps.LatLng(center.lat, center.lng),
        zoom: toNaverZoom(zoomLevel),
        zoomControl: true,
        zoomControlOptions: { position: naver.maps.Position.TOP_RIGHT },
      });

      mapInstance.current = map;

      // Deferred resize so tile pipeline has time to initialize (fix 4)
      resizeTimer = setTimeout(() => {
        if (mapInstance.current === map) naver.maps.Event.trigger(map, "resize");
      }, 300);

      naver.maps.Event.addListener(map, "zoom_changed", () => {
        setZoomLevel(toStoreLevel(map.getZoom()));
        addPledgeMarkersRef.current(map);
        addCandidateMarkersRef.current(map);
      });

      naver.maps.Event.addListener(map, "dragend", () => {
        const c = map.getCenter() as naver.maps.LatLng;
        setCenter(c.lat(), c.lng());
      });

      addPledgeMarkersRef.current(map);
      addCandidateMarkersRef.current(map);
    };

    // Wait for naver.maps global (fix 1), then schedule initMap on next frame
    cancelWait = waitForNaver(() => {
      rafId = requestAnimationFrame(initMap);
    });

    return () => {
      cancelWait?.();
      cancelAnimationFrame(rafId);
      clearTimeout(resizeTimer);
      clearPledgeMarkers();
      clearCandidateMarkers();
      if (mapInstance.current) {
        mapInstance.current.destroy();
        mapInstance.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync external center/zoom changes to map
  useEffect(() => {
    if (!mapInstance.current) return;
    mapInstance.current.setCenter(new naver.maps.LatLng(center.lat, center.lng));
    mapInstance.current.setZoom(toNaverZoom(zoomLevel));
  }, [center, zoomLevel]);

  // Refresh pledge markers when data or pin settings change
  useEffect(() => {
    if (!mapInstance.current) return;
    addPledgeMarkers(mapInstance.current);
  }, [pledges, addPledgeMarkers]);

  // Refresh candidate markers when data or districts change
  useEffect(() => {
    if (!mapInstance.current) return;
    addCandidateMarkers(mapInstance.current);
  }, [candidates, districts, addCandidateMarkers]);

  return (
    <div
      ref={mapRef}
      className="w-full h-full"
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}
