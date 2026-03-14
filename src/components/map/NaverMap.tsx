"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import Supercluster from "supercluster";
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
  /** Category name to filter pledge markers. 'all' = show everything. */
  selectedCategory?: string;
  /** ID of the currently selected pledge — shows a highlight ring on the map. */
  selectedPledgeId?: string | null;
}

interface PinSettings {
  emoji: string;
  color: string;
  iconImage: string | null;
}

// Supercluster point-properties type
type PledgePointProps = { pledge: Pledge };

// Naver Maps zoom: higher = more zoomed in. naverZoom ≈ 21 - storeLevel
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
const CUTE_COLOR  = "#FF6B9D";

// CSS keyframe to inject once so all dynamically-built marker HTML can use it.
const MARKER_ANIM_CSS =
  "@keyframes markerFadeIn{" +
  "0%{opacity:0;transform:scale(0.75)}" +
  "100%{opacity:1;transform:scale(1)}" +
  "}" +
  "@-webkit-keyframes markerFadeIn{" +
  "0%{opacity:0;-webkit-transform:scale(0.75)}" +
  "100%{opacity:1;-webkit-transform:scale(1)}" +
  "}" +
  "@keyframes pledgePulse{" +
  "0%{transform:scale(1);opacity:0.9}" +
  "50%{transform:scale(1.35);opacity:0.4}" +
  "100%{transform:scale(1.7);opacity:0}" +
  "}";

// ─── Marker HTML builders ────────────────────────────────────────────────────

/** Regular pledge/category pin (rounded square). */
function buildPledgeMarkerHTML(
  emoji: string,
  color: string,
  iconImage: string | null
): string {
  // Always render the emoji as a fallback. When iconImage is set we layer a
  // CSS background-image div on top — no <img> tag means the Naver Maps SDK
  // never attaches its internal image-error handler, preventing the
  // "Cannot set properties of null (setting 'innerHTML')" crash.
  const bgLayer = iconImage
    ? `<div style="position:absolute;top:0;right:0;bottom:0;left:0;` +
      `background-image:url('${escapeHtml(iconImage)}');background-size:cover;background-position:center;"></div>`
    : "";
  return (
    `<div style="position:relative;width:40px;height:40px;background:${color};border-radius:10px;` +
    `border:2.5px solid white;display:flex;align-items:center;justify-content:center;` +
    `overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.3);cursor:pointer;` +
    `animation:markerFadeIn 0.2s ease-out both;">` +
    `<span style="font-size:20px;line-height:1;font-family:sans-serif;">${emoji}</span>` +
    bgLayer +
    `</div>`
  );
}

/** Regular candidate pin (photo + name label). */
function buildCandidateMarkerHTML(candidate: CandidateForMap): string {
  const electionLabel = candidate.detailedElectionName || candidate.electionType || candidate.electionName || "";
  // Most specific district: the ward portion after the first space (e.g. "다선거구" from "천안시서북구 다선거구")
  const spaceIdx = candidate.district ? candidate.district.indexOf(" ") : -1;
  const specificDistrict = spaceIdx > -1 ? candidate.district.slice(spaceIdx + 1) : candidate.district;
  // Line after detailed election: specific district + candidate status
  const detailLineParts = [specificDistrict, candidate.candidateStatus].filter(Boolean);
  const detailLine = detailLineParts.join(" · ");
  const isConfirmed = candidate.caucusStatus === "공천 확정";

  const bgLayer = candidate.profileImage
    ? `<div style="position:absolute;top:0;right:0;bottom:0;left:0;` +
      `background-image:url('${escapeHtml(candidate.profileImage)}');background-size:cover;background-position:center;"></div>`
    : "";

  const confirmedBadge = isConfirmed
    ? `<div style="position:absolute;top:-6px;right:-6px;background:#16a34a;color:white;` +
      `font-size:8px;font-weight:700;font-family:sans-serif;padding:2px 4px;border-radius:4px;` +
      `border:1.5px solid white;line-height:1.2;white-space:nowrap;">공천 확정</div>`
    : "";

  return (
    `<div style="width:110px;text-align:center;cursor:pointer;user-select:none;pointer-events:auto;` +
    `animation:markerFadeIn 0.2s ease-out both;">` +
    `<div style="position:relative;display:inline-block;">` +
    `<div style="position:relative;display:inline-flex;align-items:center;justify-content:center;width:64px;height:64px;border-radius:14px;overflow:hidden;border:3px solid ${BRAND_COLOR};background:${BRAND_COLOR};box-shadow:0 4px 12px rgba(0,0,0,0.35);">` +
    `<span style="font-size:22px;font-weight:800;color:white;font-family:sans-serif;">${escapeHtml(candidate.name.charAt(0))}</span>` +
    bgLayer +
    `</div>` +
    confirmedBadge +
    `</div>` +
    `<div style="background:#fff;border:2px solid ${BRAND_COLOR};border-radius:10px;padding:5px 8px;margin-top:4px;box-shadow:0 2px 8px rgba(0,0,0,0.15);">` +
    `<div style="font-weight:800;font-size:13px;color:#111;line-height:1.3;font-family:sans-serif;">${escapeHtml(candidate.name)}</div>` +
    (electionLabel
      ? `<div style="font-size:9px;color:#666;margin-top:2px;line-height:1.3;font-family:sans-serif;">${escapeHtml(electionLabel)}</div>`
      : "") +
    (detailLine
      ? `<div style="font-size:9px;color:${BRAND_COLOR};margin-top:1px;line-height:1.3;font-family:sans-serif;">${escapeHtml(detailLine)}</div>`
      : "") +
    `</div>` +
    `</div>`
  );
}

