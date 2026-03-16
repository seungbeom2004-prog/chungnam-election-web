"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import Supercluster from "supercluster";
import { useMapStore } from "@/store/useMapStore";
import type { Pledge, BylawGroup } from "@/types";
import type { CandidateForMap, DistrictCoords } from "@/components/map/MapPageContent";

export interface ProposalMapItem {
  id: string;
  title: string;
  authorName: string;
  content: string;
  latitude: number;
  longitude: number;
  likeCount: number;
}

interface NaverMapProps {
  pledges: Pledge[];
  candidates: CandidateForMap[];
  districts: DistrictCoords[];
  onPledgeClick: (pledge: Pledge) => void;
  onCandidateClick: (candidate: CandidateForMap) => void;
  bylawGroups?: BylawGroup[];
  onBylawGroupClick?: (group: BylawGroup) => void;
  proposals?: ProposalMapItem[];
  onProposalClick?: (proposal: ProposalMapItem) => void;
  isCute?: boolean;
  /** Category name to filter pledge markers. 'all' = show everything. */
  selectedCategory?: string;
  /** ID of the currently selected pledge — shows a highlight ring on the map. */
  selectedPledgeId?: string | null;
  /**
   * Increment this value whenever the map container's CSS size changes
   * (e.g. sidebar open/close). NaverMap will fire a resize event on the SDK
   * and re-render all markers so pins don't disappear in the newly exposed area.
   */
  resizeTrigger?: number;
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
      typeof naver.maps.LatLng === "function" &&
      !!naver.maps.Event &&
      typeof naver.maps.Event.addListener === "function"
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
    `will-change:transform,opacity;transform:translateZ(0);` +
    `animation:markerFadeIn 0.2s ease-out both;">` +
    `<span style="font-size:20px;line-height:1;font-family:sans-serif;">${emoji}</span>` +
    bgLayer +
    `</div>`
  );
}

