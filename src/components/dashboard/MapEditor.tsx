"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { CHUNGNAM_DISTRICTS } from "@/lib/districts";
import type { Pledge } from "@/types";

interface MapEditorProps {
  pledges: Pledge[];
  draftPin: { lat: number; lng: number } | null;
  onMapClick: (lat: number, lng: number) => void;
  pinLat?: number | null;
  pinLng?: number | null;
}

const ORANGE_PIN_SVG =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40"><path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.268 21.732 0 14 0z" fill="%23FF5A00"/><circle cx="14" cy="14" r="6" fill="white"/></svg>'
  );

const DRAFT_PIN_SVG =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40"><path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.268 21.732 0 14 0z" fill="%23FF5A00" opacity="0.6"/><circle cx="14" cy="14" r="6" fill="white"/><path d="M11 14h6M14 11v6" stroke="%23FF5A00" stroke-width="1.5" stroke-linecap="round"/></svg>'
  );

export default function MapEditor({
  pledges,
  draftPin,
  onMapClick,
  pinLat,
  pinLng,
}: MapEditorProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<naver.maps.Map | null>(null);
  const markersRef = useRef<naver.maps.Marker[]>([]);
  const { data: session } = useSession();

  const district = (session?.user as { district?: string })?.district;

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || typeof naver === "undefined") return;

    const districtData = CHUNGNAM_DISTRICTS.find((d) => d.name === district);
    const districtCenter = districtData
      ? { lat: districtData.centerLat, lng: districtData.centerLng }
      : { lat: 36.5184, lng: 126.8 };
    const center =
      pinLat != null && pinLng != null
        ? { lat: pinLat, lng: pinLng }
        : districtCenter;

    const map = new naver.maps.Map(mapRef.current, {
      center: new naver.maps.LatLng(center.lat, center.lng),
      zoom: 12,
      zoomControl: false,
      scaleControl: false,
    });

    mapInstance.current = map;

    // Click handler to drop pins
    naver.maps.Event.addListener(map, "click", (e: naver.maps.PointerEvent) => {
      const latlng = e.coord as naver.maps.LatLng;
      onMapClick(latlng.lat(), latlng.lng());
    });

    return () => {
      map.destroy();
      mapInstance.current = null;
    };
  }, [district, pinLat, pinLng]); // eslint-disable-line react-hooks/exhaustive-deps

  // Render existing pledge markers + draft pin
  useEffect(() => {
    if (!mapInstance.current) return;
    const map = mapInstance.current;

    // Clear old markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    pledges.forEach((pledge) => {
      const marker = new naver.maps.Marker({
        map,
        position: new naver.maps.LatLng(pledge.latitude, pledge.longitude),
        icon: {
          url: ORANGE_PIN_SVG,
          size: new naver.maps.Size(28, 40),
          anchor: new naver.maps.Point(14, 40),
        },
      });
      markersRef.current.push(marker);
    });

    if (draftPin) {
      const marker = new naver.maps.Marker({
        map,
        position: new naver.maps.LatLng(draftPin.lat, draftPin.lng),
        icon: {
          url: DRAFT_PIN_SVG,
          size: new naver.maps.Size(28, 40),
          anchor: new naver.maps.Point(14, 40),
        },
      });
      markersRef.current.push(marker);
    }
  }, [pledges, draftPin]);

  return (
    <>
      <div ref={mapRef} className="w-full h-full" />
      {/* Custom zoom controls */}
      <div className="absolute top-3 right-3 flex flex-col gap-1 z-10">
        <button
          type="button"
          onClick={() => mapInstance.current?.setZoom((mapInstance.current.getZoom() ?? 12) + 1)}
          className="w-9 h-9 bg-white border border-border rounded-lg shadow-sm flex items-center justify-center text-foreground hover:bg-gray-50 transition-colors font-semibold text-base leading-none"
          aria-label="확대"
          title="확대"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => mapInstance.current?.setZoom((mapInstance.current.getZoom() ?? 12) - 1)}
          className="w-9 h-9 bg-white border border-border rounded-lg shadow-sm flex items-center justify-center text-foreground hover:bg-gray-50 transition-colors font-semibold text-base leading-none"
          aria-label="축소"
          title="축소"
        >
          −
        </button>
      </div>
      {/* Instruction overlay */}
      <div className="absolute bottom-4 left-4 right-4 pointer-events-none">
        <div className="bg-surface/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm border border-border inline-block">
          <p className="text-xs text-muted">
            지도를 클릭하여 공약 위치를 지정하세요
          </p>
        </div>
      </div>
    </>
  );
}
