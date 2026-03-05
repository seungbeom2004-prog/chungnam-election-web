"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useRef, useState, useEffect } from "react";
import { useMapStore } from "@/store/useMapStore";

interface DistrictItem {
  name: string;
  centerLat: number;
  centerLng: number;
}

const CITY_ZOOM = 6; // storeLevel 6 → naverZoom ≈ city scale


export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const { selectedDistrict, setCenter, setZoomLevel, setSelectedDistrict, reset } =
    useMapStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [districts, setDistricts] = useState<DistrictItem[]>([]);

  // Fetch districts from DB — respects admin-configured order and center coordinates
  useEffect(() => {
    fetch("/api/districts")
      .then((r) => r.json())
      .then((json) => {
        const dbData: { name: string; centerLat: number; centerLng: number }[] = json.data ?? [];
        if (dbData.length === 0) return;
        setDistricts(
          dbData.map((d) => ({ name: d.name, centerLat: d.centerLat, centerLng: d.centerLng }))
        );
      })
      .catch(() => {
        // Keep static fallback on error
      });
  }, []);

  const handleSelectDistrict = (district: DistrictItem) => {
    setCenter(district.centerLat, district.centerLng);
    setZoomLevel(CITY_ZOOM);
    setSelectedDistrict(district.name);
  };

  const isMapPage = pathname === "/";

  return (
    <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur-sm border-b border-border">
      <div className="max-w-screen-xl mx-auto px-4 h-14 flex items-center gap-3">
        {/* Logo */}
        <Link href="/" onClick={reset} className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">개혁</span>
          </div>
          <span className="hidden sm:block font-semibold text-foreground">충남</span>
        </Link>

        {/* District tabs — only on map page */}
        {isMapPage ? (
          <div className="flex-1 min-w-0 relative">
            <div
              ref={scrollRef}
              className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-1"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {districts.map((district) => (
                <button
                  key={district.name}
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
            {/* Fade right edge */}
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-surface/95 to-transparent pointer-events-none" />
          </div>
        ) : (
          /* Navigation links on non-map pages */
          <nav className="flex-1 flex items-center gap-3 min-w-0">
            <Link
              href="/"
              className={`shrink-0 text-xs font-medium transition-colors ${
                pathname === "/"
                  ? "text-primary"
                  : "text-muted hover:text-foreground"
              }`}
            >
              공약 지도
            </Link>
            <Link
              href="/candidates"
              className={`shrink-0 text-xs font-medium transition-colors ${
                pathname.startsWith("/candidates")
                  ? "text-primary"
                  : "text-muted hover:text-foreground"
              }`}
            >
              후보자 목록
            </Link>
          </nav>
        )}

        {/* Candidates list shortcut (on map page) */}
        {isMapPage && (
          <Link
            href="/candidates"
            className="shrink-0 hidden sm:flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-muted border border-border rounded-lg hover:text-primary hover:border-primary transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
            후보자
          </Link>
        )}

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
            로그인
          </Link>
        )}
      </div>
    </header>
  );
}