/** Cute pledge pin (custom icon with pink contour glow, or bare emoji). */
function buildCutePledgeMarkerHTML(
  emoji: string,
  _color: string,
  iconImage: string | null
): string {
  if (iconImage) {
    const shadow =
      `drop-shadow(2px 0 0 #FFB6D5) drop-shadow(-2px 0 0 #FFB6D5) ` +
      `drop-shadow(0 2px 0 #FFB6D5) drop-shadow(0 -2px 0 #FFB6D5) ` +
      `drop-shadow(1px 1px 0 #FFB6D5) drop-shadow(-1px 1px 0 #FFB6D5) ` +
      `drop-shadow(1px -1px 0 #FFB6D5) drop-shadow(-1px -1px 0 #FFB6D5) ` +
      `drop-shadow(0 0 6px rgba(255,107,157,0.4))`;
    // Emoji fallback sits behind the background-image div. CSS background-image
    // is not tracked by the Naver Maps SDK so no internal error handler fires.
    // CSS filter on a div follows the background-image's alpha channel in all
    // modern browsers, preserving the pink contour-shadow effect.
    return (
      `<div style="position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center;cursor:pointer;` +
      `animation:markerFadeIn 0.2s ease-out both;">` +
      `<span style="font-size:26px;line-height:1;">${emoji}</span>` +
      `<div style="position:absolute;top:0;right:0;bottom:0;left:0;` +
      `background-image:url('${escapeHtml(iconImage)}');background-size:contain;background-repeat:no-repeat;background-position:center;` +
      `filter:${shadow};"></div>` +
      `</div>`
    );
  }
  return (
    `<div style="width:44px;height:44px;display:flex;align-items:center;` +
    `justify-content:center;cursor:pointer;animation:markerFadeIn 0.2s ease-out both;">` +
    `<span style="font-size:26px;line-height:1;">${emoji}</span>` +
    `</div>`
  );
}

