"use client";

import { useEffect, useRef, useState } from "react";
import { CHUNGNAM_DISTRICTS, CHUNGNAM_CENTER } from "@/lib/districts";

interface ProposalMapItem {
  id: string;
  title: string;
  content: string;
  authorName: string;
  postType: string;
  latitude: number;
  longitude: number;
  likeCount?: number;
  createdAt: string;
}

interface Props {
  items: ProposalMapItem[];
  onMarkerClick?: (item: ProposalMapItem) => void;
}

function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}. ${m}. ${day}`;
}

/** Get initial map center from the last city viewed on the pledge map */
function getInitialCenter(): { lat: number; lng: number } {
  try {
    const lastCity = localStorage.getItem("mapLastCity");
    if (lastCity) {
      const d = CHUNGNAM_DISTRICTS.find((d) => d.name === lastCity);
      if (d) return { lat: d.centerLat, lng: d.centerLng };
    }
  } catch {}
  return CHUNGNAM_CENTER;
}

/** Round coordinates to detect same-city-center groupings (4 decimal places ≈ 11m precision) */
function coordKey(lat: number, lng: number): string {
  return `${lat.toFixed(3)},${lng.toFixed(3)}`;
}

export default function ProposalMapEmbed({ items, onMarkerClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([]);
  const [selected, setSelected] = useState<ProposalMapItem | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<ProposalMapItem[] | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const initialCenter = getInitialCenter();
    let polls = 0;
    const timer = setInterval(() => {
      const n = window.naver;
      if (n?.maps?.Map) {
        clearInterval(timer);
        if (!mapRef.current && containerRef.current) {
          mapRef.current = new n.maps.Map(containerRef.current, {
            center: new n.maps.LatLng(initialCenter.lat, initialCenter.lng),
            zoom: 10, // Shows 2-3 cities at a time
            mapTypeControl: false,
            zoomControl: true,
            zoomControlOptions: { position: n.maps.Position.RIGHT_BOTTOM },
          });
        }
        renderMarkers(n);
      } else if (++polls > 50) clearInterval(timer);
    }, 200);
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const n = window.naver;
    if (n?.maps?.Map && mapRef.current) renderMarkers(n);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function renderMarkers(n: any) {
    // Clear old markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    // Group items by rounded coordinate (city-center grouping)
    const groups = new Map<string, ProposalMapItem[]>();
    for (const item of items) {
      const key = coordKey(item.latitude, item.longitude);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    }

    for (const [, group] of groups) {
      const first = group[0]!;
      const isMultiple = group.length > 1;
      const color = first.postType === "민원" ? "#EF4444" : "#FACC15";

      const content = isMultiple
        ? // Stack badge for multiple items at same coordinate
          `<div style="position:relative;cursor:pointer;">` +
          `<div style="width:66px;height:66px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">` +
          `<span style="font-size:22px;font-weight:800;color:${first.postType === "민원" ? "white" : "#1F2937"};">${group.length}</span>` +
          `</div></div>`
        : // Single dot
          `<div style="width:42px;height:42px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);cursor:pointer;"></div>`;

      const marker = new n.maps.Marker({
        position: new n.maps.LatLng(first.latitude, first.longitude),
        map: mapRef.current,
        icon: {
          content,
          anchor: new n.maps.Point(isMultiple ? 33 : 21, isMultiple ? 33 : 21),
        },
      });

      n.maps.Event.addListener(marker, "click", () => {
        if (isMultiple) {
          setSelectedGroup(group);
          setSelected(null);
        } else {
          setSelected(first);
          setSelectedGroup(null);
          onMarkerClick?.(first);
        }
      });
      markersRef.current.push(marker);
    }
  }

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

      {/* Single item popup */}
      {selected && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 w-[min(90%,380px)] bg-white rounded-2xl shadow-xl overflow-hidden"
          style={{ border: `1.5px solid ${selected.postType === "민원" ? "#FCA5A5" : "#FDE68A"}` }}
        >
          <div className="flex items-start gap-3 px-4 pt-4 pb-2">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5"
              style={{ backgroundColor: selected.postType === "민원" ? "#FEE2E2" : "#FEF9C3" }}
            >
              <span className="text-base">{selected.postType === "민원" ? "📢" : "💡"}</span>
            </div>
            <div className="flex-1 min-w-0">
              <span
                className="text-xs font-bold"
                style={{ color: selected.postType === "민원" ? "#EF4444" : "#B45309" }}
              >
                {selected.postType === "민원" ? "불편 제보" : "공약 제안"}
              </span>
              {selected.title && (
                <p className="text-sm font-bold text-foreground leading-snug truncate mt-0.5">{selected.title}</p>
              )}
              <p className="text-[11px] text-muted mt-0.5">
                {selected.authorName} · ♥ {selected.likeCount ?? 0} · {formatDate(selected.createdAt)}
              </p>
            </div>
            <button onClick={() => setSelected(null)} className="shrink-0 text-muted hover:text-foreground text-xl leading-none mt-0.5">×</button>
          </div>
          <div className="px-4 pb-3 flex items-start justify-between gap-3">
            <p className="text-xs text-muted leading-relaxed line-clamp-2 flex-1">{selected.content}</p>
            <span
              className="shrink-0 flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border whitespace-nowrap"
              style={{
                color: selected.postType === "민원" ? "#EF4444" : "#B45309",
                borderColor: selected.postType === "민원" ? "#FCA5A5" : "#FDE68A",
                backgroundColor: selected.postType === "민원" ? "#FEF2F2" : "#FEFCE8",
              }}
            >
              ♡ 좋아요 {selected.likeCount ?? 0}
            </span>
          </div>
          <div className="px-4 pb-4">
            <a href="/proposals" className="block w-full text-center py-2 text-xs font-semibold rounded-xl transition-colors"
              style={{ color: selected.postType === "민원" ? "#EF4444" : "#B45309", backgroundColor: selected.postType === "민원" ? "#FEF2F2" : "#FEFCE8" }}>
              불편 제보 &amp; 공약 제안 게시판에서 보기 →
            </a>
          </div>
        </div>
      )}

      {/* Group list popup (same-coordinate items) */}
      {selectedGroup && selectedGroup.length > 0 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 w-[min(92%,420px)] bg-white rounded-2xl shadow-xl overflow-hidden border border-border">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div>
              <p className="text-sm font-bold text-foreground">
                📍 {(() => {
                  const d = CHUNGNAM_DISTRICTS.find(
                    (d) => Math.abs(d.centerLat - selectedGroup[0]!.latitude) < 0.01 &&
                           Math.abs(d.centerLng - selectedGroup[0]!.longitude) < 0.01
                  );
                  return d ? `${d.name} 전체` : "같은 위치";
                })()}
              </p>
              <p className="text-xs text-muted mt-0.5">총 {selectedGroup.length}건</p>
            </div>
            <button onClick={() => setSelectedGroup(null)} className="text-muted hover:text-foreground text-xl leading-none">×</button>
          </div>
          {/* List */}
          <div className="max-h-60 overflow-y-auto divide-y divide-border/50">
            {selectedGroup.map((item) => (
              <button
                key={item.id}
                className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors"
                onClick={() => { setSelected(item); setSelectedGroup(null); onMarkerClick?.(item); }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: item.postType === "민원" ? "#EF4444" : "#B45309" }}
                  >
                    {item.postType === "민원" ? "불편" : "제안"}
                  </span>
                  <span className="flex-1 text-sm font-medium text-foreground truncate">{item.title}</span>
                  <span className="shrink-0 text-xs text-muted">♥{item.likeCount ?? 0}</span>
                </div>
                <p className="text-xs text-muted mt-0.5 truncate">{item.authorName} · {formatDate(item.createdAt)}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
