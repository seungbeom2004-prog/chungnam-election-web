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
      const color = item.postType === "민원" ? "#FF5A00" : "#3B82F6";
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
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 w-[min(90%,380px)] bg-white rounded-2xl shadow-xl border border-border overflow-hidden">
          <div className="flex items-start gap-3 p-4">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-white text-xs font-bold"
              style={{ backgroundColor: selected.postType === "민원" ? "#FF5A00" : "#3B82F6" }}
            >
              {selected.postType === "민원" ? "📢" : "💡"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: selected.postType === "민원" ? "#FF5A00" : "#3B82F6" }}
                >
                  {selected.postType}
                </span>
                <span className="text-xs text-muted">{selected.authorName}</span>
              </div>
              {selected.title && <p className="text-sm font-semibold text-foreground leading-snug">{selected.title}</p>}
              <p className="text-xs text-muted mt-1 line-clamp-2">{selected.content}</p>
            </div>
            <button onClick={() => setSelected(null)} className="shrink-0 text-muted hover:text-foreground text-lg leading-none">×</button>
          </div>
        </div>
      )}
    </div>
  );
}
