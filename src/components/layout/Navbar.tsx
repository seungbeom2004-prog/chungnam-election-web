"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { CHUNGNAM_DISTRICTS } from "@/lib/districts";
import { useMapStore } from "@/store/useMapStore";

export default function Navbar() {
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { setCenter, setZoomLevel } = useMapStore();

  const filteredDistricts = searchQuery
    ? CHUNGNAM_DISTRICTS.filter((d) => d.name.includes(searchQuery))
    : [];

  const handleSelectDistrict = (district: (typeof CHUNGNAM_DISTRICTS)[number]) => {
    setCenter(district.centerLat, district.centerLng);
    setZoomLevel(12);
    setSearchQuery(district.name);
    setShowSuggestions(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur-sm border-b border-border">
      <div className="max-w-screen-xl mx-auto px-4 h-14 flex items-center gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">개혁</span>
          </div>
          <span className="hidden sm:block font-semibold text-foreground">
            충남도당
          </span>
        </Link>

        {/* Search */}
        <div className="flex-1 max-w-md relative">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
            >
              <path
                d="M14 14L10.5 10.5M12 7a5 5 0 11-10 0 5 5 0 0110 0z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <input
              type="text"
              placeholder="시/군 검색 (예: 천안시)"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-border bg-background
                         placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            />
          </div>

          {/* Autocomplete */}
          {showSuggestions && filteredDistricts.length > 0 && (
            <div className="absolute top-full mt-1 w-full bg-surface rounded-lg border border-border shadow-lg overflow-hidden">
              {filteredDistricts.map((district) => (
                <button
                  key={district.code}
                  onMouseDown={() => handleSelectDistrict(district)}
                  className="w-full px-3 py-2 text-sm text-left hover:bg-primary-light transition-colors"
                >
                  {district.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Auth Button */}
        {session ? (
          <Link
            href="/dashboard"
            className="shrink-0 px-3 py-1.5 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
          >
            대시보드
          </Link>
        ) : (
          <Link
            href="/login"
            className="shrink-0 px-3 py-1.5 text-sm font-medium text-foreground border border-border rounded-lg hover:bg-background transition-colors"
          >
            후보 로그인
          </Link>
        )}
      </div>
    </header>
  );
}
