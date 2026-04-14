"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface Post {
  id: string;
  title: string | null;
  content: string;
  city: string | null;
  dong: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

interface Props {
  posts: Post[];
}

const NAVER_SCRIPT_ID = "naver-maps-sdk";
const CENTER = { lat: 36.5184, lng: 126.8 };

function isSdkReady(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return !!((window as any).naver?.maps?.Map);
  } catch {
    return false;
  }
}

function getTitle(post: Post): string {
  if (post.title) return post.title;
  return post.content.length > 30 ? post.content.slice(0, 30) + "…" : post.content;
}

export default function PostListMap({ posts }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  const markers = posts
    .filter((p) => p.latitude != null && p.longitude != null)
    .map((p) => ({ post: p, lat: p.latitude!, lng: p.longitude! }));

  useEffect(() => {
    if (isSdkReady()) {
      setSdkReady(true);
      return;
    }
    if (document.getElementById(NAVER_SCRIPT_ID)) {
      const t = setInterval(() => {
        if (isSdkReady()) {
          setSdkReady(true);
          clearInterval(t);
        }
      }, 150);
      return () => clearInterval(t);
    }
    const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;
    if (!clientId) return;
    const s = document.createElement("script");
    s.id = NAVER_SCRIPT_ID;
    s.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}`;
    s.onload = () => setSdkReady(true);
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    if (!sdkReady || !containerRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const naver = (window as any).naver;
    if (!naver?.maps) return;
    const maps = naver.maps;

    const map = new maps.Map(containerRef.current, {
      center: new maps.LatLng(CENTER.lat, CENTER.lng),
      zoom: 9,
      zoomControl: true,
      zoomControlOptions: { position: 3 },
    });
    mapRef.current = map;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const naverMarkers: any[] = [];

    for (const m of markers) {
      const marker = new maps.Marker({
        position: new maps.LatLng(m.lat, m.lng),
        map,
        title: getTitle(m.post),
        icon: {
          content: `<div style="width:10px;height:10px;background:#f97316;border-radius:50%;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4);cursor:pointer;"></div>`,
          anchor: new maps.Point(5, 5),
        },
      });

      maps.Event.addListener(marker, "click", () => {
        setSelectedPost(m.post);
      });

      naverMarkers.push(marker);
    }

    if (markers.length > 1) {
      const sw = new maps.LatLng(
        Math.min(...markers.map((m) => m.lat)),
        Math.min(...markers.map((m) => m.lng))
      );
      const ne = new maps.LatLng(
        Math.max(...markers.map((m) => m.lat)),
        Math.max(...markers.map((m) => m.lng))
      );
      const bounds = new maps.LatLngBounds(sw, ne);
      map.fitBounds(bounds, { top: 30, right: 30, bottom: 30, left: 30 });
    }

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      naverMarkers.forEach((m: any) => m.setMap(null));
      map.destroy();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sdkReady, markers.length]);

  if (!process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID && typeof window !== "undefined") {
    return (
      <div className="w-full h-48 flex items-center justify-center text-xs text-muted">
        지도 API 키가 설정되지 않았습니다
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="w-full bg-surface"
        style={{ height: 220 }}
      />
      {markers.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-muted bg-background/80">
          위치 정보가 있는 제보가 없습니다
        </div>
      )}
      {selectedPost && (
        <div className="absolute bottom-2 left-2 right-2 bg-white border border-border rounded-lg shadow-md px-3 py-2 flex items-center justify-between gap-2 z-10">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{getTitle(selectedPost)}</p>
            {(selectedPost.city || selectedPost.dong) && (
              <p className="text-[10px] text-muted truncate">
                📍 {[selectedPost.city, selectedPost.dong].filter(Boolean).join(" ")}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Link
              href={`/proposals/${selectedPost.id}`}
              className="text-[10px] font-bold text-orange-600 hover:text-orange-700 whitespace-nowrap"
            >
              보기 →
            </Link>
            <button
              onClick={() => setSelectedPost(null)}
              className="text-muted hover:text-foreground"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
