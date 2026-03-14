"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import type { PledgeTile } from "./PledgeTicker";

interface CandidateInfo {
  id: string;
  name: string;
  district: string;
  profileImage: string | null;
}

interface CategoryInfo {
  id: string;
  name: string;
  emoji: string | null;
  color: string;
}

interface Props {
  tiles: PledgeTile[];
  totalCandidates: number;
  totalPledges: number;
  candidates: CandidateInfo[];
  categories: CategoryInfo[];
}

export default function PledgeListView({ tiles, totalCandidates, totalPledges, candidates, categories }: Props) {
  const [search, setSearch] = useState("");
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [selectedCities, setSelectedCities] = useState<Set<string>>(new Set());
  const [pledgeTypeFilter, setPledgeTypeFilter] = useState<"all" | "map" | "bylaws">("all");

  // Extract unique cities from candidate districts
  const cities = useMemo(() => {
    const set = new Set<string>();
    candidates.forEach((c) => {
      const match = c.district.match(/^[가-힣]+(?:시|군)/);
      if (match) set.add(match[0]);
    });
    return Array.from(set).sort();
  }, [candidates]);

  // Filter tiles
  const filtered = useMemo(() => {
    return tiles.filter((t) => {
      // Search
      if (search) {
        const q = search.toLowerCase();
        if (
          !t.title.toLowerCase().includes(q) &&
          !t.description.toLowerCase().includes(q) &&
          !t.candidateName.toLowerCase().includes(q)
        ) return false;
      }
      // Candidate
      if (selectedCandidateId && t.candidateId !== selectedCandidateId) return false;
      // Category
      if (selectedCategories.size > 0) {
        if (!t.category || !selectedCategories.has(t.category.name)) return false;
      }
      // City
      if (selectedCities.size > 0) {
        const match = t.candidateDistrict.match(/^[가-힣]+(?:시|군)/);
        const city = match ? match[0] : "";
        if (!selectedCities.has(city)) return false;
      }
      // Type
      if (pledgeTypeFilter !== "all" && t.pledgeType !== pledgeTypeFilter) return false;
      return true;
    });
  }, [tiles, search, selectedCandidateId, selectedCategories, selectedCities, pledgeTypeFilter]);

  const toggleCategory = (name: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };
  const toggleCity = (city: string) => {
    setSelectedCities((prev) => {
      const next = new Set(prev);
      if (next.has(city)) next.delete(city); else next.add(city);
      return next;
    });
  };

  const clearAllFilters = () => {
    setSearch("");
    setSelectedCandidateId(null);
    setSelectedCategories(new Set());
    setSelectedCities(new Set());
    setPledgeTypeFilter("all");
  };

  const hasFilters = search || selectedCandidateId || selectedCategories.size > 0 || selectedCities.size > 0 || pledgeTypeFilter !== "all";

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-screen-xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-1">공약 목록</h1>
          <p className="text-sm text-muted">
            공천 확정 후보자 <span className="font-semibold text-foreground">{totalCandidates}명</span>의 공약{" "}
            <span className="font-semibold text-foreground">{totalPledges}건</span>
            {hasFilters && (
              <span className="ml-2 text-primary font-medium">
                → 필터 결과 {filtered.length}건
              </span>
            )}
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 space-y-3 p-4 bg-surface rounded-xl border border-border">
          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-muted w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="공약 제목, 내용, 후보자 이름 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="공약 검색"
              className="w-full pl-9 pr-8 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                aria-label="검색어 지우기"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>

          {/* Type filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-muted shrink-0">유형:</span>
            {(["all", "map", "bylaws"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setPledgeTypeFilter(type)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
                  pledgeTypeFilter === type
                    ? "bg-primary text-white border-primary"
                    : "bg-background text-muted border-border hover:border-primary/30 hover:text-foreground"
                }`}
              >
                {type === "all" ? "전체" : type === "map" ? "지역 공약" : "조례"}
              </button>
            ))}
          </div>

          {/* City filter */}
          {cities.length > 0 && (
            <div className="flex items-start gap-2 flex-wrap">
              <span className="text-xs font-semibold text-muted shrink-0 mt-1">지역:</span>
              <div className="flex flex-wrap gap-1.5">
                {cities.map((city) => (
                  <button
                    key={city}
                    onClick={() => toggleCity(city)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
                      selectedCities.has(city)
                        ? "bg-primary text-white border-primary"
                        : "bg-background text-muted border-border hover:border-primary/30 hover:text-foreground"
                    }`}
                  >
                    {city}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Category filter */}
          {categories.length > 0 && (
            <div className="flex items-start gap-2 flex-wrap">
              <span className="text-xs font-semibold text-muted shrink-0 mt-1">분류:</span>
              <div className="flex flex-wrap gap-1.5">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => toggleCategory(cat.name)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
                      selectedCategories.has(cat.name)
                        ? "text-white border-transparent"
                        : "bg-background border-border hover:border-primary/30"
                    }`}
                    style={
                      selectedCategories.has(cat.name)
                        ? { backgroundColor: cat.color, borderColor: cat.color }
                        : { color: cat.color }
                    }
                  >
                    {cat.emoji && <span>{cat.emoji}</span>}
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Candidate filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-muted shrink-0">후보자:</span>
            <select
              value={selectedCandidateId ?? ""}
              onChange={(e) => setSelectedCandidateId(e.target.value || null)}
              className="px-2 py-1 text-xs border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 max-w-[200px]"
            >
              <option value="">전체 후보자</option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.district})</option>
              ))}
            </select>
            {hasFilters && (
              <button
                onClick={clearAllFilters}
                className="ml-auto px-2.5 py-1 text-xs text-muted hover:text-red-500 hover:bg-red-50 rounded-lg border border-border transition-colors"
              >
                필터 초기화
              </button>
            )}
          </div>
        </div>

        {/* Pledge Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted text-sm">조건에 맞는 공약이 없습니다.</p>
            <button onClick={clearAllFilters} className="mt-3 text-xs text-primary hover:underline">
              필터 초기화
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((tile) => (
              <PledgeCard key={tile.id} tile={tile} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PledgeCard({ tile }: { tile: PledgeTile }) {
  const isShared = tile.collaborators.length > 0;

  return (
    <Link
      href={`/?pledge=${tile.id}`}
      className="block p-4 bg-surface border border-border rounded-xl hover:border-primary/30 hover:shadow-md transition-all group"
    >
      {/* Candidate header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 overflow-hidden flex items-center justify-center shrink-0">
          {tile.candidateProfileImage ? (
            <Image src={tile.candidateProfileImage} alt={tile.candidateName} width={32} height={32} className="object-cover w-full h-full" />
          ) : (
            <span className="text-primary font-bold text-xs">{tile.candidateName.charAt(0)}</span>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-foreground truncate">
            {tile.candidateName}{isShared ? ` 외 ${tile.collaborators.length}명` : ""}
          </p>
          <p className="text-[10px] text-muted truncate">{tile.candidateDistrict}</p>
        </div>
        {isShared && (
          <span className="ml-auto shrink-0 text-[10px] px-1.5 py-0.5 rounded-full border border-primary/30 text-primary bg-primary/5 font-medium">
            공동
          </span>
        )}
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1 mb-2">
        {tile.category && (
          <span
            className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: tile.category.color + "20", color: tile.category.color }}
          >
            {tile.category.emoji && <span>{tile.category.emoji}</span>}
            {tile.category.name}
          </span>
        )}
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${
          tile.pledgeType === "bylaws"
            ? "border-blue-200 text-blue-600 bg-blue-50"
            : "border-green-200 text-green-600 bg-green-50"
        }`}>
          {tile.pledgeType === "bylaws" ? "조례" : "지역"}
        </span>
      </div>

      {/* Title */}
      <h3 className="font-semibold text-foreground text-sm leading-snug line-clamp-2 mb-1.5 group-hover:text-primary transition-colors break-keep">
        {tile.title}
      </h3>

      {/* Description */}
      <p className="text-xs text-muted line-clamp-2 leading-relaxed">
        {tile.description}
      </p>

      {/* Address + budget */}
      {(tile.address || tile.budget) && (
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {tile.budget && <span className="text-[10px] text-primary font-medium">{tile.budget}</span>}
          {tile.address && <span className="text-[10px] text-muted truncate">📍 {tile.address}</span>}
        </div>
      )}
    </Link>
  );
}