/** Cute candidate pin (circular photo + speech-bubble label). */
function buildCuteCandidateMarkerHTML(candidate: CandidateForMap): string {
  const electionLabel = candidate.detailedElectionName || candidate.electionType || candidate.electionName || "";
  const spaceIdx2 = candidate.district ? candidate.district.indexOf(" ") : -1;
  const specificDistrict2 = spaceIdx2 > -1 ? candidate.district.slice(spaceIdx2 + 1) : candidate.district;
  // Line after detailed election: specific district + candidate status
  const detailLineParts2 = [specificDistrict2, candidate.candidateStatus].filter(Boolean);
  const detailLine2 = detailLineParts2.join(" · ");
  const cuteFont = `font-family:'Bingre','Pretendard Variable',sans-serif;`;
  const isConfirmed = candidate.caucusStatus === "공천 확정";

  const bgLayer = candidate.profileImage
    ? `<div style="position:absolute;top:0;right:0;bottom:0;left:0;` +
      `background-image:url('${escapeHtml(candidate.profileImage)}');background-size:cover;background-position:center;"></div>`
    : "";

  const confirmedBadge = isConfirmed
    ? `<div style="position:absolute;bottom:-4px;right:-4px;background:#16a34a;color:white;` +
      `font-size:8px;font-weight:700;font-family:sans-serif;padding:2px 4px;border-radius:4px;` +
      `border:1.5px solid white;line-height:1.2;white-space:nowrap;">공천 확정</div>`
    : "";

  return (
    `<div style="width:120px;text-align:center;cursor:pointer;user-select:none;pointer-events:auto;` +
    `animation:markerFadeIn 0.2s ease-out both;">` +
    `<div style="position:relative;display:inline-block;">` +
    `<div style="position:relative;display:inline-flex;align-items:center;justify-content:center;width:68px;height:68px;border-radius:50%;overflow:hidden;` +
    `border:4px solid ${CUTE_COLOR};background:linear-gradient(135deg,${CUTE_COLOR},#FFB6D5);` +
    `box-shadow:0 4px 16px rgba(255,107,157,0.4);">` +
    `<span style="font-size:22px;font-weight:800;color:white;${cuteFont}">${escapeHtml(candidate.name.charAt(0))}</span>` +
    bgLayer +
    `</div>` +
    `<div style="position:absolute;top:-2px;right:-2px;font-size:14px;">⭐</div>` +
    confirmedBadge +
    `</div>` +
    `<div style="position:relative;background:#fff;border:2px solid #FFB6D5;border-radius:16px;padding:6px 10px;margin-top:6px;` +
    `box-shadow:0 2px 10px rgba(255,182,213,0.25);">` +
    `<div style="position:absolute;top:-7px;left:50%;transform:translateX(-50%);width:0;height:0;` +
    `border-left:7px solid transparent;border-right:7px solid transparent;border-bottom:7px solid #FFB6D5;"></div>` +
    `<div style="position:absolute;top:-5px;left:50%;transform:translateX(-50%);width:0;height:0;` +
    `border-left:6px solid transparent;border-right:6px solid transparent;border-bottom:6px solid #fff;"></div>` +
    `<div style="font-weight:800;font-size:13px;color:#5B4A6B;line-height:1.3;${cuteFont}">${escapeHtml(candidate.name)}</div>` +
    (electionLabel
      ? `<div style="font-size:9px;color:#B8A9C9;margin-top:2px;line-height:1.3;${cuteFont}">${escapeHtml(electionLabel)}</div>`
      : "") +
    (detailLine2
      ? `<div style="font-size:9px;color:${CUTE_COLOR};margin-top:1px;line-height:1.3;${cuteFont}">${escapeHtml(detailLine2)}</div>`
      : "") +
    `</div>` +
    `</div>`
  );
}

/**
 * Cluster bubble marker.
 * Size scales with point count; glow matches active theme.
 * disableClusteringAtZoom = 17: supercluster maxZoom 16 ensures individual
 * markers are returned at naverZoom >= 17.
 */
function buildClusterMarkerHTML(count: number, isCute: boolean): string {
  const size = count < 10 ? 38 : count < 50 ? 46 : 54;
  const color = isCute ? CUTE_COLOR : BRAND_COLOR;
  const glow  = isCute
    ? "rgba(255,107,157,0.28)"
    : "rgba(255,90,0,0.28)";
  const fontSize = count < 10 ? 14 : count < 100 ? 12 : 10;

  return (
    `<div style="width:${size}px;height:${size}px;background:${color};border-radius:50%;` +
    `display:flex;align-items:center;justify-content:center;` +
    `color:#fff;font-weight:700;font-size:${fontSize}px;font-family:sans-serif;` +
    `box-shadow:0 0 0 8px ${glow},0 2px 10px rgba(0,0,0,0.2);` +
    `cursor:pointer;animation:markerFadeIn 0.2s ease-out both;">` +
    count +
    `</div>`
  );
}

