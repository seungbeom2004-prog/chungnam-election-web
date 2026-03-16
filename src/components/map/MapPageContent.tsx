"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import NaverMap from "@/components/map/NaverMap";
import type { ProposalMapItem } from "@/components/map/NaverMap";
import PledgePanel from "@/components/map/PledgePanel";
import BylawPanel from "@/components/map/BylawPanel";
import CandidatePopup from "@/components/map/CandidatePopup";
import { useMapStore } from "@/store/useMapStore";
import { useUITexts } from "@/hooks/useUITexts";
import { useTheme } from "@/contexts/ThemeContext";
import type { Pledge, BylawGroup } from "@/types";
import { findDistrictCity } from "@/lib/districts";
import UserProfileButton from "@/components/layout/UserProfileButton";
import OnboardingModal from "@/components/ui/OnboardingModal";
import PledgePinTooltip from "@/components/ui/PledgePinTooltip";

const CITY_ZOOM = 6;
const PANEL_PLEDGES_LIMIT = 6;
const PANEL_CANDIDATES_LIMIT = 5;

const CATEGORY_ICONS: Record<string, string> = {
  "교통": "🚌",
  "안전": "⚠️",
  "교육": "📚",
  "복지": "🏥",
  "경제": "📈",
  "조례": "📜",
};

export interface CandidateForMap {
  id: string;
  name: string;
  district: string;
  profileImage: string | null;
  electionType: string | null;
  electionName: string | null;
  detailedElectionName: string | null;
  candidateStatus: string;
  caucusStatus: string | null;
  pinLat: number | null;
  pinLng: number | null;
  youtube: string | null;
  instagram: string | null;
  twitter: string | null;
  facebook: string | null;
  tiktok: string | null;
  kakao: string | null;
  naverBlog: string | null;
  createdAt?: string | null;
}

export interface DistrictCoords {
  name: string;
  centerLat: number;
  centerLng: number;
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const IconMapPin = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const IconBulb = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="9" y1="18" x2="15" y2="18" />
    <line x1="10" y1="22" x2="14" y2="22" />
    <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
  </svg>
);

const IconClipboard = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    <line x1="9" y1="12" x2="15" y2="12" />
    <line x1="9" y1="16" x2="13" y2="16" />
  </svg>
);

const IconUsers = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const IconMenu = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const IconSearch = ({ size = 16, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);

const IconChevronLeft = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

const IconChevronRight = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18l6-6-6-6" />
  </svg>
);

const IconChevronDown = ({ size = 14, style }: { size?: number; style?: React.CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);

const IconLocation = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const IconPerson = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
);

const IconDashboard = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

// ─── Election D-Day ───────────────────────────────────────────────────────────

const ELECTION_DATE = new Date("2026-06-03T00:00:00+09:00");

function useDDay() {
  const [dday, setDday] = useState<number | null>(null);
  useEffect(() => {
    const calc = () => {
      const diff = ELECTION_DATE.getTime() - Date.now();
      setDday(Math.ceil(diff / (1000 * 60 * 60 * 24)));
    };
    calc();
    const t = setInterval(calc, 60_000);
    return () => clearInterval(t);
  }, []);
  return dday;
}

