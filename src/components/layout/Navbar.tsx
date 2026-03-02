"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRef, useState, useEffect } from "react";
import { CHUNGNAM_DISTRICTS } from "@/lib/districts";
import { useMapStore } from "@/store/useMapStore";

interface DistrictItem {
  name: string;
  code: string;
  centerLat: number;
  centerLng: number;
}

const CITY_ZOOM = 6; // storeLevel 6 → naverZoom 15 ≈ 500m scale

export default function Navbar() {
  const { data: session } = useSession();
  const { selectedDistrict, setCenter, setZoomLevel, setSelectedDistrict, reset } =
    useMapStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [districts, setDistricts] = useState<DistrictItem[]>([...CHUNGNAM_DISTRICTS]);

  // Fetch visible districts from API
  useEffect(() => {
    fetch("/api/districts")
      .then((res) => res.json())
      .then((json) => {
        const data = json.data ?? json;
        if (Array.isArray(data) && data.length > 0) {
          setDistricts(data);
        }
      })
      .catch(() => {
        // Fallback to hardcoded districts
      });
  }, []);

  const handleSelectDistrict = (district: DistrictItem) => {
    setCenter(district.centerLat, district.centerLng);
    setZoomLevel(CITY_ZOOM);
    setSelectedDistrict(district.name);
  };

  const handleReset = () => {
    reset();
  };

  return (
    <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur-sm border-b border-border">
      <div className="max-w-screen-xl mx-auto px-4 h-14 flex items-center gap-3">
        {/* Logo */}
        <Link href="/" onClick={handleReset} className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">개혁</span>
          </div>
          <span className="hidden sm:block font-semibold text-foreground">
            충남
          </span>
        </Link>

        {/* District Tabs */}
        <div className="flex-1 min-w-0 relative">
          <div
            ref={scrollRef}
            className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-1"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {/* All button */}
            <button
              onClick={handleReset}
              className={`shrink-0 px-3 py-1 text-xs font-medium rounded-full transition-colors
                ${
                  !selectedDistrict
                    ? "bg-primary text-white"
                    : "bg-background text-muted hover:text-foreground hover:bg-border/50"
                }`}
            >
              전체
            </button>

            {districts.map((district) => (
              <button
                key={district.code}
                onClick={() => handleSelectDistrict(district)}
                className={`shrink-0 px-3 py-1 text-xs font-medium rounded-full transition-colors
                  ${
                    selectedDistrict === district.name
                      ? "bg-primary text-white"
                      : "bg-background text-muted hover:text-foreground hover:bg-border/50"
                  }`}
              >
                {district.name}
              </button>
            ))}
          </div>

          {/* Fade edges */}
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-surface/95 to-transparent pointer-events-none" />
        </div>

        {/* Auth Button */}
        {session ? (
          <Link
            href={session.user?.role === "admin" ? "/admin" : "/dashboard"}
            className="shrink-0 px-3 py-1.5 text-xs font-medium bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
          >
            {session.user?.role === "admin" ? "관리자" : "대시보드"}
          </Link>
        ) : (
          <Link
            href="/login"
            className="shrink-0 px-3 py-1.5 text-xs font-medium text-foreground border border-border rounded-lg hover:bg-background transition-colors"
          >
            후보 로그인
          </Link>
        )}
      </div>
    </header>
  );
}
