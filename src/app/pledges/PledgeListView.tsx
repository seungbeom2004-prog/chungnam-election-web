"use client";

import { useState, useMemo, type MouseEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import type { PledgeTile } from "./PledgeTicker";

/** Round avatar bubble — author always renders with highest z-index. */
function AvatarBubble({
  image,
  name,
  size = 28,
  zIndex = 0,
}: {
  image: string | null;
  name: string;
  size?: number;
  zIndex?: number;
}) {
  return (
    <div
      className="rounded-full bg-primary/10 border-2 border-surface overflow-hidden flex items-center justify-center shrink-0 relative"
      style={{ width: size, height: size, zIndex }}
    >
      {image ? (
        <Image src={image} alt={name} width={size} height={size} className="w-full h-full object-cover" />
      ) : (
        <span className="text-primary font-bold" style={{ fontSize: size * 0.36 }}>
          {name.charAt(0)}
        </span>
      )}
    </div>
  );
}

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
  const [sortBy, setSortBy] = useState<"latest" | "popular">("popular");

  // Extract unique cities from candidate districts
  const cities = useMemo(() => {
    const set = new Set<string>();
    candidates.forEach((c) => {
      const match = c.district.match(/^[가-힣]+(?:시|군)/);
      if (match) set.add(match[0]);
    });
    return Array.from(set).sort();
  }, [candidates]);

  // Only show cities/categories that actually have pledges under the current active filters
  // (each ignores its own filter to avoid hiding already-selected options)
  const citiesWithPledges = useMemo(() => {
    // Compute available cities from currently filtered results
    // (ignore city filter itself to avoid hiding already-selected cities)
    const base = tiles.filter((t) => {
      if (search) {
        const q = search.toLowerCase();
        if (!t.title.toLowerCase().includes(q) && !t.description.toLowerCase().includes(q) && !t.candidateName.toLowerCase().includes(q)) return false;
      }
      if (selectedCandidateId && t.candidateId !== selectedCandidateId) return false;
      if (selectedCategories.size > 0) {
        if (!t.category || !selectedCategories.has(t.category.name)) return false;
      }
      if (pledgeTypeFilter !== "all") {
        const isBylawType = t.pledgeType === pledgeTypeFilter;
        const isBylawTagged = pledgeTypeFilter === "bylaws" && (t as PledgeTile & { bylawTagged?: boolean }).bylawTagged === true;
        if (!isBylawType && !isBylawTagged) return false;
      }
      return true;
    });
    const set = new Set<string>();
    base.forEach((t) => {
      const match = t.candidateDistrict.match(/^[가-힣]+(?:시|군)/);
      if (match) set.add(match[0]);
    });
    return set;
  }, [tiles, search, selectedCandidateId, selectedCategories, pledgeTypeFilter]);

  const categoriesWithPledges = useMemo(() => {
    // Compute available categories ignoring category filter itself
    const base = tiles.filter((t) => {
      if (search) {
        const q = search.toLowerCase();
        if (!t.title.toLowerCase().includes(q) && !t.description.toLowerCase().includes(q) && !t.candidateName.toLowerCase().includes(q)) return false;
      }
      if (selectedCandidateId && t.candidateId !== selectedCandidateId) return false;
      if (selectedCities.size > 0) {
        const match = t.candidateDistrict.match(/^[가-힣]+(?:시|군)/);
        const city = match ? match[0] : "";
        if (!selectedCities.has(city)) return false;
      }
      if (pledgeTypeFilter !== "all") {
        const isBylawType = t.pledgeType === pledgeTypeFilter;
        const isBylawTagged = pledgeTypeFilter === "bylaws" && (t as PledgeTile & { bylawTagged?: boolean }).bylawTagged === true;
        if (!isBylawType && !isBylawTagged) return false;
      }
      return true;
    });
    const set = new Set<string>();
    base.forEach((t) => { if (t.category) set.add(t.category.name); });
    return set;
  }, [tiles, search, selectedCandidateId, selectedCities, pledgeTypeFilter]);

  const typeCounts = useMemo(() => {
    const bylawCount = tiles.filter(t => t.pledgeType === "bylaws" || (t as PledgeTile & { bylawTagged?: boolean }).bylawTagged).length;
    const mapCount = tiles.filter(t => t.pledgeType === "map" && !(t as PledgeTile & { bylawTagged?: boolean }).bylawTagged).length;
    return { all: tiles.length, map: mapCount, bylaws: bylawCount };
  }, [tiles]);

  // Filter + sort tiles
  const filtered = useMemo(() => {
    const result = tiles.filter((t) => {
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
      // Type: "bylaws" filter also includes bylawTagged map pledges
      if (pledgeTypeFilter !== "all") {
        const isBylawType = t.pledgeType === pledgeTypeFilter;
        const isBylawTagged = pledgeTypeFilter === "bylaws" && (t as PledgeTile & { bylawTagged?: boolean }).bylawTagged === true;
        if (!isBylawType && !isBylawTagged) return false;
      }
      return true;
    });
    // Sort
    if (sortBy === "popular") {
      result.sort((a, b) => (b.likeCount ?? 0) - (a.likeCount ?? 0));
    }
    return result;
  }, [tiles, search, selectedCandidateId, selectedCategories, selectedCities, pledgeTypeFilter, sortBy]);

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
    setSortBy("latest");
  };

  const hasFilters = search || selectedCandidateId || selectedCategories.size > 0 || selectedCities.size > 0 || pledgeTypeFilter !== "all" || sortBy !== "popular";

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-screen-xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-1">공약 목록</h1>
          <p className="text-sm text-muted">
            공천 확정 후보자 <span className="font-semibold text-foreground">{totalCandidates}명</span>의 공약{" "}
            <span className="font-semibold text-foreground">{totalPledges}건</span>
            <span
              className={`ml-2 font-medium transition-opacity ${hasFilters ? "text-primary opacity-100" : "opacity-0 select-none"}`}
              aria-live="polite"
              aria-atomic="true"
            >
              {hasFilters ? `→ 필터 결과 ${filtered.length}건` : ""}
            </span>
          </p>
        </div>

        {/* Filters */}
        <div role="search" aria-label="공약 필터" className="mb-6 space-y-3 p-4 bg-surface rounded-xl border border-border">
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
            <span id="filter-label-type" className="text-xs font-semibold text-muted shrink-0">유형:</span>
            <div role="group" aria-labelledby="filter-label-type" className="flex gap-1.5 flex-wrap">
              {(["all", "map", "bylaws"] as const).filter((type) => {
                if (type === "map" && typeCounts.map === 0) return false;
                if (type === "bylaws" && typeCounts.bylaws === 0) return false;
                return true;
              }).map((type) => (
                <button
                  key={type}
                  onClick={() => setPledgeTypeFilter(type)}
                  aria-pressed={pledgeTypeFilter === type}
                  className={`px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors border focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 ${
                    pledgeTypeFilter === type
                      ? "bg-primary text-white border-primary"
                      : "bg-background text-muted border-border hover:border-primary/30 hover:text-foreground"
                  }`}
                >
                  {type === "all" ? `전체 (${typeCounts.all})` : type === "map" ? `지역 공약 (${typeCounts.map})` : `조례 (${typeCounts.bylaws})`}
                </button>
              ))}
            </div>
          </div>

          {/* City filter */}
          {cities.length > 0 && (
            <div className="flex items-start gap-2 flex-wrap">
              <span id="filter-label-city" className="text-xs font-semibold text-muted shrink-0 mt-1">지역:</span>
              <div role="group" aria-labelledby="filter-label-city" className="flex flex-wrap gap-1.5">
                {cities.filter((city) => citiesWithPledges.has(city)).map((city) => (
                  <button
                    key={city}
                    onClick={() => toggleCity(city)}
                    aria-pressed={selectedCities.has(city)}
                    className={`px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors border focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 ${
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
              <span id="filter-label-category" className="text-xs font-semibold text-muted shrink-0 mt-1">분류:</span>
              <div role="group" aria-labelledby="filter-label-category" className="flex flex-wrap gap-1.5">
                {categories.filter((cat) => categoriesWithPledges.has(cat.name)).map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => toggleCategory(cat.name)}
                    aria-pressed={selectedCategories.has(cat.name)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors border focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 ${
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

          {/* Candidate filter + sort */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-muted shrink-0">후보자:</span>
            <select
              aria-label="후보자로 필터링"
              value={selectedCandidateId ?? ""}
              onChange={(e) => setSelectedCandidateId(e.target.value || null)}
              className="px-2 py-1 text-xs border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 max-w-[200px]"
            >
              <option value="">전체 후보자</option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.district})</option>
              ))}
            </select>
            {/* Sort */}
            <div className="flex items-center gap-1 ml-auto">
              <span className="text-xs font-semibold text-muted shrink-0">정렬:</span>
              <div className="flex items-center gap-1 bg-background border border-border rounded-full p-0.5">
                <button
                  onClick={() => setSortBy("latest")}
                  className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                    sortBy === "latest" ? "bg-primary text-white" : "text-muted hover:text-foreground"
                  }`}
                >
                  🕐 최신
                </button>
                <button
                  onClick={() => setSortBy("popular")}
                  className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                    sortBy === "popular" ? "bg-primary text-white" : "text-muted hover:text-foreground"
                  }`}
                >
                  🔥 인기
                </button>
              </div>
            </div>
            {hasFilters && (
              <button
                onClick={clearAllFilters}
                className="px-2.5 py-1 text-xs text-muted hover:text-red-500 hover:bg-red-50 rounded-lg border border-border transition-colors"
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
  const [collapsed, setCollapsed] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(tile.likeCount ?? 0);
  const [liking, setLiking] = useState(false);

  const isShared = tile.collaborators.length > 0;
  const totalParticipants = 1 + tile.collaborators.length;

  const handleLike = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (liking) return;
    setLiking(true);
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount((prev) => Math.max(0, newLiked ? prev + 1 : prev - 1));
    try {
      const res = await fetch(`/api/pledges/${tile.id}/like`, { method: "POST" });
      if (res.ok) {
        const json = await res.json();
        if (typeof json.data?.likeCount === "number") setLikeCount(json.data.likeCount);
        if (typeof json.data?.hasLiked === "boolean") setLiked(json.data.hasLiked);
      }
    } catch { /* ignore */ }
    setLiking(false);
  };

  return (
    <div className="bg-surface border border-border rounded-xl hover:border-primary/30 hover:shadow-md transition-all overflow-hidden">
      {/* Candidate header */}
      <div className="flex items-center gap-2.5 p-4 pb-2">
        <div className="flex -space-x-2 shrink-0">
          <AvatarBubble image={tile.candidateProfileImage} name={tile.candidateName} size={32} zIndex={totalParticipants} />
          {tile.collaborators.slice(0, 2).map((c, i) => (
            <AvatarBubble key={c.id} image={c.profileImage} name={c.name} size={28} zIndex={totalParticipants - 1 - i} />
          ))}
          {tile.collaborators.length > 2 && (
            <div
              className="rounded-full bg-muted/20 border-2 border-surface flex items-center justify-center shrink-0 relative text-[10px] font-bold text-muted"
              style={{ width: 24, height: 24, zIndex: 0 }}
            >
              +{tile.collaborators.length - 2}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-foreground truncate">
            {tile.candidateName}{isShared ? ` 외 ${tile.collaborators.length}명` : ""}
          </p>
          <p className="text-[11px] text-muted truncate">{tile.candidateDistrict}</p>
        </div>
        {isShared && (
          <span className="shrink-0 text-[11px] px-1.5 py-0.5 rounded-full border border-primary/30 text-primary bg-primary/5 font-medium">
            공동
          </span>
        )}
        {/* Collapse toggle */}
        <button
          onClick={(e) => { e.preventDefault(); setCollapsed((v) => !v); }}
          aria-label={collapsed ? "펼치기" : "접기"}
          className="shrink-0 w-6 h-6 flex items-center justify-center text-muted hover:text-foreground transition-colors rounded"
        >
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth={2}
            className={`transition-transform duration-200 ${collapsed ? "" : "rotate-180"}`}
          >
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Collapsible body */}
      {collapsed ? (
        /* Collapsed: title only as link */
        <Link href={`/?pledge=${tile.id}`} className="block px-4 pb-2 group">
          <h3 className="font-semibold text-foreground text-sm leading-snug line-clamp-1 group-hover:text-primary transition-colors break-keep">
            {tile.title}
          </h3>
        </Link>
      ) : (
        /* Expanded: full card body as link */
        <Link href={`/?pledge=${tile.id}`} className="block px-4 pb-2 group">
          {/* Badges */}
          <div className="flex flex-wrap gap-1 mb-2">
            {tile.category && (
              <span
                className="inline-flex items-center gap-0.5 text-[11px] font-medium px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: tile.category.color + "20", color: tile.category.color }}
              >
                {tile.category.emoji && <span>{tile.category.emoji}</span>}
                {tile.category.name}
              </span>
            )}
            <span className={`text-[11px] px-1.5 py-0.5 rounded-full border font-medium ${
              tile.pledgeType === "bylaws"
                ? "border-blue-200 text-blue-600 bg-blue-50"
                : "border-green-200 text-green-600 bg-green-50"
            }`}>
              {tile.pledgeType === "bylaws" ? "조례" : "지역 공약"}
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
          {(tile.budget || tile.address) && (
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {tile.budget && <span className="text-[11px] text-primary font-medium">{tile.budget}</span>}
              {tile.address && <span className="text-[11px] text-muted truncate">📍 {tile.address}</span>}
            </div>
          )}
        </Link>
      )}

      {/* Footer: like button (always visible) */}
      <div className="px-4 pb-3 flex justify-end">
        <button
          onClick={handleLike}
          disabled={liking}
          aria-label={`좋아요 ${likeCount}개`}
          className={`flex items-center gap-1 text-[12px] font-medium transition-all rounded-full px-2 py-1 ${
            liked
              ? "text-red-500 bg-red-50 hover:bg-red-100"
              : "text-muted/70 hover:text-red-400 hover:bg-red-50"
          } disabled:opacity-50`}
        >
          <svg
            width="11" height="11" viewBox="0 0 24 24"
            fill={liked ? "currentColor" : "none"}
            stroke="currentColor" strokeWidth={2}
            aria-hidden="true"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          {likeCount}
        </button>
      </div>
    </div>
  );
}