function DDayBadge({ compact = false }: { compact?: boolean }) {
  const dday = useDDay();
  if (dday === null) return null;
  const label = dday > 0 ? `D-${dday}` : dday === 0 ? "D-Day" : `D+${Math.abs(dday)}`;
  const isUrgent = dday >= 0 && dday <= 30;
  if (compact) {
    return (
      <Link href="/about" title="2026 전국동시지방선거" className={`flex items-center justify-center w-11 h-8 rounded-xl text-[9px] font-bold shrink-0 transition-colors ${isUrgent ? "bg-red-500 text-white animate-pulse" : "bg-primary/10 text-primary hover:bg-primary/20"}`}>
        {label}
      </Link>
    );
  }
  return (
    <Link href="/about" title="2026 전국동시지방선거 소개" className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-opacity hover:opacity-80 ${isUrgent ? "bg-red-500 text-white" : "bg-primary/10 text-primary"}`}>
      <span aria-hidden="true">🗳️</span>
      <span>지방선거 {label}</span>
    </Link>
  );
}

// ─── Font Size Control (compact) ─────────────────────────────────────────────

function FontSizeCompact() {
  const [scale, setScale] = useState(1.0);
  useEffect(() => {
    const saved = parseFloat(localStorage.getItem("fontScale") ?? "1");
    const valid = isNaN(saved) ? 1 : Math.max(0.8, Math.min(1.3, saved));
    setScale(valid);
    document.documentElement.style.fontSize = `${valid * 16}px`;
  }, []);
  const apply = (next: number) => {
    const c = Math.max(0.8, Math.min(1.3, next));
    setScale(c);
    localStorage.setItem("fontScale", String(c));
    document.documentElement.style.fontSize = `${c * 16}px`;
  };
  return (
    <div className="flex flex-col gap-0.5 items-center" title="글씨 크기">
      <button onClick={() => apply(scale + 0.1)} disabled={scale >= 1.3} className="w-11 h-11 flex items-center justify-center text-[10px] font-bold text-muted hover:bg-background rounded-md disabled:opacity-30 transition-colors" aria-label="글자 크기 키우기" title="글자 크기 키우기">A+</button>
      <button onClick={() => apply(scale - 0.1)} disabled={scale <= 0.8} className="w-11 h-11 flex items-center justify-center text-[10px] font-medium text-muted hover:bg-background rounded-md disabled:opacity-30 transition-colors" aria-label="글자 크기 줄이기" title="글자 크기 줄이기">A-</button>
    </div>
  );
}

// ─── Rail Item (desktop left nav) ─────────────────────────────────────────────

function RailItem({
  icon,
  label,
  active = false,
  onClick,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  href?: string;
}) {
  const cls = `relative group flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all cursor-pointer select-none ${
    active
      ? "bg-primary/15 text-primary"
      : "text-muted hover:bg-background/80 hover:text-foreground"
  }`;
  const inner = (
    <>
      {icon}
      <span className="text-[9px] font-semibold mt-0.5 leading-none tracking-tight">{label}</span>
      <span className="absolute left-full ml-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-hover:opacity-100 bg-gray-900 text-white text-xs py-1.5 px-2.5 rounded-lg whitespace-nowrap transition-opacity z-50 shadow-lg">
        {label}
      </span>
    </>
  );
  if (href) return <Link href={href} className={cls} aria-label={label}>{inner}</Link>;
  return <button onClick={onClick} className={cls} aria-label={label}>{inner}</button>;
}

// ─── Bottom Nav Item (mobile) ─────────────────────────────────────────────────

function BottomNavItem({
  icon,
  label,
  active = false,
  onClick,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  href?: string;
}) {
  const cls = `flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors ${
    active ? "text-primary" : "text-muted hover:text-foreground"
  }`;
  const inner = (
    <>
      <span className="leading-none">{icon}</span>
      <span className="text-[10px] font-medium leading-none">{label}</span>
    </>
  );
  if (href) return <Link href={href} className={cls}>{inner}</Link>;
  return <button onClick={onClick} className={cls}>{inner}</button>;
}

// ─── Menu Drawer Item ─────────────────────────────────────────────────────────

function DrawerItem({
  icon,
  label,
  href,
  onClick,
  external = false,
}: {
  icon: React.ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
  external?: boolean;
}) {
  const cls = "flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-background transition-colors text-left w-full";
  const inner = (
    <>
      <span className="w-8 h-8 rounded-xl bg-background flex items-center justify-center shrink-0 text-foreground">{icon}</span>
      <span className="text-sm font-medium text-foreground flex-1">{label}</span>
      {external && (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" />
        </svg>
      )}
    </>
  );
  if (href && !onClick) return <Link href={href} className={cls} target={external ? "_blank" : undefined}>{inner}</Link>;
  if (href && onClick) return <Link href={href} onClick={onClick} className={cls}>{inner}</Link>;
  return <button onClick={onClick} className={cls}>{inner}</button>;
}

// ─── Main Page Content ────────────────────────────────────────────────────────

export default function MapPageContent() {
  const [pledges, setPledges] = useState<Pledge[]>([]);
  const [bylawGroups, setBylawGroups] = useState<BylawGroup[]>([]);
  const [proposals, setProposals] = useState<ProposalMapItem[]>([]);
  const [selectedProposal, setSelectedProposal] = useState<ProposalMapItem | null>(null);
  const [candidates, setCandidates] = useState<CandidateForMap[]>([]);
  const [districts, setDistricts] = useState<DistrictCoords[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [candidatesLoaded, setCandidatesLoaded] = useState(false);
  const [emptyOverlayDismissed, setEmptyOverlayDismissed] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateForMap | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [panelOpen, setPanelOpen] = useState(true);
  const [mapResizeTrigger, setMapResizeTrigger] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [districtDropdownOpen, setDistrictDropdownOpen] = useState(false);
  const [categoryLegendOpen, setCategoryLegendOpen] = useState(false);
  const [mobileDistrictOpen, setMobileDistrictOpen] = useState(false);
  const [mobileCategoryOpen, setMobileCategoryOpen] = useState(false);
  const [mobileCandidateListOpen, setMobileCandidateListOpen] = useState(false);

  const districtDropdownRef = useRef<HTMLDivElement>(null);
  const categoryLegendRef = useRef<HTMLDivElement>(null);
  const mobileDistrictRef = useRef<HTMLDivElement>(null);
  const deepLinkHandledRef = useRef(false);
  const searchParams = useSearchParams();

  const { setSelectedPledge, selectedPledge, selectedDistrict, setCenter, setZoomLevel, setSelectedDistrict, setSelectedBylawGroup } = useMapStore();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _t = useUITexts();
  const { isCute, setTheme } = useTheme();
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  // Determine active theme from URL pathname (avoids async isCute hydration race)
  const isOnCutePath = pathname === "/cute";

  // Prefetch key routes for instant navigation
  useEffect(() => {
    const routes = ["/regular", "/cute", "/proposals", "/pledges", "/about", "/login"];
    routes.forEach((r) => router.prefetch(r));
  }, [router]);

  const primaryColor = isCute ? "#FF6B9D" : "#D14800";

  // Filtered candidates
  const filteredCandidates = candidates.filter((c) => {
    const matchDistrict = !selectedDistrict || c.district === selectedDistrict || c.district.startsWith(selectedDistrict);
    const q = searchQuery.trim().toLowerCase();
    const matchSearch = !q || c.name.toLowerCase().includes(q) || c.district.toLowerCase().includes(q) || (c.electionType ?? "").toLowerCase().includes(q);
    return matchDistrict && matchSearch;
  });

  // Active categories
  const activeCategories = (() => {
    const map = new Map<string, { icon: string; count: number }>();
    pledges.forEach((p) => {
      const name = p.category?.name;
      if (name) {
        const existing = map.get(name);
        map.set(name, { icon: p.category?.emoji || CATEGORY_ICONS[name] || "📌", count: (existing?.count ?? 0) + 1 });
      }
    });
    return Array.from(map.entries()).map(([name, info]) => ({ id: name, ...info }));
  })();

  // Filtered pledges for panel list (limited)
  const panelPledges = pledges
    .filter((p) => selectedCategory === "all" || p.category?.name === selectedCategory)
    .filter((p) => !selectedDistrict || (p.candidate?.district ?? "").startsWith(selectedDistrict))
    .filter((p) => {
      const q = searchQuery.trim().toLowerCase();
      return !q || p.title.toLowerCase().includes(q) || (p.candidate?.name ?? "").toLowerCase().includes(q);
    })
    .slice(0, PANEL_PLEDGES_LIMIT);

  // ─── Data fetching ──────────────────────────────────────────────────────────

  useEffect(() => {
    fetch("/api/pledges?limit=500&pledgeType=bylaws")
      .then((r) => r.json())
      .then((json) => {
        const data: Pledge[] = json.data ?? [];
        const grouped: Record<string, BylawGroup> = {};
        for (const pledge of data) {
          if (!pledge.candidate) continue;
          const districtCity = findDistrictCity(pledge.candidate.district);
          if (!districtCity) continue;
          const key = districtCity.name;
          if (!grouped[key]) grouped[key] = { cityName: districtCity.name, councilLat: districtCity.councilLat, councilLng: districtCity.councilLng, pledges: [] };
          grouped[key]!.pledges.push(pledge);
        }
        setBylawGroups(Object.values(grouped));
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetch("/api/pledges?limit=1000&pledgeType=map")
      .then((r) => r.json())
      .then((json) => {
        const data = json.data ?? json;
        setPledges(Array.isArray(data) ? data : []);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetch("/api/proposals?limit=200&hasLocation=true")
      .then((r) => r.json())
      .then((json) => {
        const data: Array<{ id: string; title?: string; content: string; authorName: string; latitude: number | null; longitude: number | null; likeCount?: number }> = json.data ?? json ?? [];
        const items: ProposalMapItem[] = data
          .filter((p) => p.latitude != null && p.longitude != null)
          .map((p) => ({ id: p.id, title: p.title ?? p.content.slice(0, 30), content: p.content, authorName: p.authorName, latitude: p.latitude as number, longitude: p.longitude as number, likeCount: p.likeCount ?? 0 }));
        setProposals(items);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (deepLinkHandledRef.current || pledges.length === 0) return;
    const pledgeId = searchParams.get("pledge");
    if (!pledgeId) return;
    const found = pledges.find((p) => p.id === pledgeId);
    if (found) {
      deepLinkHandledRef.current = true;
      setSelectedPledge(found);
      setCenter(found.latitude, found.longitude);
    }
  }, [pledges, searchParams, setSelectedPledge, setCenter]);

  useEffect(() => {
    fetch("/api/candidates?limit=500&eligible=true")
      .then((r) => r.json())
      .then((json) => {
        const data: Array<{
          id: string; name: string; district: string; profileImage: string | null; electionType: string | null; detailedElectionName: string | null;
          candidateStatus: string; caucusStatus: string | null; pinLat: number | null; pinLng: number | null;
          youtube: string | null; instagram: string | null; twitter: string | null; facebook: string | null;
          tiktok: string | null; kakao: string | null; naverBlog: string | null; createdAt?: string | null;
          election?: { id: string; name: string } | null;
        }> = json.data ?? [];
        setCandidates(data.map((c) => ({
          id: c.id, name: c.name, district: c.district, profileImage: c.profileImage,
          electionType: c.electionType ?? null, electionName: c.election?.name ?? null,
          detailedElectionName: c.detailedElectionName ?? null, candidateStatus: c.candidateStatus ?? "",
          caucusStatus: c.caucusStatus ?? null, pinLat: c.pinLat ?? null, pinLng: c.pinLng ?? null,
          youtube: c.youtube ?? null, instagram: c.instagram ?? null, twitter: c.twitter ?? null,
          facebook: c.facebook ?? null, tiktok: c.tiktok ?? null, kakao: c.kakao ?? null,
          naverBlog: c.naverBlog ?? null, createdAt: c.createdAt ?? null,
        })));
      })
      .catch(console.error)
      .finally(() => setCandidatesLoaded(true));
  }, []);

  useEffect(() => {
    fetch("/api/districts")
      .then((r) => r.json())
      .then((json) => {
        setDistricts((json.data ?? []).map((d: { name: string; centerLat: number; centerLng: number }) => ({ name: d.name, centerLat: d.centerLat, centerLng: d.centerLng })));
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    (window as unknown as Record<string, unknown>).navermap_authFailure = function () {
      setMapError("네이버 지도 인증에 실패했습니다. NCP 콘솔에서 Web Dynamic Map API 활성화 및 도메인 등록을 확인하세요.");
    };
    const isSdkReady = () => {
      try {
        const w = window as unknown as { naver?: { maps?: { Map?: unknown } } };
        return !!w.naver?.maps && typeof w.naver.maps.Map === "function";
      } catch { return false; }
    };
    if (isSdkReady()) { setMapReady(true); return; }
    let polls = 0;
    const timer = setInterval(() => {
      if (isSdkReady()) { clearInterval(timer); setMapReady(true); }
      else if (++polls > 75) { clearInterval(timer); setMapError("네이버 지도 SDK를 불러올 수 없습니다. 페이지를 새로고침 해주세요."); }
    }, 200);
    return () => clearInterval(timer);
  }, []);

  // Close district dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (districtDropdownRef.current && !districtDropdownRef.current.contains(e.target as Node)) setDistrictDropdownOpen(false);
    };
    if (districtDropdownOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [districtDropdownOpen]);

  // Close category legend on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (categoryLegendRef.current && !categoryLegendRef.current.contains(e.target as Node)) setCategoryLegendOpen(false);
    };
    if (categoryLegendOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [categoryLegendOpen]);

  // Trigger map resize when sidebar panel opens/closes
  useEffect(() => {
    setMapResizeTrigger((n) => n + 1);
  }, [panelOpen]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleDistrictSelect = useCallback((district: DistrictCoords) => {
    setCenter(district.centerLat, district.centerLng);
    setZoomLevel(CITY_ZOOM);
    setSelectedDistrict(district.name);
    setDistrictDropdownOpen(false);
    setMobileDistrictOpen(false);
  }, [setCenter, setZoomLevel, setSelectedDistrict]);

  const handlePledgeClick = useCallback((pledge: Pledge) => {
    setSelectedPledge(pledge);
    setCenter(pledge.latitude, pledge.longitude);
  }, [setSelectedPledge, setCenter]);

  const handleCandidateClick = useCallback((candidate: CandidateForMap) => {
    setSelectedCandidate(candidate);
  }, []);

  const handleBylawGroupClick = useCallback((group: BylawGroup) => {
    setSelectedBylawGroup(group);
    setCenter(group.councilLat, group.councilLng);
  }, [setSelectedBylawGroup, setCenter]);

  const handleProposalClick = useCallback((proposal: ProposalMapItem) => {
    setSelectedProposal(proposal);
    setCenter(proposal.latitude, proposal.longitude);
  }, [setCenter]);

  const handleThemeToggle = useCallback(() => {
    const next = isCute ? "regular" : "cute";
    setTheme(next);
    router.push(`/${next}`);
  }, [isCute, setTheme, router]);

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col md:flex-row w-screen overflow-hidden h-dvh">

      {/* ══════════════════════════════════════════════
          DESKTOP LEFT RAIL (wider: 80px)
      ══════════════════════════════════════════════ */}
      <aside
        className="hidden md:flex w-20 shrink-0 flex-col items-center py-3 bg-surface border-r border-border z-30 gap-1"
        style={{ boxShadow: "1px 0 0 0 var(--color-border)" }}
      >
        {/* Logo */}
        <Link
          href="/"
          className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 shrink-0 transition-transform hover:scale-105 ${isCute ? "bg-pink-100" : "bg-primary"}`}
          title="개혁 충남"
        >
          <span className={`font-bold text-xs leading-none ${isCute ? "text-pink-600" : "text-white"}`}>개혁</span>
        </Link>

        {/* Main nav items */}
        <RailItem
          icon={<IconMapPin size={19} />}
          label="공약지도"
          active
          onClick={() => setPanelOpen((o) => !o)}
        />
        <RailItem icon={<IconBulb size={19} />} label="민원/제안" href="/proposals" />
        <RailItem icon={<IconClipboard size={19} />} label="공약" href="/pledges" />
        <RailItem icon={<IconUsers size={19} />} label="후보자" href="/about" />

        {/* Spacer */}
        <div className="flex-1" />

        {/* D-Day */}
        <DDayBadge compact />

        {/* Font size */}
        <FontSizeCompact />

        {/* Theme toggle compact */}
        <button
          onClick={handleThemeToggle}
          className={`w-11 h-11 rounded-xl flex items-center justify-center text-sm transition-colors ${
            isCute ? "bg-pink-100 text-pink-600 hover:bg-pink-200" : "text-muted hover:bg-background"
          }`}
          title={isCute ? "일반 모드로 전환" : "귀여운 모드로 전환"}
          aria-label={isCute ? "일반 모드로 전환" : "귀여운 모드로 전환"}
        >
          {isCute ? "🏛️" : "✨"}
        </button>

        {/* User / Login */}
        {session ? (
          <UserProfileButton />
        ) : (
          <Link href="/login" title="로그인" className="w-11 h-11 rounded-xl flex items-center justify-center text-muted hover:bg-background hover:text-foreground transition-colors">
            <IconPerson size={19} />
          </Link>
        )}
      </aside>

      {/* ══════════════════════════════════════════════
          DESKTOP CONTENT PANEL
          Outer wrapper has overflow:visible so the
          border-toggle button can stick out to the right.
      ══════════════════════════════════════════════ */}
      <div
        className="hidden md:block relative shrink-0 transition-[width] duration-200 ease-in-out"
        style={{ width: panelOpen ? "17.5rem" : "0px" }}
      >
        {/* Toggle button on the right border — always visible */}
        <button
          onClick={() => setPanelOpen((o) => !o)}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full z-20 w-11 h-14 bg-white border-y border-r border-border/70 rounded-r-xl shadow-md flex items-center justify-center text-muted hover:text-primary hover:bg-gray-50 transition-colors"
          aria-label={panelOpen ? "패널 닫기" : "패널 열기"}
          title={panelOpen ? "패널 닫기" : "패널 열기"}
        >
          {panelOpen ? <IconChevronLeft size={12} /> : <IconChevronRight size={12} />}
        </button>

        {/* Panel inner content — overflow:hidden clips the animated width */}
        <div className="flex flex-col bg-surface border-r border-border h-full overflow-hidden w-full">
          {panelOpen && (
            <>
              {/* Panel Header */}
              <div className="px-4 pt-5 pb-3 shrink-0 border-b border-border/40">
                <h1 className="text-xl font-bold text-foreground truncate">
                  {selectedDistrict ? `${selectedDistrict}의 공약` : "충남의 공약"}
                </h1>
                <p className="text-xs text-muted mt-0.5">후보자 {filteredCandidates.length}명</p>
              </div>

              {/* Search */}
              <div className="px-3 py-2.5 shrink-0 border-b border-border/30">
                <div className="flex items-center gap-2 bg-background rounded-xl px-3 py-2.5 border border-border focus-within:border-primary/50 transition-colors">
                  <IconSearch size={14} className="text-muted shrink-0" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="후보자, 공약 검색"
                    className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted min-w-0"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="text-muted hover:text-foreground text-base leading-none transition-colors">×</button>
                  )}
                </div>
              </div>

              {/* Scrollable content list */}
              <div className="flex-1 overflow-y-auto">

                {/* ─ Pledges section — FIRST ─ */}
                <div className="px-4 pt-3 pb-1 flex items-center justify-between sticky top-0 bg-surface/95 backdrop-blur-sm z-10">
                  <span className="text-[10px] font-bold text-muted uppercase tracking-widest">주요 공약</span>
                  <Link href="/pledges" className="text-[10px] font-semibold hover:underline" style={{ color: primaryColor }}>
                    전체 보기
                  </Link>
                </div>

                {panelPledges.length === 0 ? (
                  searchQuery.trim() ? (
                    <div className="text-center py-8 text-muted px-4">
                      <p className="text-2xl mb-2">🔍</p>
                      <p className="font-medium text-sm">검색 결과가 없어요</p>
                      <p className="text-xs mt-1">다른 키워드로 검색해보세요</p>
                    </div>
                  ) : (
                    <p className="px-4 py-4 text-xs text-muted text-center">공약이 없습니다</p>
                  )
                ) : (
                  <div className="divide-y divide-border/40">
                    {panelPledges.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handlePledgeClick(p)}
                        className="w-full flex items-start gap-3 px-4 py-3 hover:bg-background/70 transition-colors text-left"
                      >
                        <span className="text-base shrink-0 mt-0.5 leading-none">{p.category?.emoji || "📌"}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground line-clamp-2 leading-snug">{p.title}</p>
                          <p className="text-[11px] text-muted mt-0.5">{p.candidate?.name}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* ─ Candidates section ─ */}
                <div className="px-4 pt-4 pb-1 flex items-center justify-between sticky top-0 bg-surface/95 backdrop-blur-sm z-10 border-t border-border/50 mt-1">
                  <span className="text-[10px] font-bold text-muted uppercase tracking-widest">후보자</span>
                  <Link href="/about" className="text-[10px] font-semibold hover:underline" style={{ color: primaryColor }}>
                    전체 보기
                  </Link>
                </div>

                {filteredCandidates.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted">
                    <IconPerson size={28} />
                    <p className="text-xs mt-2">{searchQuery ? "검색 결과 없음" : "등록된 후보자 없음"}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/40">
                    {filteredCandidates.slice(0, PANEL_CANDIDATES_LIMIT).map((c) => (
                      <button
                        key={c.id}
                        onClick={() => handleCandidateClick(c)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-background/70 transition-colors text-left"
                      >
                        <div className="relative w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-primary/10 border border-border/50">
                          {c.profileImage ? (
                            <Image src={c.profileImage} alt={c.name} fill sizes="40px" className="object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-primary font-bold text-sm">{c.name[0]}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground text-sm leading-tight">{c.name}</p>
                          {c.electionType && <p className="text-[11px] text-muted truncate mt-0.5">{c.electionType}</p>}
                          <p className="text-[11px] text-primary truncate">{c.district}</p>
                        </div>
                        {c.candidateStatus && (
                          <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: `${primaryColor}18`, color: primaryColor }}>
                            {c.candidateStatus}
                          </span>
                        )}
                      </button>
                    ))}
                    {filteredCandidates.length > PANEL_CANDIDATES_LIMIT && (
                      <Link
                        href="/about"
                        className="flex items-center justify-center gap-1 py-3 text-xs font-semibold hover:bg-primary/5 transition-colors border-t border-border/30"
                        style={{ color: primaryColor }}
                      >
                        {filteredCandidates.length - PANEL_CANDIDATES_LIMIT}명 더 보기 →
                      </Link>
                    )}
                  </div>
                )}

                <div className="h-4" />
              </div>
            </>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          MAP AREA
      ══════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ─── Mobile Top Header (normal flow, not overlapping map) ─────────── */}
        <div className="md:hidden shrink-0 bg-surface/95 backdrop-blur-sm border-b border-border/20 z-20">
          {/* Row 1: Integrated search + theme button */}
          <div className="flex items-center gap-2.5 px-3 pt-2.5 pb-1.5">
            {/* Search input with integrated logo */}
            <div className={`flex-1 flex items-center gap-2.5 bg-white/92 backdrop-blur-sm rounded-2xl border border-border/30 px-3 py-2.5 shadow-sm focus-within:border-primary/50 transition-colors`}>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isCute ? "bg-pink-100" : "bg-primary"}`}>
                <span className={`font-bold text-[9px] leading-none ${isCute ? "text-pink-600" : "text-white"}`}>개혁</span>
              </div>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="후보자, 공약 검색"
                className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted min-w-0"
                aria-label="후보자 및 공약 검색"
                type="search"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-muted hover:text-foreground text-sm leading-none transition-colors"
                  aria-label="검색어 지우기"
                >
                  ×
                </button>
              )}
            </div>

            {/* Theme toggle - compact */}
            <button
              onClick={handleThemeToggle}
              className={`shrink-0 w-11 h-11 rounded-2xl flex flex-col items-center justify-center gap-0.5 border-2 text-base transition-all shadow-md ${
                isCute
                  ? "border-pink-400 bg-pink-500 text-white"
                  : "border-orange-600/70 bg-primary text-white"
              }`}
              aria-label={isCute ? "일반 모드로 전환" : "귀여운 모드로 전환"}
            >
              <span className="text-base leading-none">{isCute ? "🏛️" : "✨"}</span>
              <span className="text-[7px] font-bold leading-none">{isCute ? "일반" : "귀여운"}</span>
            </button>
          </div>

          {/* Row 2: Category / City / Candidate buttons */}
          <div className="flex gap-2 px-3 pb-2.5 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setMobileCategoryOpen(true)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors shadow-sm ${
                selectedCategory !== "all"
                  ? "bg-primary text-white border-primary"
                  : "bg-white/90 backdrop-blur-sm text-foreground border-border/50"
              }`}
            >
              <span>📂</span>
              <span>카테고리{selectedCategory !== "all" ? ` (${selectedCategory})` : ""}</span>
            </button>

            <button
              onClick={() => setMobileDistrictOpen(true)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors shadow-sm ${
                selectedDistrict
                  ? "bg-primary text-white border-primary"
                  : "bg-white/90 backdrop-blur-sm text-foreground border-border/50"
              }`}
            >
              <IconLocation size={12} />
              <span>{selectedDistrict ?? "지역"}</span>
            </button>

            <button
              onClick={() => setMobileCandidateListOpen(true)}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border bg-white/90 backdrop-blur-sm text-foreground border-border/50 shadow-sm transition-colors"
            >
              <IconPerson size={12} />
              <span className="whitespace-nowrap">후보자 {filteredCandidates.length}명</span>
            </button>
          </div>
        </div>

        {/* Map canvas wrapper — flex-1 fills remaining height */}
        <div className="flex-1 relative min-w-0 overflow-hidden min-h-0">

        {/* Map rendering */}
        {mapReady && !mapError ? (
          <NaverMap
            pledges={pledges}
            candidates={candidates}
            districts={districts}
            onPledgeClick={handlePledgeClick}
            onCandidateClick={handleCandidateClick}
            onBylawGroupClick={handleBylawGroupClick}
            bylawGroups={bylawGroups}
            proposals={proposals}
            onProposalClick={handleProposalClick}
            isCute={isCute}
            selectedCategory={selectedCategory}
            selectedPledgeId={selectedPledge?.id ?? null}
            resizeTrigger={mapResizeTrigger}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-background">
            <div className="text-center">
              {mapError ? (
                <>
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
                    <span className="text-red-500 text-lg">!</span>
                  </div>
                  <p className="text-sm text-red-600 max-w-xs">{mapError}</p>
                  <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 text-xs bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
                    다시 시도
                  </button>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm text-muted">지도를 불러오는 중...</p>
                </>
              )}
            </div>
          </div>
        )}

        {/* ─── Desktop: District + Category overlay (top-left) ─────────────── */}
        <div className="hidden md:flex absolute top-3 left-3 z-20 flex-row items-start gap-2">
          {/* District dropdown */}
          <div ref={districtDropdownRef} className="relative">
            <button
              onClick={() => setDistrictDropdownOpen((o) => !o)}
              className={`flex items-center gap-2 px-3.5 py-2.5 bg-white/97 backdrop-blur-sm rounded-xl border shadow-md text-sm font-semibold transition-colors ${
                selectedDistrict ? "border-primary/50 text-primary" : "border-border/50 text-foreground hover:bg-white"
              }`}
            >
              <IconLocation size={14} />
              <span>{selectedDistrict ?? "전체 지역"}</span>
              <IconChevronDown
                size={12}
                style={{ transition: "transform 0.15s", transform: districtDropdownOpen ? "rotate(180deg)" : "rotate(0deg)" }}
              />
            </button>
            {districtDropdownOpen && districts.length > 0 && (
              <div className="absolute top-full left-0 mt-1.5 bg-white/98 border border-border rounded-xl shadow-2xl overflow-hidden min-w-[160px] max-h-64 overflow-y-auto z-50">
                <button
                  onClick={() => { setSelectedDistrict(null); setDistrictDropdownOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${!selectedDistrict ? "text-primary bg-primary/10" : "text-foreground hover:bg-gray-50"}`}
                >
                  전체 지역
                </button>
                {districts.map((d) => (
                  <button
                    key={d.name}
                    onClick={() => handleDistrictSelect(d)}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selectedDistrict === d.name ? "text-primary bg-primary/10 font-medium" : "text-foreground hover:bg-gray-50"}`}
                  >
                    {d.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Category button + legend */}
          <div ref={categoryLegendRef} className="relative">
            <button
              onClick={() => setCategoryLegendOpen((o) => !o)}
              className={`flex items-center gap-2 px-3.5 py-2.5 bg-white/97 backdrop-blur-sm rounded-xl border shadow-md text-sm font-semibold transition-colors ${
                selectedCategory !== "all" || categoryLegendOpen
                  ? "border-primary/50 text-primary bg-primary/5"
                  : "border-border/50 text-foreground hover:bg-white"
              }`}
            >
              <span>📂</span>
              <span>카테고리{selectedCategory !== "all" ? ` (${selectedCategory})` : ""}</span>
            </button>
            {categoryLegendOpen && (
              <div className="absolute top-full left-0 mt-1.5 bg-white/98 border border-border rounded-xl shadow-2xl overflow-hidden min-w-[200px] z-50">
                <div className="p-2 space-y-0.5">
                  <button
                    onClick={() => { setSelectedCategory("all"); setCategoryLegendOpen(false); }}
                    className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${selectedCategory === "all" ? "text-primary bg-primary/10" : "text-foreground hover:bg-gray-50"}`}
                  >
                    <span className="text-base">🗺️</span>
                    <span className="flex-1">전체</span>
                    {selectedCategory === "all" && <span className="text-primary text-xs">✓</span>}
                  </button>
                  {activeCategories.map(({ id, icon, count }) => (
                    <button
                      key={id}
                      onClick={() => { setSelectedCategory(selectedCategory === id ? "all" : id); setCategoryLegendOpen(false); }}
                      className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${selectedCategory === id ? "text-primary bg-primary/10 font-medium" : "text-foreground hover:bg-gray-50"}`}
                    >
                      <span className="text-base">{icon}</span>
                      <span className="flex-1">{id}</span>
                      <span className="text-xs text-muted">{count}개</span>
                      {selectedCategory === id && <span className="text-primary text-xs ml-1">✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── Desktop: Theme toggle buttons (top-right) ───────────────────── */}
        <div className="hidden md:flex absolute top-3 right-3 z-20 items-center gap-1 p-1 bg-white/97 backdrop-blur-sm rounded-2xl border border-border/50 shadow-md">
          <button
            onClick={() => { if (isCute) handleThemeToggle(); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              !isOnCutePath ? "bg-primary text-white shadow-sm" : "text-muted hover:text-foreground hover:bg-gray-100/80"
            }`}
            aria-pressed={!isOnCutePath}
          >
            🏛️ 일반 테마
          </button>
          <button
            onClick={() => { if (!isCute) handleThemeToggle(); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              isOnCutePath ? "bg-pink-500 text-white shadow-sm" : "text-muted hover:text-foreground hover:bg-gray-100/80"
            }`}
            aria-pressed={isOnCutePath}
          >
            ✨ 귀여운 테마
          </button>
          {session && (
            <>
              <div className="w-px h-5 bg-border/50 mx-0.5" />
              <UserProfileButton />
            </>
          )}
        </div>

        {/* ─── Mobile Category Legend Popup ──────────────────────────────── */}
        {mobileCategoryOpen && (
          <div className="md:hidden fixed inset-0 z-50" onClick={() => setMobileCategoryOpen(false)}>
            <div className="absolute inset-0 bg-black/40" />
            <div
              className="absolute bottom-0 left-0 right-0 bg-surface rounded-t-3xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
              style={{ paddingBottom: "calc(3.5rem + env(safe-area-inset-bottom))" }}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h2 className="font-bold text-foreground text-lg">카테고리</h2>
                <button onClick={() => setMobileCategoryOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-background text-muted text-xl leading-none" aria-label="닫기">×</button>
              </div>
              <div className="p-4 space-y-1.5">
                <button
                  onClick={() => { setSelectedCategory("all"); setMobileCategoryOpen(false); }}
                  className={`w-full text-left flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-colors ${
                    selectedCategory === "all" ? "text-primary bg-primary/10" : "text-foreground hover:bg-background/70"
                  }`}
                >
                  <span className="text-xl">🗺️</span>
                  <span className="flex-1">전체</span>
                  {selectedCategory === "all" && <span className="text-primary text-sm font-bold">✓</span>}
                </button>
                {activeCategories.map(({ id, icon, count }) => (
                  <button
                    key={id}
                    onClick={() => { setSelectedCategory(selectedCategory === id ? "all" : id); setMobileCategoryOpen(false); }}
                    className={`w-full text-left flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm transition-colors ${
                      selectedCategory === id ? "text-primary bg-primary/10 font-medium" : "text-foreground hover:bg-background/70"
                    }`}
                  >
                    <span className="text-xl">{icon}</span>
                    <span className="flex-1">{id}</span>
                    <span className="text-sm text-muted">{count}개</span>
                    {selectedCategory === id && <span className="text-primary text-sm font-bold ml-1">✓</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── Mobile Candidate List Popup (improved visibility) ─────────── */}
        {mobileCandidateListOpen && (
          <div className="md:hidden fixed inset-0 z-50" onClick={() => setMobileCandidateListOpen(false)}>
            <div className="absolute inset-0 bg-black/50" />
            <div
              className="absolute bottom-0 left-0 right-0 bg-surface rounded-t-3xl shadow-2xl flex flex-col"
              style={{ maxHeight: "72dvh", paddingBottom: "calc(3.5rem + env(safe-area-inset-bottom))" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
                <h2 className="font-bold text-foreground text-lg">
                  {selectedDistrict ? `${selectedDistrict}의 후보자` : "충남의 후보자"}
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted font-medium">{filteredCandidates.length}명</span>
                  <button onClick={() => setMobileCandidateListOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-background text-muted text-xl leading-none" aria-label="닫기">×</button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {filteredCandidates.length === 0 ? (
                  <div className="py-14 text-center text-muted">
                    <IconPerson size={36} />
                    <p className="text-sm mt-3">등록된 후보자가 없습니다</p>
                  </div>
                ) : filteredCandidates.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { handleCandidateClick(c); setMobileCandidateListOpen(false); }}
                    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-background/60 active:bg-background transition-colors text-left border-b border-border/30 last:border-b-0"
                  >
                    <div className="relative w-14 h-14 rounded-2xl overflow-hidden shrink-0 bg-primary/10 border-2 border-border/50">
                      {c.profileImage ? (
                        <Image src={c.profileImage} alt={c.name} fill sizes="56px" className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-primary font-bold text-xl">{c.name[0]}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-foreground text-base leading-tight">{c.name}</p>
                      {c.electionType && <p className="text-xs text-muted mt-0.5 truncate">{c.electionType}</p>}
                      <p className="text-sm font-semibold mt-0.5 truncate" style={{ color: primaryColor }}>{c.district}</p>
                    </div>
                    {c.candidateStatus && (
                      <span className="shrink-0 text-[11px] px-2.5 py-1 rounded-xl font-bold" style={{ background: `${primaryColor}15`, color: primaryColor }}>
                        {c.candidateStatus}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── Mobile district selector ────────────────────────────────────── */}
        {mobileDistrictOpen && districts.length > 0 && (
          <div
            ref={mobileDistrictRef}
            className="md:hidden fixed inset-0 z-50"
            onClick={() => setMobileDistrictOpen(false)}
          >
            <div className="absolute inset-0 bg-black/40" />
            <div
              className="absolute bottom-0 left-0 right-0 bg-surface rounded-t-3xl shadow-2xl overflow-hidden max-h-[60dvh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
              style={{ paddingBottom: "calc(3.5rem + env(safe-area-inset-bottom))" }}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-surface z-10">
                <h2 className="font-bold text-foreground text-lg">지역 선택</h2>
                <button onClick={() => setMobileDistrictOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-background text-muted text-xl leading-none" aria-label="닫기">×</button>
              </div>
              <button
                onClick={() => { setSelectedDistrict(null); setMobileDistrictOpen(false); }}
                className={`w-full text-left px-5 py-3.5 text-sm font-medium transition-colors border-b border-border/30 ${!selectedDistrict ? "text-primary bg-primary/10" : "text-foreground hover:bg-background/70"}`}
              >
                전체 지역
              </button>
              {districts.map((d) => (
                <button
                  key={d.name}
                  onClick={() => { handleDistrictSelect(d); setMobileDistrictOpen(false); }}
                  className={`w-full text-left px-5 py-3.5 text-sm transition-colors border-b border-border/30 ${selectedDistrict === d.name ? "text-primary bg-primary/10 font-semibold" : "text-foreground hover:bg-background/70"}`}
                >
                  {d.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ─── Empty state overlay ─────────────────────────────────────────── */}
        {mapReady && !mapError && candidatesLoaded && candidates.length === 0 && !emptyOverlayDismissed && (
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none" style={{ top: "110px" }}>
            <div className="pointer-events-auto bg-white/95 backdrop-blur-sm rounded-2xl px-6 py-5 shadow-lg border border-border text-center max-w-xs mx-4">
              <p className="text-sm font-semibold text-foreground mb-3">아직 등록된 후보자가 없습니다</p>
              <a href="/signup" className="inline-block px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary/90 transition-colors">
                후보자로 등록하기 →
              </a>
              <button onClick={() => setEmptyOverlayDismissed(true)} className="block w-full mt-2 text-xs text-muted hover:text-foreground transition-colors">
                닫기
              </button>
            </div>
          </div>
        )}

        {/* Panels */}
        <PledgePanel />
        <BylawPanel />

        {selectedCandidate && (
          <CandidatePopup candidate={selectedCandidate} onClose={() => setSelectedCandidate(null)} />
        )}

        {/* Proposal popup */}
        {selectedProposal && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 w-[min(90vw,380px)] md:bottom-4">
            <div className="bg-white/98 backdrop-blur-sm border border-purple-200 rounded-2xl shadow-xl overflow-hidden">
              <div className="flex items-start gap-2 px-4 pt-4 pb-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-base">💬</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-purple-700 truncate">{selectedProposal.title}</p>
                  <p className="text-[11px] text-muted mt-0.5">{selectedProposal.authorName} · ♥ {selectedProposal.likeCount}</p>
                </div>
                <button onClick={() => setSelectedProposal(null)} className="shrink-0 text-muted hover:text-foreground text-lg leading-none mt-0.5" aria-label="닫기">×</button>
              </div>
              <div className="px-4 pb-3">
                <p className="text-xs text-foreground line-clamp-3 leading-relaxed">{selectedProposal.content}</p>
              </div>
              <div className="px-4 pb-4">
                <a href="/proposals" className="block w-full text-center py-2 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors">
                  민원 & 제안 게시판에서 보기 →
                </a>
              </div>
            </div>
          </div>
        )}
        </div>{/* end map canvas wrapper */}
      </div>{/* end map area */}

      {/* ══════════════════════════════════════════════
          MOBILE BOTTOM NAV BAR
      ══════════════════════════════════════════════ */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-border"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="하단 메뉴"
      >
        <div className="flex items-center h-14">
          <BottomNavItem icon={<IconMapPin size={20} />} label="지도" active />
          <BottomNavItem icon={<IconBulb size={20} />} label="민원/제안" href="/proposals" />
          <BottomNavItem icon={<IconClipboard size={20} />} label="공약" href="/pledges" />
          <BottomNavItem icon={<IconUsers size={20} />} label="소개" href="/about" />
          <BottomNavItem icon={<IconMenu size={20} />} label="더보기" onClick={() => setMenuOpen(true)} />
        </div>
      </nav>

      {/* ══════════════════════════════════════════════
          MOBILE MENU DRAWER (right side)
      ══════════════════════════════════════════════ */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={() => setMenuOpen(false)} />
          <div
            className="absolute top-0 right-0 bottom-0 w-72 bg-surface shadow-2xl flex flex-col"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            {/* User profile */}
            <div className="flex items-center gap-3 px-5 py-5 border-b border-border" style={{ paddingTop: "max(1.25rem, env(safe-area-inset-top))" }}>
              {session ? (
                <>
                  <div className="w-11 h-11 rounded-full overflow-hidden shrink-0 bg-primary/10 flex items-center justify-center border border-border/50">
                    {session.user?.image ? (
                      <Image src={session.user.image} alt={session.user.name ?? ""} width={44} height={44} className="object-cover" />
                    ) : (
                      <span className="text-primary font-bold text-sm">{(session.user?.name ?? "?")[0]}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate text-sm">{session.user?.name}</p>
                    <p className="text-xs text-muted truncate">{session.user?.email}</p>
                  </div>
                </>
              ) : (
                <Link href="/login" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 flex-1">
                  <div className="w-11 h-11 rounded-full bg-background border border-border flex items-center justify-center shrink-0">
                    <IconPerson size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">로그인</p>
                    <p className="text-xs text-muted">계정으로 로그인하세요</p>
                  </div>
                </Link>
              )}
              <button onClick={() => setMenuOpen(false)} aria-label="메뉴 닫기" className="shrink-0 w-8 h-8 flex items-center justify-center rounded-xl hover:bg-background text-muted text-lg transition-colors ml-auto">
                <span aria-hidden="true">×</span>
              </button>
            </div>

            {/* Nav links */}
            <div className="flex-1 overflow-y-auto p-3 space-y-0.5">
              <DrawerItem icon={<IconMapPin size={18} />} label="공약지도" href="/" onClick={() => setMenuOpen(false)} />
              <DrawerItem icon={<IconBulb size={18} />} label="민원 & 제안" href="/proposals" onClick={() => setMenuOpen(false)} />
              <DrawerItem icon={<IconClipboard size={18} />} label="공약 목록" href="/pledges" onClick={() => setMenuOpen(false)} />
              <DrawerItem icon={<IconUsers size={18} />} label="후보자 소개" href="/about" onClick={() => setMenuOpen(false)} />
              {session && (
                <>
                  <div className="my-2 h-px bg-border" />
                  <DrawerItem icon={<IconDashboard size={18} />} label="대시보드" href="/dashboard" onClick={() => setMenuOpen(false)} />
                </>
              )}

              {/* District selector */}
              {districts.length > 0 && (
                <>
                  <div className="my-2 h-px bg-border" />
                  <DrawerItem
                    icon={<IconLocation size={18} />}
                    label={selectedDistrict ? `지역: ${selectedDistrict}` : "지역 선택 (전체)"}
                    onClick={() => { setMenuOpen(false); setMobileDistrictOpen(true); }}
                  />
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-border space-y-0.5">
              {/* Font size */}
              <div className="flex items-center gap-3 px-3 py-2.5">
                <span className="w-8 h-8 rounded-xl bg-background flex items-center justify-center text-base shrink-0" aria-hidden="true">🔤</span>
                <span className="text-sm font-medium text-foreground flex-1">글씨 크기</span>
                <FontSizeCompact />
              </div>

              {/* Election D-Day */}
              <div className="flex items-center gap-3 px-3 py-2.5">
                <span className="w-8 h-8 rounded-xl bg-background flex items-center justify-center text-base shrink-0" aria-hidden="true">🗳️</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">2026 지방선거</p>
                </div>
                <DDayBadge />
              </div>

              {/* Theme toggle */}
              <button
                onClick={() => { handleThemeToggle(); setMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-background transition-colors text-left"
              >
                <span className="w-8 h-8 rounded-xl bg-background flex items-center justify-center text-base shrink-0">{isCute ? "🏛️" : "✨"}</span>
                <span className="text-sm font-medium text-foreground">{isCute ? "일반 모드로 전환" : "귀여운 모드로 전환"}</span>
              </button>

              {/* Logout (only shown when logged in — login link is in header) */}
              {session && (
                <button
                  onClick={() => { signOut(); setMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-background transition-colors text-left"
                >
                  <span className="w-8 h-8 rounded-xl bg-background flex items-center justify-center text-sm shrink-0">🚪</span>
                  <span className="text-sm font-medium text-muted">로그아웃</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── First-visit onboarding (regular theme only) ─────────────────────── */}
      {!isCute && <OnboardingModal />}

      {/* ─── Pledge pin hint tooltip (first visit) ─────────────────────────── */}
      <PledgePinTooltip />
    </div>
  );
}
