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
  pinLat?: number | null;
  pinLng?: number | null;
  profileImage?: string | null;
  candidateName?: string;
}

const PLEDGE_PIN_SVG =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40"><path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.268 21.732 0 14 0z" fill="%23FF5A00"/><circle cx="14" cy="14" r="6" fill="white"/></svg>'
  );

function buildCandidateMarkerHtml(profileImage: string | null, name: string): string {
  const initial = name ? name.charAt(0) : "?";
  const escapedName = name.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const photoHtml = profileImage
    ? `<div style="width:56px;height:56px;border-radius:50%;border:3px solid #FF5A00;overflow:hidden;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,0.25);">
         <div style="width:100%;height:100%;background-image:url('${profileImage}');background-size:cover;background-position:center;"></div>
       </div>`
    : `<div style="width:56px;height:56px;border-radius:50%;border:3px solid #FF5A00;background:#FF5A00;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.25);">
         <span style="color:#fff;font-size:22px;font-weight:700;">${initial}</span>
       </div>`;

  return `<div style="display:flex;flex-direction:column;align-items:center;width:80px;">
    ${photoHtml}
    <div style="margin-top:4px;background:#FF5A00;color:#fff;font-size:11px;font-weight:700;padding:2px 7px;border-radius:8px;white-space:nowrap;max-width:80px;overflow:hidden;text-overflow:ellipsis;box-shadow:0 1px 4px rgba(0,0,0,0.2);">
      ${escapedName}
    </div>
  </div>`;
}

export default function CandidateMiniMap({
  pledges,
  district,
  pinLat,
  pinLng,
  profileImage,
  candidateName = "",
}: CandidateMiniMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapRef.current || typeof naver === "undefined") return;

    // Determine center: use admin pin if available, else district center
    const districtData = CHUNGNAM_DISTRICTS.find((d) => d.name === district);
    const fallback = districtData
      ? { lat: districtData.centerLat, lng: districtData.centerLng }
      : { lat: 36.5184, lng: 126.8 };

    const center =
      pinLat != null && pinLng != null
        ? { lat: pinLat, lng: pinLng }
        : fallback;

    const map = new naver.maps.Map(mapRef.current, {
      center: new naver.maps.LatLng(center.lat, center.lng),
      zoom: 13,
    });

    // Candidate pin marker (centered)
    if (pinLat != null && pinLng != null) {
      new naver.maps.Marker({
        map,
        position: new naver.maps.LatLng(pinLat, pinLng),
        icon: {
          content: buildCandidateMarkerHtml(profileImage ?? null, candidateName),
          anchor: new naver.maps.Point(40, 68),
        },
        zIndex: 10,
      });
    }

    // Pledge markers
    pledges.forEach((pledge) => {
      new naver.maps.Marker({
        map,
        position: new naver.maps.LatLng(pledge.latitude, pledge.longitude),
        icon: {
          url: PLEDGE_PIN_SVG,
          size: new naver.maps.Size(28, 40),
          anchor: new naver.maps.Point(14, 40),
        },
      });
    });

    return () => {
      map.destroy();
    };
  }, [pledges, district, pinLat, pinLng, profileImage, candidateName]);

  return <div ref={mapRef} className="w-full h-full" />;
}
