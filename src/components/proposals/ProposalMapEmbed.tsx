"use client";

import { useEffect, useRef, useState } from "react";

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

export default function ProposalMapEmbed({ items, onMarkerClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([]);
  const [selected, setSelected] = useState<ProposalMapItem | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    let polls = 0;
    const timer = setInterval(() => {
      const n = window.naver;
      if (n?.maps?.Map) {
        clearInterval(timer);
        if (!mapRef.current && containerRef.current) {
          mapRef.current = new n.maps.Map(containerRef.current, {
            center: new n.maps.LatLng(36.5184, 126.8000),
            zoom: 9,
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

    items.forEach((item) => {
      const color = item.postType === "민원" ? "#EF4444" : "#FACC15";
      const marker = new n.maps.Marker({
        position: new n.maps.LatLng(item.latitude, item.longitude),
        map: mapRef.current,
        icon: {
          content: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);cursor:pointer;"></div>`,
          anchor: new n.maps.Point(7, 7),
        },
      });
      n.maps.Event.addListener(marker, "click", () => {
        setSelected(item);
        onMarkerClick?.(item);
      });
      markersRef.current.push(marker);
    });
  }

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      {selected && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 w-[min(90%,380px)] bg-white rounded-2xl shadow-xl overflow-hidden"
          style={{ border: `1.5px solid ${selected.postType === "민원" ? "#FCA5A5" : "#FDE68A"}` }}
        >
          {/* Header */}
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
          {/* Content + like */}
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
          {/* Footer link */}
          <div className="px-4 pb-4">
            <a
              href="/proposals"
              className="block w-full text-center py-2 text-xs font-semibold rounded-xl transition-colors"
              style={{
                color: selected.postType === "민원" ? "#EF4444" : "#B45309",
                backgroundColor: selected.postType === "민원" ? "#FEF2F2" : "#FEFCE8",
              }}
            >
              불편 제보 & 공약 제안 게시판에서 보기 →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