/** Regular candidate pin (photo + name label). compact=true hides the text box. */
function buildCandidateMarkerHTML(candidate: CandidateForMap, compact = false): string {
  const electionLabel = candidate.detailedElectionName || candidate.electionType || candidate.electionName || "";
  // Most specific district: the ward portion after the first space (e.g. "다선거구" from "천안시서북구 다선거구")
  const spaceIdx = candidate.district ? candidate.district.indexOf(" ") : -1;
  const specificDistrict = spaceIdx > -1 ? candidate.district.slice(spaceIdx + 1) : candidate.district;
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

  if (compact) {
    return (
      `<div style="text-align:center;cursor:pointer;user-select:none;pointer-events:auto;` +
      `will-change:transform,opacity;transform:translateZ(0);backface-visibility:hidden;` +
      `animation:markerFadeIn 0.2s ease-out both;">` +
      `<div style="position:relative;display:inline-block;">` +
      `<div style="position:relative;display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:10px;overflow:hidden;border:2.5px solid ${BRAND_COLOR};background:${BRAND_COLOR};box-shadow:0 2px 8px rgba(0,0,0,0.3);">` +
      `<span style="font-size:16px;font-weight:800;color:white;font-family:sans-serif;">${escapeHtml(candidate.name.charAt(0))}</span>` +
      bgLayer +
      `</div>` +
      confirmedBadge +
      `</div>` +
      `</div>`
    );
  }

  return (
    `<div style="width:110px;text-align:center;cursor:pointer;user-select:none;pointer-events:auto;` +
    `will-change:transform,opacity;transform:translateZ(0);backface-visibility:hidden;` +
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
    (specificDistrict
      ? `<div style="font-size:9px;color:${BRAND_COLOR};margin-top:1px;line-height:1.3;font-family:sans-serif;">${escapeHtml(specificDistrict)}</div>`
      : "") +
    (candidate.candidateStatus
      ? `<div style="font-size:9px;color:${BRAND_COLOR};margin-top:1px;line-height:1.3;font-family:sans-serif;">${escapeHtml(candidate.candidateStatus)}</div>`
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
    // 3 blur-based drop-shadows replace the previous 9 directional filters.
    // Blur radius covers all directions at a fraction of the GPU cost.
    const shadow =
      `drop-shadow(0 0 2px #FFB6D5) ` +
      `drop-shadow(0 0 4px #FFB6D5) ` +
      `drop-shadow(0 0 8px rgba(255,107,157,0.4))`;
    return (
      `<div style="position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center;cursor:pointer;` +
      `will-change:transform,opacity;transform:translateZ(0);` +
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
    `justify-content:center;cursor:pointer;` +
    `will-change:transform,opacity;transform:translateZ(0);` +
    `animation:markerFadeIn 0.2s ease-out both;">` +
    `<span style="font-size:26px;line-height:1;">${emoji}</span>` +
    `</div>`
  );
}

/** Cute candidate pin (circular photo + speech-bubble label). compact=true hides the text bubble. */
function buildCuteCandidateMarkerHTML(candidate: CandidateForMap, compact = false): string {
  const electionLabel = candidate.detailedElectionName || candidate.electionType || candidate.electionName || "";
  const spaceIdx2 = candidate.district ? candidate.district.indexOf(" ") : -1;
  const specificDistrict2 = spaceIdx2 > -1 ? candidate.district.slice(spaceIdx2 + 1) : candidate.district;
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

  if (compact) {
    // 귀여운 테마: 캐릭터(원형)는 항상 full 크기로 표시, 말풍선만 숨김
    return (
      `<div style="width:120px;text-align:center;cursor:pointer;user-select:none;pointer-events:auto;` +
      `will-change:transform,opacity;transform:translateZ(0);backface-visibility:hidden;` +
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
      `</div>`
    );
  }

  return (
    `<div style="width:120px;text-align:center;cursor:pointer;user-select:none;pointer-events:auto;` +
    `will-change:transform,opacity;transform:translateZ(0);backface-visibility:hidden;` +
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
    (specificDistrict2
      ? `<div style="font-size:9px;color:${CUTE_COLOR};margin-top:1px;line-height:1.3;${cuteFont}">${escapeHtml(specificDistrict2)}</div>`
      : "") +
    (candidate.candidateStatus
      ? `<div style="font-size:9px;color:${CUTE_COLOR};margin-top:1px;line-height:1.3;${cuteFont}">${escapeHtml(candidate.candidateStatus)}</div>`
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
    `will-change:transform,opacity;transform:translateZ(0);` +
    `cursor:pointer;animation:markerFadeIn 0.2s ease-out both;">` +
    count +
    `</div>`
  );
}

/** Bylaw council pin — blue with 📜 emoji, city label, and always-visible count badge. */
function buildBylawMarkerHTML(cityName: string, count: number): string {
  return (
    `<div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;` +
    `will-change:transform,opacity;transform:translateZ(0);` +
    `animation:markerFadeIn 0.2s ease-out both;">` +
    `<div style="position:relative;width:44px;height:44px;background:#3B82F6;border-radius:12px;` +
    `border:2.5px solid white;display:flex;align-items:center;justify-content:center;` +
    `overflow:visible;box-shadow:0 3px 10px rgba(59,130,246,0.55);">` +
    `<span style="font-size:22px;line-height:1;">📜</span>` +
    `<div style="position:absolute;top:-9px;right:-9px;background:#EF4444;color:white;` +
    `font-size:11px;font-weight:800;min-width:20px;height:20px;border-radius:10px;` +
    `border:2.5px solid white;display:flex;align-items:center;justify-content:center;` +
    `padding:0 4px;box-shadow:0 1px 4px rgba(0,0,0,0.35);z-index:1;">${count}</div>` +
    `</div>` +
    `<div style="margin-top:4px;background:#3B82F6;color:white;font-size:10px;font-weight:700;` +
    `padding:2px 7px;border-radius:6px;white-space:nowrap;max-width:90px;overflow:hidden;` +
    `text-overflow:ellipsis;box-shadow:0 1px 4px rgba(0,0,0,0.25);">${escapeHtml(cityName)}</div>` +
    `</div>`
  );
}

/** Citizen proposal pin — purple speech bubble with like count. */
function buildProposalMarkerHTML(authorName: string, likeCount: number, isCute: boolean): string {
  const color = isCute ? "#A855F7" : "#7C3AED";
  const truncated = authorName.length > 6 ? authorName.slice(0, 6) + "…" : authorName;
  const likeStr = likeCount > 0 ? ` ♥${likeCount}` : "";
  return (
    `<div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;` +
    `will-change:transform,opacity;transform:translateZ(0);` +
    `animation:markerFadeIn 0.2s ease-out both;">` +
    `<div style="position:relative;width:40px;height:40px;background:${color};border-radius:10px;` +
    `border:2.5px solid white;display:flex;align-items:center;justify-content:center;` +
    `box-shadow:0 2px 8px rgba(124,58,237,0.45);">` +
    `<span style="font-size:20px;line-height:1;">💬</span>` +
    (likeCount > 0
      ? `<div style="position:absolute;top:-8px;right:-8px;background:#EF4444;color:white;` +
        `font-size:10px;font-weight:700;min-width:18px;height:18px;border-radius:9px;` +
        `border:2px solid white;display:flex;align-items:center;justify-content:center;` +
        `padding:0 3px;">♥${likeCount}</div>`
      : "") +
    `</div>` +
    `<div style="margin-top:3px;background:${color};color:white;font-size:9px;font-weight:700;` +
    `padding:1px 6px;border-radius:4px;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,0.25);">` +
    `${escapeHtml(truncated)}${likeStr}</div>` +
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
  bylawGroups,
  onBylawGroupClick,
  proposals = [],
  onProposalClick,
  isCute = false,
  selectedCategory = "all",
  selectedPledgeId = null,
  resizeTrigger = 0,
}: NaverMapProps) {
  const mapRef         = useRef<HTMLDivElement>(null);
  const mapInstance    = useRef<naver.maps.Map | null>(null);

  // ── Marker collections ────────────────────────────────────────────────────
  // Individual pledge markers (from cluster leaf rendering)
  const pledgeMarkersRef   = useRef<naver.maps.Marker[]>([]);
  const pledgeListenersRef = useRef<naver.maps.MapEventListener[]>([]);
  // Bylaw council markers
  const bylawMarkersRef   = useRef<naver.maps.Marker[]>([]);
  const bylawListenersRef = useRef<naver.maps.MapEventListener[]>([]);
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
  // Proposal (citizen suggestion) markers
  const proposalMarkersRef   = useRef<naver.maps.Marker[]>([]);
  const proposalListenersRef = useRef<naver.maps.MapEventListener[]>([]);
  // Selection highlight ring (shown at the selected pledge's position)
  const selectedRingRef = useRef<naver.maps.Marker | null>(null);

  // ── Supercluster ──────────────────────────────────────────────────────────
  const superclusterRef = useRef<Supercluster<PledgePointProps> | null>(null);

  // Stable ref-based callbacks so the long-lived map event listeners never
  // hold stale closures.
  const renderClustersRef      = useRef<(map: naver.maps.Map) => void>(() => {});
  const addCandidateMarkersRef = useRef<(map: naver.maps.Map) => void>(() => {});
  const addBylawMarkersRef     = useRef<(map: naver.maps.Map) => void>(() => {});
  const addProposalMarkersRef  = useRef<(map: naver.maps.Map) => void>(() => {});

  // Keep stable refs for bylaw data to avoid stale closures
  const bylawGroupsRef       = useRef<BylawGroup[] | undefined>(bylawGroups);
  const onBylawGroupClickRef = useRef<((group: BylawGroup) => void) | undefined>(onBylawGroupClick);
  useEffect(() => { bylawGroupsRef.current = bylawGroups; }, [bylawGroups]);
  useEffect(() => { onBylawGroupClickRef.current = onBylawGroupClick; }, [onBylawGroupClick]);

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

  const clearBylawMarkers = useCallback(() => {
    bylawListenersRef.current.forEach(safeRemoveListener);
    bylawListenersRef.current = [];
    bylawMarkersRef.current.forEach(safeSetMapNull);
    bylawMarkersRef.current = [];
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const clearProposalMarkers = useCallback(() => {
    proposalListenersRef.current.forEach(safeRemoveListener);
    proposalListenersRef.current = [];
    proposalMarkersRef.current.forEach(safeSetMapNull);
    proposalMarkersRef.current = [];
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

  // Zoom threshold below which candidate label boxes are hidden (compact mode)
  // 13 means labels only appear when zoomed in enough that pins don't overlap
  const CANDIDATE_LABEL_ZOOM = 13;

  // ── Candidate markers ─────────────────────────────────────────────────────

  const addCandidateMarkers = useCallback(
    (map: naver.maps.Map) => {
      clearCandidateMarkers();
      if (!Array.isArray(candidates) || !Array.isArray(districts)) return;

      // Hide label box when zoomed out (overlapping pins)
      let baseCompact = false;
      try { baseCompact = map.getZoom() < CANDIDATE_LABEL_ZOOM; } catch { /* ignore */ }

      const byDistrict: Record<string, CandidateForMap[]> = {};
      candidates.forEach((c) => {
        if (!byDistrict[c.district]) byDistrict[c.district] = [];
        byDistrict[c.district].push(c);
      });

      // Sort by createdAt asc so earlier-registered get higher z-index (appear on top)
      const sortedByJoin = [...candidates].sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return ta - tb;
      });
      const zIndexByCandidate: Record<string, number> = {};
      sortedByJoin.forEach((c, i) => {
        zIndexByCandidate[c.id] = 500 + (sortedByJoin.length - i); // 후보자 마커는 항상 공약 핀(z:50) 위에 표시
      });

      // ── Pass 1: compute lat/lng for every candidate ────────────────────────
      type CandidatePos = { candidate: CandidateForMap; lat: number; lng: number };
      const positions: CandidatePos[] = [];

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

        positions.push({ candidate, lat, lng });
      });

      // ── Pass 2: pixel-space collision detection → per-candidate compact ────
      // Full-mode label bbox offsets from the geo anchor point (with padding).
      // Non-cute: container width=110px, anchor (55,35), circle 64×64px + label below.
      //   Actual bottom ≈ photo(64) + gap(4) + namebox(~75) − anchor_y(35) ≈ 108px
      //   Add 20px horizontal padding and extra vertical buffer → generous box.
      // Cute: container width=120px, anchor (60,38), circle 68×68px + label below.
      const fullBox = isCute
        ? { l: -70, r: 70, t: -42, b: 115 }
        : { l: -65, r: 65, t: -38, b: 115 };
      // Compact mode: symmetric ±half square (avoids asymmetric anchor issues)
      const compactHalf = isCute ? 30 : 28;

      const compactById: Record<string, boolean> = {};
      const pixelPos: Record<string, { x: number; y: number }> = {};

      // Convert geo → screen pixel for every candidate
      if (!baseCompact) {
        try {
          const projection = map.getProjection();
          if (projection) {
            for (const { candidate, lat, lng } of positions) {
              const offset = projection.fromCoordToOffset(new naver.maps.LatLng(lat, lng));
              pixelPos[candidate.id] = { x: offset.x, y: offset.y };
            }
          }
        } catch { /* projection unavailable — skip collision detection */ }
      }

      // Process candidates in priority order (earlier-joined = higher priority = full mode kept)
      for (const c of sortedByJoin) {
        if (baseCompact) { compactById[c.id] = true; continue; }
        const pos = pixelPos[c.id];
        // If projection unavailable for this candidate, default compact (safe: no overlap)
        if (!pos) { compactById[c.id] = true; continue; }

        let collision = false;
        // Check against every higher-priority candidate that was already processed
        for (const other of sortedByJoin) {
          if (other.id === c.id) break; // reached current candidate — stop
          const op = pixelPos[other.id];
          if (!op) continue;

          // Always treat other as full-mode for collision check (worst-case overlap test)
          // Current candidate's full label bbox in screen space
          const cL = pos.x + fullBox.l;
          const cR = pos.x + fullBox.r;
          const cT = pos.y + fullBox.t;
          const cB = pos.y + fullBox.b;

          const oL = op.x + fullBox.l;
          const oR = op.x + fullBox.r;
          const oT = op.y + fullBox.t;
          const oB = op.y + fullBox.b;
          if (cL < oR && cR > oL && cT < oB && cB > oT) { collision = true; break; }
        }

        compactById[c.id] = collision;
      }

      // ── Global sync: if ANY candidate needs compact mode, ALL go compact ──────
      // This ensures visual consistency — labels either all show or all hide together.
      // (Prevents the confusing state where one candidate shows a label but a nearby
      //  one shows only the compact icon.)
      if (Object.values(compactById).some(Boolean)) {
        for (const { candidate } of positions) {
          compactById[candidate.id] = true;
        }
      }

      // ── Pass 3: create markers ─────────────────────────────────────────────
      for (const { candidate, lat, lng } of positions) {
        const compact = compactById[candidate.id] ?? baseCompact;

        const markerHtml = isCute
          ? buildCuteCandidateMarkerHTML(candidate, compact)
          : buildCandidateMarkerHTML(candidate, compact);

        const marker = new naver.maps.Marker({
          map,
          position: new naver.maps.LatLng(lat, lng),
          icon: {
            content: markerHtml,
            anchor: (compact && !isCute)
              ? new naver.maps.Point(32, 32)   // non-cute compact: small square, center anchor
              : new naver.maps.Point(isCute ? 60 : 55, isCute ? 38 : 35), // cute: always full anchor (캐릭터 항상 표시)
          },
          zIndex: zIndexByCandidate[candidate.id] ?? 100,
        });

        const listener = naver.maps.Event.addListener(
          marker, "click", () => onCandidateClick(candidate)
        );
        candidateMarkersRef.current.push(marker);
        candidateListenersRef.current.push(listener);
      }
    },
    [candidates, districts, onCandidateClick, clearCandidateMarkers, isCute] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const addBylawMarkers = useCallback(
    (map: naver.maps.Map) => {
      clearBylawMarkers();
      const groups = bylawGroupsRef.current;
      const onClick = onBylawGroupClickRef.current;
      if (!groups || !onClick) return;
      for (const group of groups) {
        const markerHtml = buildBylawMarkerHTML(group.cityName, group.pledges.length);
        const marker = new naver.maps.Marker({
          map,
          position: new naver.maps.LatLng(group.councilLat, group.councilLng),
          icon: {
            content: markerHtml,
            anchor: new naver.maps.Point(24, 48),
          },
          zIndex: 8,
        });
        const listener = naver.maps.Event.addListener(marker, "click", () => {
          onClick(group);
        });
        bylawMarkersRef.current.push(marker);
        bylawListenersRef.current.push(listener);
      }
    },
    [clearBylawMarkers]
  );

  // ── Proposal markers ──────────────────────────────────────────────────────
  // Keep a stable ref to the proposals + callback to avoid stale closures
  const proposalsRef       = useRef(proposals);
  const onProposalClickRef = useRef(onProposalClick);
  useEffect(() => { proposalsRef.current       = proposals;       }, [proposals]);
  useEffect(() => { onProposalClickRef.current = onProposalClick; }, [onProposalClick]);

  const addProposalMarkers = useCallback(
    (map: naver.maps.Map) => {
      clearProposalMarkers();
      const items = proposalsRef.current;
      const onClick = onProposalClickRef.current;
      if (!items || items.length === 0) return;
      for (const proposal of items) {
        const markerHtml = buildProposalMarkerHTML(proposal.authorName, proposal.likeCount ?? 0, isCute);
        const marker = new naver.maps.Marker({
          map,
          position: new naver.maps.LatLng(proposal.latitude, proposal.longitude),
          icon: {
            content: markerHtml,
            anchor: new naver.maps.Point(20, 52),
          },
          zIndex: 6,
        });
        const listener = naver.maps.Event.addListener(marker, "click", () => {
          onClick?.(proposal);
        });
        proposalMarkersRef.current.push(marker);
        proposalListenersRef.current.push(listener);
      }
    },
    [clearProposalMarkers, isCute]
  );

  // Keep stable refs updated after every render that changes the callback.
  useEffect(() => { renderClustersRef.current      = renderPledgeClusters; }, [renderPledgeClusters]);
  useEffect(() => { addCandidateMarkersRef.current = addCandidateMarkers;  }, [addCandidateMarkers]);
  useEffect(() => { addBylawMarkersRef.current     = addBylawMarkers;      }, [addBylawMarkers]);
  useEffect(() => { addProposalMarkersRef.current  = addProposalMarkers;   }, [addProposalMarkers]);

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
          zoomControl:  false, // 커스텀 +/- 버튼 사용
          scaleControl: false, // 축척 바 제거
        });

        mapInstance.current = map;

        // Multiple deferred resizes — slow devices need more time (fix 4)
        [300, 800, 2000].forEach((ms) => {
          resizeTimers.push(
            setTimeout(() => {
              try {
                if (!destroyed && mapInstance.current === map) {
                  naver.maps.Event.trigger(map, "resize");
                }
              } catch { /* SDK may have been unloaded (e.g. auth failure on localhost) */ }
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

        // Track previous zoom to detect threshold crossings
        let prevNaverZoom = map.getZoom();

        // Debounced candidate re-render — re-run collision detection on every zoom change
        let candidateRenderTimer: ReturnType<typeof setTimeout> | null = null;
        const debouncedRenderCandidates = () => {
          if (candidateRenderTimer) clearTimeout(candidateRenderTimer);
          candidateRenderTimer = setTimeout(() => {
            candidateRenderTimer = null;
            if (!destroyed && mapInstance.current === map) {
              addCandidateMarkersRef.current(map);
            }
          }, 150);
        };

        // zoom_changed: recompute clusters + re-render candidate markers (recalculate collision)
        naver.maps.Event.addListener(map, "zoom_changed", () => {
          const curZoom = map.getZoom();
          setZoomLevel(toStoreLevel(curZoom));
          debouncedRenderClusters();
          debouncedRenderCandidates();
          prevNaverZoom = curZoom;
        });

        // dragend: recompute clusters for the new viewport bbox
        naver.maps.Event.addListener(map, "dragend", () => {
          const c = map.getCenter() as naver.maps.LatLng;
          setCenter(c.lat(), c.lng());
          debouncedRenderClusters();
        });

        renderClustersRef.current(map);
        addCandidateMarkersRef.current(map);
        addBylawMarkersRef.current(map);
        addProposalMarkersRef.current(map);
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
      clearBylawMarkers();
      clearProposalMarkers();
      if (mapInstance.current) {
        try { mapInstance.current.destroy(); } catch { /* SDK may throw on auth-failed maps */ }
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

  // Trigger map resize when the container's CSS dimensions change (e.g. sidebar open/close).
  // The 210ms delay matches the CSS transition-[width] duration-200 + 10ms buffer.
  useEffect(() => {
    if (resizeTrigger === 0) return; // skip the initial render
    const timer = setTimeout(() => {
      try {
        if (mapInstance.current) {
          naver.maps.Event.trigger(mapInstance.current, "resize");
          // Re-render clusters and candidate markers after resize
          renderClustersRef.current?.(mapInstance.current);
          addCandidateMarkersRef.current?.(mapInstance.current);
        }
      } catch { /* SDK may not be ready */ }
    }, 210);
    return () => clearTimeout(timer);
  }, [resizeTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh candidate markers when data, districts, or theme change
  useEffect(() => {
    if (!mapInstance.current) return;
    addCandidateMarkers(mapInstance.current);
  }, [candidates, districts, addCandidateMarkers]);

  // Refresh bylaw markers when groups change
  useEffect(() => {
    if (!mapInstance.current) return;
    addBylawMarkers(mapInstance.current);
  }, [bylawGroups, addBylawMarkers]);

  // Refresh proposal markers when proposals prop changes
  useEffect(() => {
    if (!mapInstance.current) return;
    addProposalMarkers(mapInstance.current);
  }, [proposals, addProposalMarkers]);

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

  // ── Custom zoom button handlers ───────────────────────────────────────────
  const handleZoomIn = useCallback(() => {
    if (!mapInstance.current) return;
    try { mapInstance.current.setZoom(Math.min(mapInstance.current.getZoom() + 1, 21)); } catch { /* ignore */ }
  }, []);
  const handleZoomOut = useCallback(() => {
    if (!mapInstance.current) return;
    try { mapInstance.current.setZoom(Math.max(mapInstance.current.getZoom() - 1, 1)); } catch { /* ignore */ }
  }, []);

  // Shared button style
  const btnBase: React.CSSProperties = {
    width: "36px", height: "36px",
    background: "#fff",
    border: `1.5px solid ${isCute ? "#FFB6D5" : "#e0e0e0"}`,
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", userSelect: "none",
    fontSize: "20px", fontWeight: 700, lineHeight: 1,
    color: isCute ? CUTE_COLOR : BRAND_COLOR,
    boxShadow: "0 2px 8px rgba(0,0,0,0.13)",
    transition: "background 0.15s",
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div
        ref={mapRef}
        className="w-full h-full"
        style={{ width: "100%", height: "100%", display: "block" }}
      />
      {/* ── Custom +/- zoom buttons ── */}
      <div style={{ position: "absolute", right: "14px", bottom: "32px", display: "flex", flexDirection: "column", zIndex: 20, borderRadius: "8px", overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.18)" }}>
        <button
          onClick={handleZoomIn}
          aria-label="확대"
          style={{ ...btnBase, borderRadius: "8px 8px 0 0", borderBottom: "none" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = isCute ? "#FFF0F6" : "#FFF5F0"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#fff"; }}
        >+</button>
        <div style={{ height: "1px", background: isCute ? "#FFB6D5" : "#e0e0e0" }} />
        <button
          onClick={handleZoomOut}
          aria-label="축소"
          style={{ ...btnBase, borderRadius: "0 0 8px 8px", borderTop: "none" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = isCute ? "#FFF0F6" : "#FFF5F0"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#fff"; }}
        >−</button>
      </div>
    </div>
  );
}
