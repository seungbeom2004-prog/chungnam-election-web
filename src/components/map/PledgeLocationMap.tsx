"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  lat: number;
  lng: number;
  title?: string;
}

const MARKER_HTML =
  `<div style="width:22px;height:22px;background:#FF5A00;border-radius:50%;` +
  `border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35);"></div>`;

export default function PledgeLocationMap({ lat, lng, title }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  // Poll until Naver SDK is available (SDK is loaded globally via root layout)
  useEffect(() => {
    if (typeof naver !== "undefined" && naver.maps?.Map) {
      setReady(true);
      return;
    }
    const id = setInterval(() => {
      if (typeof naver !== "undefined" && naver.maps?.Map) {
        setReady(true);
        clearInterval(id);
      }
    }, 100);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = new naver.maps.Map(mapRef.current, {
      center: new naver.maps.LatLng(lat, lng),
      zoom: 16,
      zoomControl: false,
    });
    new naver.maps.Marker({
      map,
      position: new naver.maps.LatLng(lat, lng),
      icon: {
        content: MARKER_HTML,
        anchor: new naver.maps.Point(11, 11),
      },
      title: title ?? "",
    });
    // Trigger resize once after render to fill container dimensions
    const t = setTimeout(() => naver.maps.Event.trigger(map, "resize"), 100);
    return () => {
      clearTimeout(t);
      map.destroy();
    };
  }, [ready, lat, lng, title]);

  if (!ready) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-background">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <div ref={mapRef} className="w-full h-full" />;
}