// ─── Hardcoded fallback: 천안시 is always the default first city ─────────────
const DEFAULT_DISTRICT = "천안시";

export default function NaverMap({
  pledges,
  candidates,
  districts,
  onPledgeClick,
  onCandidateClick,
  isCute = false,
  selectedCategory = "all",
  selectedPledgeId = null,
}: NaverMapProps) {
  const mapRef         = useRef<HTMLDivElement>(null);
  const mapInstance    = useRef<naver.maps.Map | null>(null);

  // ── Marker collections ────────────────────────────────────────────────────
  // Individual pledge markers (from cluster leaf rendering)
  const pledgeMarkersRef   = useRef<naver.maps.Marker[]>([]);
  const pledgeListenersRef = useRef<naver.maps.MapEventListener[]>([]);
  // Cluster bubble markers
  const clusterMarkersRef   = useRef<naver.maps.Marker[]>([]);
  const clusterListenersRef = useRef<naver.maps.MapEventListener[]>([]);
  // Spiderfy spread markers (same-coord cluster expansion)
  const spiderfyMarkersRef   = useRef<naver.maps.Marker[]>([]);
  const spiderfyListenersRef = useRef<naver.maps.MapEventListener[]>([]);
  // Listener that collapses the active spider on map click
  const collapseListenerRef  = useRef<naver.maps.MapEventListener | null>(null);
  // Candidate markers
  const candidateMarkersRef   = useRef<naver.maps.Marker[]>([]);
  const candidateListenersRef = useRef<naver.maps.MapEventListener[]>([]);
  // Selection highlight ring (shown at the selected pledge's position)
  const selectedRingRef = useRef<naver.maps.Marker | null>(null);

  // ── Supercluster ──────────────────────────────────────────────────────────
  const superclusterRef = useRef<Supercluster<PledgePointProps> | null>(null);

  // Stable ref-based callbacks so the long-lived map event listeners never
  // hold stale closures.
  const renderClustersRef      = useRef<(map: naver.maps.Map) => void>(() => {});
  const addCandidateMarkersRef = useRef<(map: naver.maps.Map) => void>(() => {});

  const { center, zoomLevel, setCenter, setZoomLevel, setSelectedDistrict } = useMapStore();

  const [pinSettings, setPinSettings] = useState<PinSettings>({
    emoji: "📍",
    color: "#FF5A00",
    iconImage: null,
  });

  const defaultDistrictApplied = useRef(false);
  const settingsLoadedRef      = useRef(false);
  const pendingDistrictRef     = useRef<string>(DEFAULT_DISTRICT);
  const districtsRef           = useRef<DistrictCoords[]>(districts);
  useEffect(() => { districtsRef.current = districts; }, [districts]);

  // ── Fetch pin settings ────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/map-settings/pin")
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          setPinSettings({
            emoji:     json.data.emoji     || "📍",
            color:     json.data.color     || "#FF5A00",
            iconImage: json.data.iconImage || null,
          });
          if (json.data.defaultZoom != null) {
            setZoomLevel(toStoreLevel(Number(json.data.defaultZoom)));
          }
          pendingDistrictRef.current = json.data.defaultDistrict || DEFAULT_DISTRICT;
        }
      })
      .catch(() => { /* keep defaults */ })
      .finally(() => { settingsLoadedRef.current = true; });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Apply the default district when districts become available.
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
    if (mapInstance.current) {
      mapInstance.current.setCenter(new naver.maps.LatLng(found.centerLat, found.centerLng));
    }
  }, [districts]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Clear helpers ─────────────────────────────────────────────────────────

  // Safe wrappers: Naver Maps SDK may throw if a marker/listener is
  // already detached (race between image-load callbacks and our cleanup).
  const safeRemoveListener = (l: naver.maps.MapEventListener) => {
    try { naver.maps.Event.removeListener(l); } catch { /* already removed */ }
  };
  const safeSetMapNull = (m: naver.maps.Marker) => {
    try { m.setMap(null); } catch { /* already detached */ }
  };

  const clearPledgeMarkers = useCallback(() => {
    pledgeListenersRef.current.forEach(safeRemoveListener);
    pledgeListenersRef.current = [];
    pledgeMarkersRef.current.forEach(safeSetMapNull);
    pledgeMarkersRef.current = [];
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const clearClusterMarkers = useCallback(() => {
    clusterListenersRef.current.forEach(safeRemoveListener);
    clusterListenersRef.current = [];
    clusterMarkersRef.current.forEach(safeSetMapNull);
    clusterMarkersRef.current = [];
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const clearSpiderfy = useCallback(() => {
    // Remove the map-level collapse listener if one is active
    if (collapseListenerRef.current) {
      safeRemoveListener(collapseListenerRef.current);
      collapseListenerRef.current = null;
    }
    spiderfyListenersRef.current.forEach(safeRemoveListener);
    spiderfyListenersRef.current = [];
    spiderfyMarkersRef.current.forEach(safeSetMapNull);
    spiderfyMarkersRef.current = [];
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const clearCandidateMarkers = useCallback(() => {
    candidateListenersRef.current.forEach(safeRemoveListener);
    candidateListenersRef.current = [];
    candidateMarkersRef.current.forEach(safeSetMapNull);
    candidateMarkersRef.current = [];
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Pledge cluster rendering ───────────────────────────────────────────────
  //
  // Supercluster options:
  //   maxZoom: 16  → at naverZoom ≥ 17, getClusters() returns individual points
  //                   (implements "disableClusteringAtZoom: 17")
  //   radius: 60   → pixels at which nearby points are grouped into a cluster
  //
  const renderPledgeClusters = useCallback(
    (map: naver.maps.Map) => {
      clearClusterMarkers();
      clearPledgeMarkers();
      clearSpiderfy();

      const sc = superclusterRef.current;
      if (!sc) return;

      let naverZoom: number;
      let bbox: [number, number, number, number];

      try {
        naverZoom = map.getZoom();

        // getBounds() can return null before tiles load; guard it.
        const rawBounds = map.getBounds();
        if (!rawBounds) return;
        const bounds = rawBounds as naver.maps.LatLngBounds;
        // getSW / getNE are standard in Naver Maps SDK v3
        const sw = bounds.getSW();
        const ne = bounds.getNE();
        bbox = [sw.lng(), sw.lat(), ne.lng(), ne.lat()];
      } catch {
        return; // SDK not fully ready yet; skip this render cycle
      }

      const clusters = sc.getClusters(bbox, naverZoom);

      clusters.forEach((cluster) => {
        const [lng, lat] = cluster.geometry.coordinates;
        const position   = new naver.maps.LatLng(lat, lng);

        // ── Cluster bubble ────────────────────────────────────────────────
        if ((cluster.properties as Supercluster.ClusterProperties).cluster) {
          const cp        = cluster.properties as Supercluster.ClusterProperties;
          const count     = cp.point_count;
          const clusterId = cp.cluster_id;
          const size      = count < 10 ? 38 : count < 50 ? 46 : 54;
          const half      = size / 2;

          const marker = new naver.maps.Marker({
            map,
            position,
            icon: {
              content: buildClusterMarkerHTML(count, isCute),
              anchor: new naver.maps.Point(half, half),
            },
            zIndex: 45,
          });

          const listener = naver.maps.Event.addListener(marker, "click", () => {
            const expansionZoom = sc.getClusterExpansionZoom(clusterId);
            const leaves        = sc.getLeaves(clusterId, Infinity);

            // Detect all-same-coordinate cluster → trigger spiderfy
            const [cx, cy]  = leaves[0].geometry.coordinates;
            const allSameCoord = leaves.every(
              (l) =>
                Math.abs(l.geometry.coordinates[0] - cx) < 0.000001 &&
                Math.abs(l.geometry.coordinates[1] - cy) < 0.000001
            );

            if (allSameCoord && leaves.length > 1) {
              // ── Spiderfy ───────────────────────────────────────────────
              // Defer one tick so the SDK can finish restoring the clicked
              // marker's visual state before we call setMap(null) on it.
              setTimeout(() => {
              clearClusterMarkers();
              clearSpiderfy();

              const total  = leaves.length;
              // Spread radius scales with number of leaves; min ~25 m
              const radius = Math.max(0.00025, total * 0.000045);

              leaves.forEach((leaf, i) => {
                const angle = (2 * Math.PI * i) / total - Math.PI / 2;
                const sLat  = cy + radius * Math.sin(angle);
                const sLng  = cx + radius * Math.cos(angle);
                const pledge    = (leaf.properties as PledgePointProps).pledge;
                const emoji     = pledge.category?.emoji     ?? pinSettings.emoji;
                const color     = pledge.category?.color     ?? pinSettings.color;
                const iconImage =
                  (pledge.category as { iconImage?: string | null } | undefined)?.iconImage ??
                  pinSettings.iconImage;

                const mHtml = isCute
                  ? buildCutePledgeMarkerHTML(emoji, color, iconImage ?? null)
                  : buildPledgeMarkerHTML(emoji, color, null); // regular: emoji only, no sticker overlay

                const sMarker = new naver.maps.Marker({
                  map,
                  position: new naver.maps.LatLng(sLat, sLng),
                  icon: {
                    content: mHtml,
                    anchor: new naver.maps.Point(isCute ? 22 : 20, isCute ? 22 : 20),
                  },
                  zIndex: 60,
                });
                const sListener = naver.maps.Event.addListener(
                  sMarker, "click", () => onPledgeClick(pledge)
                );
                spiderfyMarkersRef.current.push(sMarker);
                spiderfyListenersRef.current.push(sListener);
              });

              // Collapse spider on next map background click
              const collapse = naver.maps.Event.addListener(map, "click", () => {
                safeRemoveListener(collapse);
                collapseListenerRef.current = null;
                clearSpiderfy();
                renderClustersRef.current(map);
              });
              collapseListenerRef.current = collapse;
              }, 0); // end deferred spiderfy

            } else {
              // ── Zoom into cluster ──────────────────────────────────────
              map.setZoom(Math.min(expansionZoom, 20));
              map.setCenter(new naver.maps.LatLng(lat, lng));
            }
          });

          clusterMarkersRef.current.push(marker);
          clusterListenersRef.current.push(listener);

        } else {
          // ── Individual pledge marker ───────────────────────────────────
          const pledge    = (cluster.properties as PledgePointProps).pledge;
          const emoji     = pledge.category?.emoji     ?? pinSettings.emoji;
          const color     = pledge.category?.color     ?? pinSettings.color;
          const iconImage =
            (pledge.category as { iconImage?: string | null } | undefined)?.iconImage ??
            pinSettings.iconImage;

          const html = isCute
            ? buildCutePledgeMarkerHTML(emoji, color, iconImage ?? null)
            : buildPledgeMarkerHTML(emoji, color, null); // regular: emoji only, no sticker overlay

          const marker = new naver.maps.Marker({
            map,
            position,
            icon: {
              content: html,
              anchor: new naver.maps.Point(isCute ? 22 : 20, isCute ? 22 : 20),
            },
            zIndex: 50,
          });
          const listener = naver.maps.Event.addListener(
            marker, "click", () => onPledgeClick(pledge)
          );
          pledgeMarkersRef.current.push(marker);
          pledgeListenersRef.current.push(listener);
        }
      });
    },
    // pinSettings and isCute must be in deps so the closure always uses fresh values.
    [clearClusterMarkers, clearPledgeMarkers, clearSpiderfy, isCute, onPledgeClick, pinSettings]
  );

  // ── Candidate markers (unchanged logic) ───────────────────────────────────

  const addCandidateMarkers = useCallback(
    (map: naver.maps.Map) => {
      clearCandidateMarkers();
      if (!Array.isArray(candidates) || !Array.isArray(districts)) return;

      const byDistrict: Record<string, CandidateForMap[]> = {};
      candidates.forEach((c) => {
        if (!byDistrict[c.district]) byDistrict[c.district] = [];
        byDistrict[c.district].push(c);
      });

      candidates.forEach((candidate) => {
        let lat: number;
        let lng: number;

        if (candidate.pinLat != null && candidate.pinLng != null) {
          lat = candidate.pinLat;
          lng = candidate.pinLng;
        } else {
          const districtInfo =
            districts.find((d) => d.name === candidate.district) ||
            districts.find((d) => candidate.district.startsWith(d.name));
          if (!districtInfo) return;

          const sameDistrict = byDistrict[candidate.district];
          const idx   = sameDistrict.findIndex((c) => c.id === candidate.id);
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
            anchor: new naver.maps.Point(isCute ? 60 : 55, isCute ? 38 : 35),
          },
          zIndex: 100,
        });

        const listener = naver.maps.Event.addListener(
          marker, "click", () => onCandidateClick(candidate)
        );
        candidateMarkersRef.current.push(marker);
        candidateListenersRef.current.push(listener);
      });
    },
    [candidates, districts, onCandidateClick, clearCandidateMarkers, isCute]
  );

  // Keep stable refs updated after every render that changes the callback.
  useEffect(() => { renderClustersRef.current      = renderPledgeClusters; }, [renderPledgeClusters]);
  useEffect(() => { addCandidateMarkersRef.current = addCandidateMarkers;  }, [addCandidateMarkers]);

  // ── Build / rebuild supercluster when pledges or category changes ──────────
  //
  // Also handles the fade-out → fade-in transition:
  //   1. Fade current visible markers to opacity 0 via DOM transition.
  //   2. After 150 ms, clear & re-render with the new supercluster.
  //
  useEffect(() => {
    // Filter pledges by selected category
    const filtered =
      !selectedCategory || selectedCategory === "all"
        ? pledges
        : pledges.filter((p) => p.category?.name === selectedCategory);

    // (Re-)build supercluster index
    const sc = new Supercluster<PledgePointProps>({
      radius:  60,
      maxZoom: 16, // naverZoom >= 17 → individual points (disableClusteringAtZoom)
      minZoom: 1,
    });
    sc.load(
      filtered.map((p) => ({
        type:     "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [p.longitude, p.latitude] },
        properties: { pledge: p },
      }))
    );
    superclusterRef.current = sc;

    if (!mapInstance.current) return;
    const map = mapInstance.current;

    // ── Fade out current markers before replacing them ─────────────────────
    const current = [
      ...clusterMarkersRef.current,
      ...pledgeMarkersRef.current,
    ];
    current.forEach((m) => {
      const el = m.getElement();
      if (el) {
        (el as HTMLElement).style.transition = "opacity 0.15s ease";
        (el as HTMLElement).style.opacity    = "0";
      }
    });

    const timer = setTimeout(() => {
      if (mapInstance.current === map) {
        renderClustersRef.current(map);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [pledges, selectedCategory]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-render clusters when pinSettings or isCute changes (new callback ref).
  useEffect(() => {
    if (!mapInstance.current) return;
    renderPledgeClusters(mapInstance.current);
  }, [renderPledgeClusters]);

  // ── Initialise map ────────────────────────────────────────────────────────
  //
  // Robust initialisation that handles:
  //  1. SDK race  — naver.maps.Map might not be a constructor yet.
  //  2. Slow paint — container may have 0×0 dims on first frame (mobile).
  //  3. Dirty DOM  — previous map.destroy() leaves child nodes.
  //  4. Tile blank — deferred resize at 300 ms, 800 ms, and 2 000 ms.
  //  5. Timeout    — polls every 100 ms for up to 10 s.
  //
  useEffect(() => {
    if (!mapRef.current) return;
    const container = mapRef.current;
    let destroyed   = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    const resizeTimers: ReturnType<typeof setTimeout>[] = [];

    // Inject marker fade-in keyframe CSS once into the document
    if (!document.getElementById("naver-marker-animations")) {
      const style = document.createElement("style");
      style.id          = "naver-marker-animations";
      style.textContent = MARKER_ANIM_CSS;
      document.head.appendChild(style);
    }

    const createMap = () => {
      if (destroyed) return;
      try {
        // Thoroughly clean container (fix 3); guarded for SDK race conditions
        try {
          while (container.firstChild) container.removeChild(container.firstChild);
        } catch { /* SDK may have already removed some nodes */ }

        // Apply the default district now if districts are already loaded.
        if (!defaultDistrictApplied.current) {
          const cur = districtsRef.current;
          const target = pendingDistrictRef.current;
          if (cur.length > 0) {
            const found =
              cur.find((d) => d.name === target) ||
              cur.find((d) => d.name.startsWith(target));
            if (found) {
              setCenter(found.centerLat, found.centerLng);
              setSelectedDistrict(found.name);
              defaultDistrictApplied.current = true;
            }
          }
        }

        const { center: initialCenter, zoomLevel: initialZoom } = useMapStore.getState();

        const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
        const map = new naver.maps.Map(container, {
          center: new naver.maps.LatLng(initialCenter.lat, initialCenter.lng),
          zoom:   toNaverZoom(initialZoom),
          zoomControl: !isMobile,
          zoomControlOptions: { position: naver.maps.Position.RIGHT_BOTTOM },
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

        // Debounced cluster re-render — avoids rapid DOM churn on slow Android
        // devices where zoom_changed fires many times during zoom animation.
        let clusterRenderTimer: ReturnType<typeof setTimeout> | null = null;
        const debouncedRenderClusters = () => {
          if (clusterRenderTimer) clearTimeout(clusterRenderTimer);
          clusterRenderTimer = setTimeout(() => {
            clusterRenderTimer = null;
            if (!destroyed && mapInstance.current === map) {
              renderClustersRef.current(map);
            }
          }, 80);
        };

        // zoom_changed: recompute clusters only (candidate positions are static)
        naver.maps.Event.addListener(map, "zoom_changed", () => {
          setZoomLevel(toStoreLevel(map.getZoom()));
          debouncedRenderClusters();
        });

        // dragend: recompute clusters for the new viewport bbox
        naver.maps.Event.addListener(map, "dragend", () => {
          const c = map.getCenter() as naver.maps.LatLng;
          setCenter(c.lat(), c.lng());
          debouncedRenderClusters();
        });

        renderClustersRef.current(map);
        addCandidateMarkersRef.current(map);
      } catch (e) {
        console.error("[NaverMap] Map creation failed:", e);
      }
    };

    let attempts = 0;
    pollTimer = setInterval(() => {
      if (destroyed) { if (pollTimer) clearInterval(pollTimer); return; }
      if (
        isNaverReady() &&
        container.offsetWidth  > 0 &&
        container.offsetHeight > 0 &&
        settingsLoadedRef.current
      ) {
        if (pollTimer) clearInterval(pollTimer);
        pollTimer = null;
        createMap();
      } else if (++attempts > 100) {
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
      clearClusterMarkers();
      clearSpiderfy();
      clearCandidateMarkers();
      if (mapInstance.current) {
        mapInstance.current.destroy();
        mapInstance.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync external center / zoom changes to map
  useEffect(() => {
    if (!mapInstance.current) return;
    mapInstance.current.setCenter(new naver.maps.LatLng(center.lat, center.lng));
    mapInstance.current.setZoom(toNaverZoom(zoomLevel));
  }, [center, zoomLevel]);

  // Refresh candidate markers when data, districts, or theme change
  useEffect(() => {
    if (!mapInstance.current) return;
    addCandidateMarkers(mapInstance.current);
  }, [candidates, districts, addCandidateMarkers]);

  // Show / update selection highlight ring when selectedPledgeId changes
  useEffect(() => {
    // Remove any existing ring
    if (selectedRingRef.current) {
      try { selectedRingRef.current.setMap(null); } catch { /* already detached */ }
      selectedRingRef.current = null;
    }
    if (!selectedPledgeId || !mapInstance.current) return;
    const pledge = pledges.find((p) => p.id === selectedPledgeId);
    if (!pledge) return;

    const ringColor = isCute ? "#FF6B9D" : "#FF5A00";
    const ringHtml =
      `<div style="width:56px;height:56px;border-radius:50%;border:3px solid ${ringColor};` +
      `box-shadow:0 0 0 6px ${ringColor}44;pointer-events:none;` +
      `animation:pledgePulse 1.4s ease-out infinite;"></div>`;

    try {
      selectedRingRef.current = new naver.maps.Marker({
        map: mapInstance.current,
        position: new naver.maps.LatLng(pledge.latitude, pledge.longitude),
        icon: {
          content: ringHtml,
          anchor: new naver.maps.Point(28, 28),
        },
        zIndex: 200,
      });
    } catch { /* SDK not ready */ }
  }, [selectedPledgeId, pledges, isCute]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={mapRef}
      className="w-full h-full"
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}
