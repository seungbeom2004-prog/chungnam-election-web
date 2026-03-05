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
}

// Naver Maps zoom: higher = more zoomed in
// naverZoom ≈ 21 - kakaoLevel
function toNaverZoom(storeLevel: number): number {
  return 21 - storeLevel;
}

function toStoreLevel(naverZoom: number): number {
  return 21 - naverZoom;
}

function buildMarkerSVG(emoji: string, color: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">` +
    `<circle cx="22" cy="22" r="20" fill="${color}" stroke="white" stroke-width="2.5"/>` +
    `<text x="22" y="29" font-size="22" text-anchor="middle" font-family="sans-serif">${emoji}</text>` +
    `</svg>`;
  return "data:image/svg+xml," + encodeURIComponent(svg);
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
 * Build HTML content for a candidate map marker.
 * Structure: rounded-square profile image + info box below.
 * Marker anchor is set to (55, 34) — center of the 64px profile image.
 */
function buildCandidateMarkerHTML(candidate: CandidateForMap): string {
  const electionLabel =
    candidate.electionName || candidate.electionType || "";
  const statusLine = [electionLabel, candidate.candidateStatus]
    .filter(Boolean)
    .join(" ");

  const imgContent = candidate.profileImage
    ? `<img src="${escapeHtml(candidate.profileImage)}" style="width:100%;height:100%;object-fit:cover;display:block;" loading="lazy" />`
    : `<span style="font-size:22px;font-weight:800;color:white;font-family:sans-serif;">${escapeHtml(candidate.name.charAt(0))}</span>`;

  return (
    `<div style="width:110px;text-align:center;cursor:pointer;user-select:none;pointer-events:auto;">` +
    // Profile image — 64×64 rounded square with brand border
    `<div style="display:inline-flex;align-items:center;justify-content:center;width:64px;height:64px;border-radius:14px;overflow:hidden;border:3px solid ${BRAND_COLOR};background:${BRAND_COLOR};box-shadow:0 4px 12px rgba(0,0,0,0.35);">` +
    imgContent +
    `</div>` +
    // Info box below
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

  // Pledge markers
  const pledgeMarkersRef = useRef<naver.maps.Marker[]>([]);
  const pledgeListenersRef = useRef<naver.maps.MapEventListener[]>([]);

  // Candidate markers
  const candidateMarkersRef = useRef<naver.maps.Marker[]>([]);
  const candidateListenersRef = useRef<naver.maps.MapEventListener[]>([]);

  // Ref to always hold latest addPledgeMarkers — fixes stale closures in event listeners
  const addPledgeMarkersRef = useRef<(map: naver.maps.Map) => void>(() => {});
  const addCandidateMarkersRef = useRef<(map: naver.maps.Map) => void>(
    () => {}
  );

  const { center, zoomLevel, setCenter, setZoomLevel } = useMapStore();

  const [pinSettings, setPinSettings] = useState<PinSettings>({
    emoji: "📍",
    color: "#FF5A00",
  });

  useEffect(() => {
    fetch("/api/map-settings/pin")
      .then((r) => r.json())
      .then((json) => {
        if (json.data?.emoji && json.data?.color) {
          setPinSettings({ emoji: json.data.emoji, color: json.data.color });
        }
      })
      .catch(() => {});
  }, []);

  // ─── Clear helpers ────────────────────────────────────────────────────────

  const clearPledgeMarkers = useCallback(() => {
    pledgeListenersRef.current.forEach((l) =>
      naver.maps.Event.removeListener(l)
    );
    pledgeListenersRef.current = [];
    pledgeMarkersRef.current.forEach((m) => m.setMap(null));
    pledgeMarkersRef.current = [];
  }, []);

  const clearCandidateMarkers = useCallback(() => {
    candidateListenersRef.current.forEach((l) =>
      naver.maps.Event.removeListener(l)
    );
    candidateListenersRef.current = [];
    candidateMarkersRef.current.forEach((m) => m.setMap(null));
    candidateMarkersRef.current = [];
  }, []);

  // ─── Pledge markers ───────────────────────────────────────────────────────

  const addPledgeMarkers = useCallback(
    (map: naver.maps.Map) => {
      clearPledgeMarkers();
      if (!Array.isArray(pledges)) return;

      pledges.forEach((pledge) => {
        const position = new naver.maps.LatLng(
          pledge.latitude,
          pledge.longitude
        );
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

  // ─── Candidate markers ────────────────────────────────────────────────────

  const addCandidateMarkers = useCallback(
    (map: naver.maps.Map) => {
      clearCandidateMarkers();
      if (!Array.isArray(candidates) || !Array.isArray(districts)) return;

      // Group candidates by district to spread overlapping markers
      const byDistrict: Record<string, CandidateForMap[]> = {};
      candidates.forEach((c) => {
        if (!byDistrict[c.district]) byDistrict[c.district] = [];
        byDistrict[c.district].push(c);
      });

      candidates.forEach((candidate) => {
        const districtInfo = districts.find(
          (d) => d.name === candidate.district
        );
        if (!districtInfo) return;

        const sameDistrict = byDistrict[candidate.district];
        const idx = sameDistrict.findIndex((c) => c.id === candidate.id);
        const total = sameDistrict.length;

        // Spread overlapping candidates horizontally (≈0.004° ≈ 350m offset)
        const spread = 0.004;
        const offsetLng = (idx - (total - 1) / 2) * spread;

        const position = new naver.maps.LatLng(
          districtInfo.centerLat,
          districtInfo.centerLng + offsetLng
        );

        const marker = new naver.maps.Marker({
          map,
          position,
          icon: {
            content: buildCandidateMarkerHTML(candidate),
            // Anchor at center of the 64px profile image:
            // wrapper width=110px → center x=55, image height+border=70px → center y=35
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

  // Keep refs pointing at latest callbacks (avoids stale closures in stable listeners)
  useEffect(() => {
    addPledgeMarkersRef.current = addPledgeMarkers;
  }, [addPledgeMarkers]);

  useEffect(() => {
    addCandidateMarkersRef.current = addCandidateMarkers;
  }, [addCandidateMarkers]);

  // ─── Initialize map ───────────────────────────────────────────────────────
  //
  // We defer map creation to after the browser has painted the container.
  // Without this, the div can have 0×0 dimensions at effect time, which causes
  // Naver Maps to render its tile layer invisibly (markers still show because
  // they're absolutely positioned, but the base map is blank).
  //
  useEffect(() => {
    if (!mapRef.current || typeof naver === "undefined" || !naver.maps) return;

    const container = mapRef.current;
    let rafId: number;
    let map: naver.maps.Map;

    const initMap = () => {
      // Guard: container must have non-zero dimensions
      if (container.offsetWidth === 0 || container.offsetHeight === 0) {
        // Retry next frame
        rafId = requestAnimationFrame(initMap);
        return;
      }

      map = new naver.maps.Map(container, {
        center: new naver.maps.LatLng(center.lat, center.lng),
        zoom: toNaverZoom(zoomLevel),
        zoomControl: true,
        zoomControlOptions: {
          position: naver.maps.Position.TOP_RIGHT,
        },
      });

      mapInstance.current = map;

      // Force the tile layer to recalculate after initial paint
      naver.maps.Event.trigger(map, "resize");

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

    rafId = requestAnimationFrame(initMap);

    return () => {
      cancelAnimationFrame(rafId);
      clearPledgeMarkers();
      clearCandidateMarkers();
      if (mapInstance.current) {
        mapInstance.current.destroy();
        mapInstance.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync external center/zoom changes
  useEffect(() => {
    if (!mapInstance.current) return;
    mapInstance.current.setCenter(
      new naver.maps.LatLng(center.lat, center.lng)
    );
    mapInstance.current.setZoom(toNaverZoom(zoomLevel));
  }, [center, zoomLevel]);

  // Update pledge markers when pledges or pin settings change
  useEffect(() => {
    if (!mapInstance.current) return;
    addPledgeMarkers(mapInstance.current);
  }, [pledges, addPledgeMarkers]);

  // Update candidate markers when candidates or districts change
  useEffect(() => {
    if (!mapInstance.current) return;
    addCandidateMarkers(mapInstance.current);
  }, [candidates, districts, addCandidateMarkers]);

  // Explicit inline style guarantees Naver Maps can measure the container
  // on all platforms — Tailwind classes alone can be overridden by resets.
  return (
    <div
      ref={mapRef}
      className="w-full h-full"
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}
