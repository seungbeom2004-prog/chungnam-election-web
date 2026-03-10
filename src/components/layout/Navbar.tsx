"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useRef, useState, useEffect } from "react";
import { useMapStore } from "@/store/useMapStore";
import { useUITexts } from "@/hooks/useUITexts";
import { useTheme } from "@/contexts/ThemeContext";

interface DistrictItem {
  name: string;
  centerLat: number;
  centerLng: number;
}

const CITY_ZOOM = 6; // storeLevel 6 → naverZoom ≈ city scale


export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const { selectedDistrict, setCenter, setZoomLevel, setSelectedDistrict, reset } =
    useMapStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [districts, setDistricts] = useState<DistrictItem[]>([]);
  const [cuteLogoError, setCuteLogoError] = useState(false);
  const t = useUITexts();
  const { isCute, setTheme } = useTheme();

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

  const isMapPage = pathname === "/" || pathname === "/regular" || pathname === "/cute";

  const handleThemeToggle = () => {
    const next = isCute ? "regular" : "cute";
    if (next === "cute") setCuteLogoError(false);
    setTheme(next);          // apply immediately — don't wait for the route page's useEffect
    router.push(`/${next}`);
  };

  return (
    <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur-sm border-b border-border">
      <div className="max-w-screen-xl mx-auto px-4 h-14 flex items-center gap-3">
        {/* Logo */}
        <Link href="/" onClick={reset} className="flex items-center gap-2 shrink-0">
          {isCute ? (
            <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center bg-pink-100">
              {cuteLogoError ? (
                <span className="text-pink-500 font-bold text-sm">개혁</span>
              ) : (
                <Image
                  src="/themes/cute/images/logo-cute.png"
                  width={32}
                  height={32}
                  alt="개혁"
                  onError={() => setCuteLogoError(true)}
                />
              )}
            </div>
          ) : (
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">개혁</span>
            </div>
          )}
          <span className="hidden sm:block font-semibold text-foreground">{t.logoSubText}</span>
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
              {t.navMapLink}
            </Link>
          </nav>
        )}

        {/* Theme toggle — desktop only */}
        <button
          onClick={handleThemeToggle}
          className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border transition-colors shrink-0 ${
            isCute
              ? "border-pink-300 bg-pink-50 text-pink-600 hover:bg-pink-100"
              : "border-border bg-background text-muted hover:text-foreground hover:bg-border/50"
          }`}
        >
          {isCute ? "🏛️ 일반 모드" : "✨ 귀여운 모드"}
        </button>

        {/* Auth Button */}
        {session ? (
          <Link
            href={session.user?.role === "admin" ? "/admin" : "/dashboard"}
            className="shrink-0 px-3 py-1.5 text-xs font-medium bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
          >
            {session.user?.role === "admin" ? t.navAdminButton : t.navDashboardButton}
          </Link>
        ) : (
          <Link
            href="/login"
            className="shrink-0 px-3 py-1.5 text-xs font-medium text-foreground border border-border rounded-lg hover:bg-background transition-colors"
          >
            {t.navLoginButton}
          </Link>
        )}
      </div>
    </header>
  );
}
