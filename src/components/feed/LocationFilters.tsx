"use client";

import { useMemo } from "react";

export type DongType = "adm" | "legal";

export interface LocationFacets {
  cities: string[];
  admDongsByCity: Record<string, string[]>;
  legalDongsByCity: Record<string, string[]>;
}

interface Props {
  facets: LocationFacets;
  selectedCities: string[];
  selectedDongs: string[];
  dongType: DongType;
  onCitiesChange: (cities: string[]) => void;
  onDongsChange: (dongs: string[]) => void;
  onDongTypeChange: (t: DongType) => void;
  className?: string;
}

/**
 * 재사용 가능한 위치 필터 패널.
 *  - 시군구 chip 다중 선택
 *  - 행정동 / 법정동 토글
 *  - 시군구 선택된 후에만 그 시군구에 속한 동만 chip으로 표시 (다중 선택)
 *  - AI 피드 (FeedPlainText) + 후보자 공약관리 ProposalsTab 모두 사용
 */
export default function LocationFilters({
  facets,
  selectedCities,
  selectedDongs,
  dongType,
  onCitiesChange,
  onDongsChange,
  onDongTypeChange,
  className = "",
}: Props) {
  const dongOptions = useMemo(() => {
    if (selectedCities.length === 0) return [] as string[];
    const map = dongType === "adm" ? facets.admDongsByCity : facets.legalDongsByCity;
    const out = new Set<string>();
    for (const c of selectedCities) {
      for (const d of map[c] ?? []) out.add(d);
    }
    return Array.from(out).sort((a, b) => a.localeCompare(b, "ko"));
  }, [selectedCities, dongType, facets.admDongsByCity, facets.legalDongsByCity]);

  const toggleCity = (c: string) => {
    onCitiesChange(selectedCities.includes(c) ? selectedCities.filter((x) => x !== c) : [...selectedCities, c]);
  };
  const toggleDong = (d: string) => {
    onDongsChange(selectedDongs.includes(d) ? selectedDongs.filter((x) => x !== d) : [...selectedDongs, d]);
  };

  return (
    <div className={`bg-surface border border-border rounded-xl p-4 space-y-3 ${className}`}>
      {/* 시군구 (다중선택) */}
      {facets.cities.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-muted mb-1.5">📍 시군구 ({selectedCities.length}/{facets.cities.length})</p>
          <div className="flex flex-wrap gap-1">
            {facets.cities.map((c) => {
              const sel = selectedCities.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleCity(c)}
                  className={`px-2 py-0.5 text-[11px] rounded-full border transition-colors ${
                    sel ? "bg-primary text-white border-primary" : "bg-background text-muted border-border hover:border-primary/40"
                  }`}
                >
                  {sel ? "✓ " : ""}{c}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 동 토글 + 다중선택 chip — 시군구 선택 후에만 표시 */}
      <div>
        <div className="flex items-center gap-2 flex-wrap mb-1.5">
          <p className="text-[11px] font-semibold text-muted">읍·면·동 ({selectedDongs.length}/{dongOptions.length})</p>
          <div className="flex gap-0.5 bg-background border border-border rounded p-0.5">
            <button
              type="button"
              onClick={() => onDongTypeChange("adm")}
              className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
                dongType === "adm" ? "bg-primary text-white" : "text-muted hover:text-foreground"
              }`}
              title="행정동 — 주민센터 단위 (예: 봉명1동, 봉명2동)"
            >
              🏛️ 행정동
            </button>
            <button
              type="button"
              onClick={() => onDongTypeChange("legal")}
              className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
                dongType === "legal" ? "bg-primary text-white" : "text-muted hover:text-foreground"
              }`}
              title="법정동 — 법적 주소 단위 (예: 봉명동)"
            >
              📜 법정동
            </button>
          </div>
          {selectedDongs.length > 0 && (
            <button type="button" onClick={() => onDongsChange([])} className="text-[10px] text-muted hover:text-foreground underline">
              선택 해제
            </button>
          )}
        </div>
        {selectedCities.length === 0 ? (
          <p className="text-[11px] text-muted bg-background/60 border border-dashed border-border rounded-lg px-3 py-2">
            👆 위에서 시군구를 먼저 선택하면 해당 지역의 {dongType === "adm" ? "행정동" : "법정동"}만 표시됩니다.
          </p>
        ) : dongOptions.length === 0 ? (
          <p className="text-[10px] text-muted">선택한 시군구에 등록된 {dongType === "adm" ? "행정동" : "법정동"} 데이터가 없습니다.</p>
        ) : (
          <div className="flex flex-wrap gap-1 max-h-40 overflow-y-auto pr-1">
            {dongOptions.map((d) => {
              const sel = selectedDongs.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDong(d)}
                  className={`px-2 py-0.5 text-[11px] rounded-full border transition-colors ${
                    sel ? "bg-emerald-600 text-white border-emerald-600" : "bg-background text-muted border-border hover:border-emerald-400"
                  }`}
                >
                  {sel ? "✓ " : ""}{d}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 게시글 list로부터 facets를 빌드하는 helper.
 * 시군구청 기본 좌표만 찍힌 글의 동은 facet에서 제외 (LocationFilters를 위한 후보 list 형성 시).
 */
export function buildFacetsFromPosts(
  posts: Array<{
    city?: string | null;
    admDong?: string | null;
    legalDong?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  }>,
  isCityCenterOnly: (city: string | null | undefined, lat: number | null | undefined, lng: number | null | undefined) => boolean,
): LocationFacets {
  const cities = new Set<string>();
  const admByCity: Record<string, Set<string>> = {};
  const legByCity: Record<string, Set<string>> = {};
  for (const p of posts) {
    if (p.city) cities.add(p.city);
    const cityCenter = isCityCenterOnly(p.city ?? null, p.latitude ?? null, p.longitude ?? null);
    if (cityCenter) continue;
    if (p.city && p.admDong) {
      if (!admByCity[p.city]) admByCity[p.city] = new Set();
      admByCity[p.city].add(p.admDong);
    }
    if (p.city && p.legalDong) {
      if (!legByCity[p.city]) legByCity[p.city] = new Set();
      legByCity[p.city].add(p.legalDong);
    }
  }
  return {
    cities: Array.from(cities).sort((a, b) => a.localeCompare(b, "ko")),
    admDongsByCity: Object.fromEntries(Object.entries(admByCity).map(([k, s]) => [k, Array.from(s).sort((a, b) => a.localeCompare(b, "ko"))])),
    legalDongsByCity: Object.fromEntries(Object.entries(legByCity).map(([k, s]) => [k, Array.from(s).sort((a, b) => a.localeCompare(b, "ko"))])),
  };
}

/** Filter posts by selectedCities/Dongs. */
export function applyLocationFilter<T extends { city?: string | null; admDong?: string | null; legalDong?: string | null }>(
  posts: T[],
  selectedCities: string[],
  selectedDongs: string[],
  dongType: DongType,
): T[] {
  if (selectedCities.length === 0 && selectedDongs.length === 0) return posts;
  const citiesSet = new Set(selectedCities);
  const dongsSet = new Set(selectedDongs);
  return posts.filter((p) => {
    if (citiesSet.size > 0 && (!p.city || !citiesSet.has(p.city))) return false;
    if (dongsSet.size > 0) {
      const v = dongType === "adm" ? p.admDong : p.legalDong;
      if (!v || !dongsSet.has(v)) return false;
    }
    return true;
  });
}
