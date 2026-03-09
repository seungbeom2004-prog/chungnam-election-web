"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useMapStore } from "@/store/useMapStore";
import type { Pledge } from "@/types";
import type { CandidateForMap, DistrictCoords } from "@/components/map/MapPageContent";

interface NaverMapProps {
  pledges: Pledge[];
  candidates: CandidateForMap[];
  districts: DistrictCoords[];
  onPledgeClick: (pledge: Pledge) => void;
  onCandidateClick: (candidate: CandidateForMap) => void;
  isCute?: boolean;
}

interface PinSettings {
  emoji: string;
  color: string;
  iconImage: string | null;
}

// Naver Maps zoom: higher = more zoomed in; naverZoom ≈ 21 - storeLevel
function toNaverZoom(storeLevel: number): number { return 21 - storeLevel; }
function toStoreLevel(naverZoom: number): number { return 21 - naverZoom; }

/** Check that the Naver Maps SDK is fully loaded (not just the namespace). */
function isNaverReady(): boolean {
  try {
    return (
      typeof naver !== "undefined" &&
      !!naver.maps &&
      typeof naver.maps.Map === "function" &&
      typeof naver.maps.LatLng === "function"
    );
  } catch {
    return false;
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const BRAND_COLOR = "#FF5A00";
const CUTE_COLOR = "#FF6B9D";

// ─── Regular marker builders ────────────────────────────────────────────────

/**
 * Build HTML for a pledge/category map marker (regular mode).
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
 * Build HTML for a candidate map marker (regular mode).
 * Shows election type and district in the info box.
 */
function buildCandidateMarkerHTML(candidate: CandidateForMap): string {
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

// ─── Cute marker builders ───────────────────────────────────────────────────

/**
 * Build HTML for a pledge/category map marker (cute mode).
 * Round shape, pink border, softer shadow, sparkle accent.
 */
function buildCutePledgeMarkerHTML(
  emoji: string,
  color: string,
  iconImage: string | null
): string {
  // Soften the color by mixing with pink
  const cuteColor = color === BRAND_COLOR ? CUTE_COLOR : color;

  const inner = iconImage
    ? `<img src="${escapeHtml(iconImage)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`
    : `<span style="font-size:22px;line-height:1;">${emoji}</span>`;

  return (
    `<div style="position:relative;width:44px;height:44px;">` +
    // Sparkle accent
    `<div style="position:absolute;top:-4px;right:-4px;font-size:12px;z-index:1;">✨</div>` +
    // Main circle
    `<div style="width:44px;height:44px;background:${cuteColor};border-radius:50%;` +
    `border:3px solid #FFB6D5;display:flex;align-items:center;justify-content:center;` +
    `overflow:hidden;box-shadow:0 3px 12px rgba(255,107,157,0.35);cursor:pointer;">` +
    inner +
    `</div>` +
    `</div>`
  );
}

/**
 * Build HTML for a candidate map marker (cute mode).
 * Rounder frame, pink accents, speech-bubble-style info box, Bingre font.
 */
function buildCuteCandidateMarkerHTML(candidate: CandidateForMap): string {
  const electionLabel = candidate.electionType || candidate.electionName || "";
  const statusParts = [electionLabel, candidate.candidateStatus].filter(Boolean);
  const statusLine = statusParts.join(" · ");

  const cuteFont = `font-family:'Bingre','Pretendard Variable',sans-serif;`;

  const imgContent = candidate.profileImage
    ? `<img src="${escapeHtml(candidate.profileImage)}" style="width:100%;height:100%;object-fit:cover;display:block;" loading="lazy" />`
    : `<span style="font-size:22px;font-weight:800;color:white;${cuteFont}">${escapeHtml(candidate.name.charAt(0))}</span>`;

  return (
    `<div style="width:120px;text-align:center;cursor:pointer;user-select:none;pointer-events:auto;">` +
    // Profile image with cute round frame + decorative border
    `<div style="position:relative;display:inline-block;">` +
    `<div style="display:inline-flex;align-items:center;justify-content:center;width:68px;height:68px;border-radius:50%;overflow:hidden;` +
    `border:4px solid ${CUTE_COLOR};background:linear-gradient(135deg,${CUTE_COLOR},#FFB6D5);` +
    `box-shadow:0 4px 16px rgba(255,107,157,0.4);">` +
    imgContent +
    `</div>` +
    // Star decoration
    `<div style="position:absolute;top:-2px;right:-2px;font-size:14px;">⭐</div>` +
    `</div>` +
    // Speech-bubble info box
    `<div style="position:relative;background:#fff;border:2px solid #FFB6D5;border-radius:16px;padding:6px 10px;margin-top:6px;` +
    `box-shadow:0 2px 10px rgba(255,182,213,0.25);">` +
    // Bubble tail
    `<div style="position:absolute;top:-7px;left:50%;transform:translateX(-50%);width:0;height:0;` +
    `border-left:7px solid transparent;border-right:7px solid transparent;border-bottom:7px solid #FFB6D5;"></div>` +
    `<div style="position:absolute;top:-5px;left:50%;transform:translateX(-50%);width:0;height:0;` +
    `border-left:6px solid transparent;border-right:6px solid transparent;border-bottom:6px solid #fff;"></div>` +
    // Name
    `<div style="font-weight:800;font-size:13px;color:#5B4A6B;line-height:1.3;${cuteFont}">${escapeHtml(candidate.name)}</div>` +
    (statusLine
      ? `<div style="font-size:9px;color:#B8A9C9;margin-top:2px;line-height:1.3;${cuteFont}">${escapeHtml(statusLine)}</div>`
      : "") +
    `<div style="font-size:9px;color:${CUTE_COLOR};margin-top:1px;line-height:1.3;${cuteFont}">${escapeHtml(candidate.district)}</div>` +
    `</div>` +
    `</div>`
  );
}

// ─── Hardcoded fallback: 천안시 is always the default first city ────────────
const DEFAULT_DISTRICT = "천안시";

export default function NaverMap({
  pledges,
  candidates,
  districts,
  onPledgeClick,
  onCandidateClick,
  isCute = false,
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

  const { center, zoomLevel, setCenter, setZoomLevel, setSelectedDistrict } = useMapStore();

  const [pinSettings, setPinSettings] = useState<PinSettings>({
    emoji: "📍",
    color: "#FF5A00",
    iconImage: null,
  });
  const defaultDistrictApplied = useRef(false);
  // Ref-based settings gate: map is only created after settings are fetched,
  // so the initial center/zoom are always correct and no visible "jump" occurs.
  const settingsLoadedRef = useRef(false);
  const pendingDistrictRef = useRef<string>(DEFAULT_DISTRICT);
  // Keep a live ref to the districts prop so createMap() can look them up.
  const districtsRef = useRef<DistrictCoords[]>(districts);
  useEffect(() => { districtsRef.current = districts; }, [districts]);

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
          // Apply zoom to store synchronously so createMap() picks it up via getState().
          if (json.data.defaultZoom != null) {
            setZoomLevel(toStoreLevel(Number(json.data.defaultZoom)));
          }
          // Store district name in a ref; createMap() will resolve the coords.
          pendingDistrictRef.current = json.data.defaultDistrict || DEFAULT_DISTRICT;
        }
      })
      .catch(() => { /* keep defaults */ })
      .finally(() => {
        // Signal that settings are ready; the SDK poll will now allow map creation.
        settingsLoadedRef.current = true;
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Apply the default district when districts become available.
  // This handles the case where districts load after the map was already created.
  useEffect(() => {
    if (districts.length === 0 || defaultDistrictApplied.current) return;
    const targetName = pendingDistrictRef.current;
    const found =
      districts.find((d) => d.name === targetName) ||
      districts.find((d) => d.name.startsWith(targetName));
    if (!found) return;
    defaultDistrictApplied.current = true;
    setCenter(found.centerLat, found.centerLng);
    setSelectedDistrict(found.name);
    // If the map is already created, move it directly so the sync effect
    // fires with the same coords — no visible pan.
    if (mapInstance.current) {
      mapInstance.current.setCenter(new naver.maps.LatLng(found.centerLat, found.centerLng));
    }
  }, [districts]); // eslint-disable-line react-hooks/exhaustive-deps

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

        const markerHtml = isCute
          ? buildCutePledgeMarkerHTML(emoji, color, iconImage ?? null)
          : buildPledgeMarkerHTML(emoji, color, iconImage ?? null);

        const marker = new naver.maps.Marker({
          map,
          position,
          icon: {
            content: markerHtml,
            anchor: new naver.maps.Point(isCute ? 22 : 20, isCute ? 22 : 20),
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
    [pledges, onPledgeClick, clearPledgeMarkers, pinSettings, isCute]
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

        const markerHtml = isCute
          ? buildCuteCandidateMarkerHTML(candidate)
          : buildCandidateMarkerHTML(candidate);

        const marker = new naver.maps.Marker({
          map,
          position: new naver.maps.LatLng(lat, lng),
          icon: {
            content: markerHtml,
            // Anchor at center of the profile image within the wrapper
            anchor: new naver.maps.Point(isCute ? 60 : 55, isCute ? 38 : 35),
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
    [candidates, districts, onCandidateClick, clearCandidateMarkers, isCute]
  );

  useEffect(() => { addPledgeMarkersRef.current = addPledgeMarkers; }, [addPledgeMarkers]);
  useEffect(() => { addCandidateMarkersRef.current = addCandidateMarkers; }, [addCandidateMarkers]);

  // ─── Initialize map ────────────────────────────────────────────────────────
  //
  // Robust initialisation that handles:
  //  1. SDK race  — naver.maps.Map might not be a constructor yet when the
  //                 script onload fires; we check typeof === "function".
  //  2. Slow paint — container may have 0×0 dims on first frame (mobile).
  //  3. Dirty DOM  — previous map.destroy() leaves child nodes.
  //  4. Tile blank — deferred resize at 300 ms, 800 ms, and 2 000 ms.
  //  5. Timeout    — polls every 100 ms for up to 10 s (not 1 s).
  //
  useEffect(() => {
    if (!mapRef.current) return;
    const container = mapRef.current;
    let destroyed = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    const resizeTimers: ReturnType<typeof setTimeout>[] = [];

    const createMap = () => {
      if (destroyed) return;

      try {
        // Thoroughly clean container (fix 3)
        while (container.firstChild) container.removeChild(container.firstChild);

        // Apply the default district now if districts are already loaded.
        // We call setCenter() synchronously so getState() below sees the new coords.
        if (!defaultDistrictApplied.current) {
          const currentDistricts = districtsRef.current;
          const targetName = pendingDistrictRef.current;
          if (currentDistricts.length > 0) {
            const found =
              currentDistricts.find((d) => d.name === targetName) ||
              currentDistricts.find((d) => d.name.startsWith(targetName));
            if (found) {
              setCenter(found.centerLat, found.centerLng);
              setSelectedDistrict(found.name);
              defaultDistrictApplied.current = true;
            }
          }
        }

        // Read the LATEST store state: settings fetch + district lookup above
        // have already pushed the correct values before we reach this line,
        // so the map is created at the right position/zoom from the very start.
        const { center: initialCenter, zoomLevel: initialZoom } = useMapStore.getState();

        const map = new naver.maps.Map(container, {
          center: new naver.maps.LatLng(initialCenter.lat, initialCenter.lng),
          zoom: toNaverZoom(initialZoom),
          zoomControl: true,
          zoomControlOptions: { position: naver.maps.Position.LEFT_CENTER },
        });

        mapInstance.current = map;

        // Multiple deferred resizes — slow devices need more time (fix 4)
        [300, 800, 2000].forEach((ms) => {
          resizeTimers.push(
            setTimeout(() => {
              if (!destroyed && mapInstance.current === map) {
                naver.maps.Event.trigger(map, "resize");
              }
            }, ms)
          );
        });

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
      } catch (e) {
        console.error("[NaverMap] Map creation failed:", e);
      }
    };

    // Poll until SDK is fully ready AND container has real dimensions (fix 1, 2, 5)
    let attempts = 0;
    pollTimer = setInterval(() => {
      if (destroyed) {
        if (pollTimer) clearInterval(pollTimer);
        return;
      }
      if (
        isNaverReady() &&
        container.offsetWidth > 0 &&
        container.offsetHeight > 0 &&
        settingsLoadedRef.current   // wait for settings before creating the map
      ) {
        if (pollTimer) clearInterval(pollTimer);
        pollTimer = null;
        createMap();
      } else if (++attempts > 100) {
        // 100 × 100 ms = 10 s — give up
        if (pollTimer) clearInterval(pollTimer);
        pollTimer = null;
        console.error("[NaverMap] Timed out waiting for Naver Maps SDK or container dimensions");
      }
    }, 100);

    return () => {
      destroyed = true;
      if (pollTimer) clearInterval(pollTimer);
      resizeTimers.forEach(clearTimeout);
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

  // Refresh pledge markers when data, pin settings, or theme change
  useEffect(() => {
    if (!mapInstance.current) return;
    addPledgeMarkers(mapInstance.current);
  }, [pledges, addPledgeMarkers]);

  // Refresh candidate markers when data, districts, or theme change
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
