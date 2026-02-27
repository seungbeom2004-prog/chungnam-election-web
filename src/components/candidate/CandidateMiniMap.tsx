"use client";

import { useEffect, useRef } from "react";
import { CHUNGNAM_DISTRICTS } from "@/lib/districts";

interface CandidateMiniMapProps {
  pledges: {
    id: string;
    title: string;
    latitude: number;
    longitude: number;
  }[];
  district: string;
}

const ORANGE_PIN_SVG =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40"><path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.268 21.732 0 14 0z" fill="%23FF5A00"/><circle cx="14" cy="14" r="6" fill="white"/></svg>'
  );

export default function CandidateMiniMap({
  pledges,
  district,
}: CandidateMiniMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapRef.current || typeof naver === "undefined") return;

    const districtData = CHUNGNAM_DISTRICTS.find((d) => d.name === district);
    const center = districtData
      ? { lat: districtData.centerLat, lng: districtData.centerLng }
      : { lat: 36.5184, lng: 126.8 };

    const map = new naver.maps.Map(mapRef.current, {
      center: new naver.maps.LatLng(center.lat, center.lng),
      zoom: 13,
    });

    pledges.forEach((pledge) => {
      new naver.maps.Marker({
        map,
        position: new naver.maps.LatLng(pledge.latitude, pledge.longitude),
        icon: {
          url: ORANGE_PIN_SVG,
          size: new naver.maps.Size(28, 40),
          anchor: new naver.maps.Point(14, 40),
        },
      });
    });

    return () => {
      map.destroy();
    };
  }, [pledges, district]);

  return <div ref={mapRef} className="w-full h-full" />;
}
