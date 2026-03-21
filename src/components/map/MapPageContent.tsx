"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import NaverMap from "@/components/map/NaverMap";
import type { ProposalMapItem } from "@/components/map/NaverMap";
import PledgePanel from "@/components/map/PledgePanel";
import BylawPanel from "@/components/map/BylawPanel";
import CandidatePopup from "@/components/map/CandidatePopup";
import { useMapStore } from "@/store/useMapStore";
import { useUITexts } from "@/hooks/useUITexts";
import { useTheme } from "@/contexts/ThemeContext";
import type { Pledge, BylawGroup } from "@/types";
import { findDistrictCity, CHUNGNAM_DISTRICTS } from "@/lib/districts";
import UserProfileButton from "@/components/layout/UserProfileButton";
import OnboardingModal from "@/components/ui/OnboardingModal";
import PledgePinTooltip from "@/components/ui/PledgePinTooltip";
import MobileMenuDrawer, { DrawerItem } from "@/components/layout/MobileMenuDrawer";

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

function FontSizeCompact({ horizontal = false }: { horizontal?: boolean }) {
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
  if (horizontal) {
    return (
      <div className="flex gap-1" title="글씨 크기">
        <button onClick={() => apply(scale - 0.1)} disabled={scale <= 0.8} className="w-10 h-9 flex items-center justify-center text-xs font-bold text-muted hover:bg-background rounded-lg disabled:opacity-30 transition-colors border border-border" aria-label="글자 크기 줄이기">A-</button>
        <button onClick={() => apply(scale + 0.1)} disabled={scale >= 1.3} className="w-10 h-9 flex items-center justify-center text-xs font-semibold text-muted hover:bg-background rounded-lg disabled:opacity-30 transition-colors border border-border" aria-label="글자 크기 키우기">A+</button>
      </div>
    );
  }
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
  const cls = `flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors active:opacity-60 ${
    active ? "text-primary" : "text-muted hover:text-foreground"
  }`;
  const inner = (
    <>
      <span className="leading-none">{icon}</span>
      <span className="text-[10px] font-medium leading-none">{label}</span>
    </>
  );
  if (href) return <Link href={href} className={cls} style={{ touchAction: "manipulation" }}>{inner}</Link>;
  return <button onClick={onClick} className={cls} style={{ touchAction: "manipulation" }}>{inner}</button>;
}

// ─── Province label helper ────────────────────────────────────────────────────

const PROVINCE_PATTERNS: [RegExp, string][] = [
  [/^서울/, "서울"],
  [/^부산/, "부산"],
  [/^대구/, "대구"],
  [/^인천/, "인천"],
  [/^광주/, "광주"],
  [/^대전/, "대전"],
  [/^울산/, "울산"],
  [/^세종/, "세종"],
  [/^경기/, "경기"],
  [/^강원/, "강원"],
  [/^충북|충청북/, "충북"],
  [/^전북|전라북/, "전북"],
  [/^전남|전라남/, "전남"],
  [/^경북|경상북/, "경북"],
  [/^경남|경상남/, "경남"],
  [/^제주/, "제주"],
];

function extractProvinceLabel(district: string): string {
  for (const [pattern, name] of PROVINCE_PATTERNS) {
    if (pattern.test(district)) return name;
  }
  const firstWord = district.split(/[\s,]/)[0] ?? district;
  return firstWord.replace(/(시|도|구|군)$/, "");
}

// ─── Main Page Content ────────────────────────────────────────────────────────

export default function MapPageContent() {
  const [pledges, setPledges] = useState<Pledge[]>([]);
  const [bylawGroups, setBylawGroups] = useState<BylawGroup[]>([]);
  const [proposals, setProposals] = useState<ProposalMapItem[]>([]);
  const [selectedProposal, setSelectedProposal] = useState<ProposalMapItem | null>(null);
  const [selectedProposalGroup, setSelectedProposalGroup] = useState<ProposalMapItem[] | null>(null);
  const [candidates, setCandidates] = useState<CandidateForMap[]>([]);
  const [districts, setDistricts] = useState<DistrictCoords[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [candidatesLoaded, setCandidatesLoaded] = useState(false);
  const [emptyOverlayDismissed, setEmptyOverlayDismissed] = useState(() => {
    try { return typeof window !== "undefined" && !!localStorage.getItem("no-candidate-overlay-dismissed"); } catch { return false; }
  });
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
  const [otherProvincesOpen, setOtherProvincesOpen] = useState(false);
  const [otherProvinceCandidates, setOtherProvinceCandidates] = useState<Array<{
    id: string; name: string; district: string; province: string;
  }>>([]);
  const [otherProvincesLoading, setOtherProvincesLoading] = useState(false);
  const [sharedProposalId, setSharedProposalId] = useState<string | null>(null);
  const [layerSettingsOpen, setLayerSettingsOpen] = useState(false);
  const [showMinwon, setShowMinwon] = useState(true);
  const [showProposal, setShowProposal] = useState(true);
  const [showPledge, setShowPledge] = useState(true);
  const [darkMap, setDarkMap] = useState(false);
  const layerSettingsRef = useRef<HTMLDivElement>(null);

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

  const handleShareProposal = useCallback(async (proposal: ProposalMapItem) => {
    const url = `${window.location.origin}/proposals/${proposal.id}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try { await navigator.share({ title: proposal.title, url }); return; } catch {}
    }
    try {
      await navigator.clipboard.writeText(url);
      setSharedProposalId(proposal.id);
      setTimeout(() => setSharedProposalId(null), 2000);
    } catch {
      window.prompt("링크를 복사하세요:", url);
    }
  }, []);

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
    .filter((p) => !selectedDistrict || (p.candidate?.district ?? "").startsWith(selectedDistrict) || (p.collaborators ?? []).some((c) => (c.candidate?.district ?? "").startsWith(selectedDistrict)))
    .filter((p) => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      if (p.title.toLowerCase().includes(q)) return true;
      if ((p.candidate?.name ?? "").toLowerCase().includes(q)) return true;
      if ((p.collaborators ?? []).some((c) => (c.candidate?.name ?? "").toLowerCase().includes(q))) return true;
      // Also search body text fields
      if ((p.description ?? "").toLowerCase().includes(q)) return true;
      if ((p.background ?? "").toLowerCase().includes(q)) return true;
      if ((p.plan ?? "").toLowerCase().includes(q)) return true;
      if ((p.expectedEffect ?? "").toLowerCase().includes(q)) return true;
      return false;
    })
    .slice(0, PANEL_PLEDGES_LIMIT);

  // Filtered proposals for panel list + map markers
  const PANEL_PROPOSALS_LIMIT = 5;
  const filteredProposals = (() => {
    const q = searchQuery.trim().toLowerCase();
    let list = proposals.filter((p) => {
      if (p.postType === "민원" && !showMinwon) return false;
      if (p.postType !== "민원" && !showProposal) return false;
      return true;
    });
    if (!q) return list;
    return list.filter((p) =>
      p.title.toLowerCase().includes(q) ||
      p.content.toLowerCase().includes(q) ||
      p.authorName.toLowerCase().includes(q)
    );
  })();
  const panelProposals = filteredProposals.slice(0, PANEL_PROPOSALS_LIMIT);

  // ─── Data fetching ──────────────────────────────────────────────────────────

  useEffect(() => {
    fetch("/api/pledges?limit=500&pledgeType=bylaws")
      .then((r) => r.json())
      .then((json) => {
        const data: Pledge[] = json.data ?? [];
        // Always include all 15 충남 cities as council pins, even if they have no bylaws
        const grouped: Record<string, BylawGroup> = {};
        for (const d of CHUNGNAM_DISTRICTS) {
          grouped[d.name] = { cityName: d.name, councilLat: d.councilLat, councilLng: d.councilLng, pledges: [] };
        }
        for (const pledge of data) {
          if (!pledge.candidate) continue;
          const districtCity = findDistrictCity(pledge.candidate.district);
          if (!districtCity) continue;
          grouped[districtCity.name]!.pledges.push(pledge);
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
        const data: Array<{ id: string; title?: string; content: string; authorName: string; latitude: number | null; longitude: number | null; likeCount?: number; postType?: string; createdAt?: string; candidateId?: string | null; candidate?: { id: string; name: string } | null }> = json.data ?? json ?? [];
        const items: ProposalMapItem[] = data
          .filter((p) => p.latitude != null && p.longitude != null)
          .map((p) => ({ id: p.id, title: p.title ?? p.content.slice(0, 30), content: p.content, authorName: p.authorName, latitude: p.latitude as number, longitude: p.longitude as number, likeCount: p.likeCount ?? 0, postType: p.postType, createdAt: p.createdAt, candidateId: p.candidateId ?? null, candidateName: p.candidate?.name ?? null }));
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

  // Close layer settings on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (layerSettingsRef.current && !layerSettingsRef.current.contains(e.target as Node)) setLayerSettingsOpen(false);
    };
    if (layerSettingsOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [layerSettingsOpen]);

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
    try { localStorage.setItem("mapLastCity", district.name); } catch {}
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
    try { localStorage.setItem("mapLastCity", group.cityName); } catch {}
  }, [setSelectedBylawGroup, setCenter]);

  const handleProposalClick = useCallback((proposal: ProposalMapItem) => {
    setSelectedProposal(proposal);
    setSelectedProposalGroup(null);
    setCenter(proposal.latitude, proposal.longitude);
  }, [setCenter]);

  const handleProposalGroupClick = useCallback((items: ProposalMapItem[]) => {
    setSelectedProposalGroup(items);
    setSelectedProposal(null);
    if (items[0]) setCenter(items[0].latitude, items[0].longitude);
  }, [setCenter]);

  const handleOpenOtherProvinces = useCallback(() => {
    setOtherProvincesOpen(true);
    if (otherProvinceCandidates.length > 0) return;
    setOtherProvincesLoading(true);
    fetch("/api/candidates?limit=500&eligible=true&province=other")
      .then((r) => r.json())
      .then((json) => {
        const data: Array<{ id: string; name: string; district: string }> = json.data ?? [];
        const enriched = data.map((c) => ({
          id: c.id,
          name: c.name,
          district: c.district,
          province: extractProvinceLabel(c.district),
        }));
        setOtherProvinceCandidates(enriched);
      })
      .catch(console.error)
      .finally(() => setOtherProvincesLoading(false));
  }, [otherProvinceCandidates.length]);

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
        <RailItem icon={<IconBulb size={19} />} label="제보/제안" href="/proposals" />
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
                  ) : filteredCandidates.length === 0 && selectedDistrict ? (
                    /* 후보자 없는 지역 — 개선된 안내 */
                    <div className="px-4 py-5 text-center space-y-2">
                      <p className="text-2xl">📍</p>
                      <p className="text-sm font-semibold text-foreground">
                        아직 {selectedDistrict}에는 등록된 후보자가 없습니다.
                      </p>
                      <p className="text-xs text-muted leading-relaxed">
                        곧 업데이트 예정입니다!<br />
                        먼저 불편 제보를 남겨두시면<br />
                        향후 후보자에게 전달됩니다.
                      </p>
                      <a
                        href={`/proposals?city=${encodeURIComponent(selectedDistrict)}&type=민원`}
                        className="inline-block mt-1 px-4 py-2 text-xs font-semibold rounded-lg text-white transition-colors"
                        style={{ backgroundColor: primaryColor }}
                      >
                        📢 {selectedDistrict} 불편 제보하기
                      </a>
                    </div>
                  ) : (
                    <p className="px-4 py-4 text-xs text-muted text-center">공약이 없습니다</p>
                  )
                ) : (
                  <div className="divide-y divide-border/40">
                    {panelPledges.map((p) => {
                      const collabs = (p.collaborators ?? []).filter((c) => c.candidate);
                      const isShared = collabs.length > 0;
                      return (
                        <button
                          key={p.id}
                          onClick={() => handlePledgeClick(p)}
                          className="w-full flex items-start gap-3 px-4 py-3 hover:bg-background/70 transition-colors text-left"
                        >
                          <span className="text-base shrink-0 mt-0.5 leading-none">{p.category?.emoji || "📌"}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground line-clamp-2 leading-snug">{p.title}</p>
                            <p className="text-[11px] text-muted mt-0.5">
                              {p.candidate?.name}
                              {isShared && (
                                <span className="ml-1 text-primary font-medium">
                                  외 {collabs.length}명 공동
                                </span>
                              )}
                            </p>
                          </div>
                        </button>
                      );
                    })}
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
                  <div className="flex flex-col items-center justify-center py-6 text-muted px-4 text-center">
                    <IconPerson size={28} />
                    {searchQuery ? (
                      <p className="text-xs mt-2">검색 결과 없음</p>
                    ) : selectedDistrict ? (
                      <>
                        <p className="text-xs mt-2 font-medium text-foreground">
                          아직 {selectedDistrict}에 등록된 후보자가 없습니다
                        </p>
                        <p className="text-xs mt-1 text-muted">곧 업데이트 예정!</p>
                      </>
                    ) : (
                      <p className="text-xs mt-2">등록된 후보자 없음</p>
                    )}
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

                {/* ─ Proposals section — shown when search is active ─ */}
                {searchQuery.trim() && (
                  <>
                    <div className="px-4 pt-4 pb-1 flex items-center justify-between sticky top-0 bg-surface/95 backdrop-blur-sm z-10 border-t border-border/50 mt-1">
                      <span className="text-[10px] font-bold text-muted uppercase tracking-widest">불편 제보 / 공약 제안</span>
                      <a href="/proposals" className="text-[10px] font-semibold hover:underline" style={{ color: primaryColor }}>전체 보기</a>
                    </div>
                    {panelProposals.length === 0 ? (
                      <p className="px-4 py-3 text-xs text-muted text-center">검색 결과 없음</p>
                    ) : (
                      <div className="divide-y divide-border/40">
                        {panelProposals.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => handleProposalClick(p)}
                            className="w-full flex items-start gap-3 px-4 py-3 hover:bg-background/70 transition-colors text-left"
                          >
                            <span className="text-base shrink-0 mt-0.5 leading-none">{p.postType === "민원" ? "📢" : "💡"}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground line-clamp-2 leading-snug">{p.title}</p>
                              <p className="text-[11px] text-muted mt-0.5">
                                <span className={`font-semibold ${p.postType === "민원" ? "text-red-600" : "text-yellow-700"}`}>
                                  {p.postType === "민원" ? "불편 제보" : "공약 제안"}
                                </span>
                                {" · "}{p.authorName}
                                {(p.likeCount ?? 0) > 0 && ` · ♥${p.likeCount}`}
                              </p>
                            </div>
                          </button>
                        ))}
                        {filteredProposals.length > PANEL_PROPOSALS_LIMIT && (
                          <a
                            href="/proposals"
                            className="flex items-center justify-center gap-1 py-3 text-xs font-semibold hover:bg-primary/5 transition-colors border-t border-border/30"
                            style={{ color: primaryColor }}
                          >
                            {filteredProposals.length - PANEL_PROPOSALS_LIMIT}건 더 보기 →
                          </a>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* CTA — 민원/제안 유도 */}
                <div className="mx-3 mb-3 mt-2 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 p-3">
                  <p className="text-[11px] font-bold text-foreground mb-0.5">혹시 집 앞 문제가 있나요?</p>
                  <p className="text-[10px] text-muted mb-2 leading-relaxed">불편을 제보하거나 공약을 제안해보세요.</p>
                  <Link
                    href="/proposals"
                    className="flex items-center justify-center gap-1.5 w-full py-2 bg-primary text-white text-[11px] font-bold rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    ✍️ 불편 제보 / 공약 제안하기
                  </Link>
                </div>

                <div className="h-4" />
              </div>

              {/* Panel copyright footer */}
              <div className="shrink-0 border-t border-border/30 px-4 py-3 bg-surface">
                <p className="text-[9px] text-muted/50 leading-relaxed">
                  © 2026. 개혁신당 제9회 전국동시지방선거<br />
                  천안시 다선거구 천안시의원 후보 손승범<br />
                  모든 권리 보유
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          MAP AREA
      ══════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* ─── Mobile Top Header (normal flow, not overlapping map) ─────────── */}
        <div className="md:hidden shrink-0 bg-surface/95 backdrop-blur-sm border-b border-border/20 z-20">
          {/* Row 1: Integrated search + theme button */}
          <div className="flex items-center gap-2.5 px-3 pt-2.5 pb-1.5">
            {/* Search input with integrated logo */}
            <div className={`flex-1 min-w-0 flex items-center gap-2.5 bg-white/92 backdrop-blur-sm rounded-2xl border border-border/30 px-3 py-2.5 shadow-sm focus-within:border-primary/50 transition-colors`}>
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
        <div className="flex-1 relative min-w-0 overflow-hidden min-h-0" style={darkMap ? { filter: "invert(0.93) hue-rotate(180deg) saturate(0.9)" } : undefined}>

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
            proposals={filteredProposals}
            onProposalClick={handleProposalClick}
            onProposalGroupClick={handleProposalGroupClick}
            isCute={isCute}
            selectedCategory={selectedCategory}
            selectedPledgeId={selectedPledge?.id ?? null}
            selectedProposalId={selectedProposal?.id ?? null}
            resizeTrigger={mapResizeTrigger}
            showPledges={showPledge}
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
                <div className="px-3 py-2 border-t border-border/40">
                  <button
                    onClick={() => { setDistrictDropdownOpen(false); handleOpenOtherProvinces(); }}
                    className="text-xs text-muted border border-border rounded-lg px-2 py-1 hover:border-primary/40 hover:text-primary transition-colors w-full text-center"
                  >
                    타 시·도 보기
                  </button>
                </div>
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

          {/* Layer settings button + panel */}
          <div ref={layerSettingsRef} className="relative">
            <button
              onClick={() => setLayerSettingsOpen((o) => !o)}
              className={`flex items-center gap-2 px-3.5 py-2.5 bg-white/97 backdrop-blur-sm rounded-xl border shadow-md text-sm font-semibold transition-colors ${
                layerSettingsOpen || !showMinwon || !showProposal || !showPledge || darkMap
                  ? "border-primary/50 text-primary bg-primary/5"
                  : "border-border/50 text-foreground hover:bg-white"
              }`}
            >
              <span>🗂️</span>
              <span>지도설정</span>
            </button>
            {layerSettingsOpen && (
              <div className="absolute top-full left-0 mt-1.5 bg-white/98 border border-border rounded-2xl shadow-2xl overflow-hidden min-w-[220px] z-50">
                <div className="px-4 py-3 border-b border-border/50">
                  <p className="text-xs font-bold text-foreground">핀 표시 설정</p>
                </div>
                <div className="p-3 space-y-1">
                  {[
                    { key: "minwon", label: "불편 제보", emoji: "📢", color: "#EF4444", value: showMinwon, set: setShowMinwon },
                    { key: "proposal", label: "공약 제안", emoji: "💡", color: "#FACC15", value: showProposal, set: setShowProposal },
                    { key: "pledge", label: "정식 공약", emoji: "📌", color: "#FF5A00", value: showPledge, set: setShowPledge },
                  ].map(({ key, label, emoji, color, value, set }) => (
                    <button
                      key={key}
                      onClick={() => set((v) => !v)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${value ? "bg-background" : "opacity-50 bg-background/50"}`}
                    >
                      <span
                        className="w-5 h-5 rounded-full border-2 border-white shadow-sm shrink-0"
                        style={{ backgroundColor: value ? color : "#9CA3AF" }}
                      />
                      <span className="text-base">{emoji}</span>
                      <span className={`flex-1 text-left font-medium ${value ? "text-foreground" : "text-muted"}`}>{label}</span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${value ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {value ? "ON" : "OFF"}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="px-4 py-3 border-t border-border/50 space-y-1">
                  <p className="text-xs font-bold text-foreground mb-2">지도 스타일</p>
                  <button
                    onClick={() => setDarkMap((v) => !v)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${darkMap ? "bg-gray-900 text-white" : "bg-background text-foreground"}`}
                  >
                    <span className="text-base">{darkMap ? "🌙" : "☀️"}</span>
                    <span className="flex-1 text-left font-medium">{darkMap ? "다크 모드" : "라이트 모드"}</span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${darkMap ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>
                      {darkMap ? "ON" : "OFF"}
                    </span>
                  </button>
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
                  <div className="py-10 text-center text-muted px-6 space-y-2">
                    <IconPerson size={36} />
                    {selectedDistrict ? (
                      <>
                        <p className="text-sm font-semibold text-foreground mt-3">
                          아직 {selectedDistrict}에는 등록된 후보자가 없습니다.
                        </p>
                        <p className="text-xs leading-relaxed">
                          곧 업데이트 예정입니다!<br />
                          먼저 불편 제보를 남겨두시면 향후 후보자에게 전달됩니다.
                        </p>
                        <a
                          href={`/proposals?city=${encodeURIComponent(selectedDistrict)}&type=민원`}
                          className="inline-block mt-2 px-4 py-2 text-xs font-semibold rounded-lg text-white transition-colors"
                          style={{ backgroundColor: primaryColor }}
                        >
                          📢 불편 제보하기
                        </a>
                      </>
                    ) : (
                      <p className="text-sm mt-3">등록된 후보자가 없습니다</p>
                    )}
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
              <div className="px-5 py-4">
                <button
                  onClick={() => { setMobileDistrictOpen(false); handleOpenOtherProvinces(); }}
                  className="text-xs text-muted border border-border rounded-lg px-3 py-2 hover:border-primary/40 hover:text-primary transition-colors w-full text-center"
                >
                  타 시·도 보기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Other Provinces Modal ──────────────────────────────────────── */}
        {otherProvincesOpen && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={() => setOtherProvincesOpen(false)}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
            <div
              className="relative w-full md:max-w-lg bg-surface rounded-t-3xl md:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
              style={{ maxHeight: "80dvh", paddingBottom: "env(safe-area-inset-bottom)" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
                <div>
                  <h2 className="font-bold text-foreground text-lg">전국 다른 지역 후보자</h2>
                  <p className="text-xs text-muted mt-0.5">충남 외 지역 등록 후보자</p>
                </div>
                <button
                  onClick={() => setOtherProvincesOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-background text-muted text-xl leading-none"
                  aria-label="닫기"
                >
                  ×
                </button>
              </div>
              {/* Body */}
              <div className="flex-1 overflow-y-auto">
                {otherProvincesLoading ? (
                  <div className="py-14 flex flex-col items-center text-muted">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-3" />
                    <p className="text-sm">불러오는 중...</p>
                  </div>
                ) : otherProvinceCandidates.length === 0 ? (
                  <div className="py-14 text-center text-muted">
                    <p className="text-3xl mb-3">🗺️</p>
                    <p className="text-sm font-medium">등록된 타 지역 후보자가 없습니다</p>
                  </div>
                ) : (() => {
                  // Group by province
                  const groups: Record<string, typeof otherProvinceCandidates> = {};
                  for (const c of otherProvinceCandidates) {
                    if (!groups[c.province]) groups[c.province] = [];
                    groups[c.province]!.push(c);
                  }
                  return Object.entries(groups).map(([province, list]) => (
                    <div key={province}>
                      <div className="px-5 pt-4 pb-1 sticky top-0 bg-surface/95 backdrop-blur-sm z-10">
                        <span className="text-[10px] font-bold text-muted uppercase tracking-widest">{province}</span>
                      </div>
                      {list.map((c) => (
                        <Link
                          key={c.id}
                          href={`/candidates/${c.id}`}
                          onClick={() => setOtherProvincesOpen(false)}
                          className="flex items-start gap-3 px-5 py-3 hover:bg-background/60 transition-colors border-b border-border/20 last:border-b-0"
                        >
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-border/50 mt-0.5">
                            <span className="text-primary font-bold text-xs">{c.name[0]}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground leading-tight">{c.name}</p>
                            <p className="text-xs text-muted truncate mt-0.5">{c.district}</p>
                          </div>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted shrink-0 mt-1">
                            <path d="M9 18l6-6-6-6" />
                          </svg>
                        </Link>
                      ))}
                    </div>
                  ));
                })()}
              </div>
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
              <button onClick={() => { setEmptyOverlayDismissed(true); try { localStorage.setItem("no-candidate-overlay-dismissed", "1"); } catch {} }} className="block w-full mt-2 text-xs text-muted hover:text-foreground transition-colors">
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
            <div
              className="bg-white/98 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden"
              style={{ border: `1.5px solid ${selectedProposal.postType === "민원" ? "#FCA5A5" : "#FDE68A"}` }}
            >
              {/* Header */}
              <div className="flex items-start gap-2 px-4 pt-4 pb-2">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                  style={{ backgroundColor: selectedProposal.postType === "민원" ? "#FEE2E2" : "#FEF9C3" }}
                >
                  <span className="text-base">{selectedProposal.postType === "민원" ? "📢" : "💡"}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className="text-xs font-bold"
                      style={{ color: selectedProposal.postType === "민원" ? "#EF4444" : "#B45309" }}
                    >
                      {selectedProposal.postType === "민원" ? "불편 제보" : "공약 제안"}
                    </span>
                    {selectedProposal.candidateId && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        후보자 작성
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-foreground truncate leading-snug mt-0.5">{selectedProposal.title}</p>
                  <p className="text-[11px] text-muted mt-0.5">
                    {selectedProposal.authorName} · ♥ {selectedProposal.likeCount}
                    {selectedProposal.createdAt && ` · ${new Date(selectedProposal.createdAt).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })}`}
                  </p>
                </div>
                <button onClick={() => setSelectedProposal(null)} className="shrink-0 text-muted hover:text-foreground text-xl leading-none mt-0.5" aria-label="닫기">×</button>
              </div>
              {/* Content + like */}
              <div className="px-4 pb-3 flex items-start justify-between gap-3">
                <p className="text-xs text-foreground line-clamp-2 leading-relaxed flex-1">{selectedProposal.content}</p>
                <span
                  className="shrink-0 flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border whitespace-nowrap"
                  style={{
                    color: selectedProposal.postType === "민원" ? "#EF4444" : "#B45309",
                    borderColor: selectedProposal.postType === "민원" ? "#FCA5A5" : "#FDE68A",
                    backgroundColor: selectedProposal.postType === "민원" ? "#FEF2F2" : "#FEFCE8",
                  }}
                >
                  ♡ 좋아요 {selectedProposal.likeCount}
                </span>
              </div>
              {/* Footer: share + direct link */}
              <div className="px-4 pb-4 flex gap-2">
                <button
                  onClick={() => handleShareProposal(selectedProposal)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-colors bg-background text-muted hover:text-foreground border-border"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
                  </svg>
                  {sharedProposalId === selectedProposal.id ? "복사됨!" : "공유"}
                </button>
                <a
                  href={`/proposals/${selectedProposal.id}`}
                  className="flex-1 block text-center py-2 text-xs font-semibold rounded-xl transition-colors"
                  style={{
                    color: selectedProposal.postType === "민원" ? "#EF4444" : "#B45309",
                    backgroundColor: selectedProposal.postType === "민원" ? "#FEF2F2" : "#FEFCE8",
                  }}
                >
                  게시글 바로 보기 →
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Proposal group list popup */}
        {selectedProposalGroup && selectedProposalGroup.length > 0 && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 w-[min(92%,420px)] md:bottom-4">
            <div className="bg-white/98 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden border border-border">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div>
                  <p className="text-sm font-bold text-foreground">
                    📍 {selectedProposalGroup[0]?.postType === "민원" ? "불편 제보" : "공약 제안"} 목록
                  </p>
                  <p className="text-xs text-muted mt-0.5">총 {selectedProposalGroup.length}건</p>
                </div>
                <button
                  onClick={() => setSelectedProposalGroup(null)}
                  className="text-muted hover:text-foreground text-xl leading-none"
                  aria-label="닫기"
                >×</button>
              </div>
              {/* List */}
              <div className="max-h-60 overflow-y-auto divide-y divide-border/50">
                {selectedProposalGroup.map((item) => (
                  <a
                    key={item.id}
                    href={`/proposals/${item.id}`}
                    className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors block"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: item.postType === "민원" ? "#EF4444" : "#B45309" }}
                      >
                        {item.postType === "민원" ? "불편" : "제안"}
                      </span>
                      <span className="flex-1 text-sm font-medium text-foreground truncate">{item.title}</span>
                      <span className="shrink-0 text-xs text-muted">♥{item.likeCount}</span>
                    </div>
                    <p className="text-xs text-muted mt-0.5 truncate">{item.authorName}</p>
                  </a>
                ))}
              </div>
              <div className="px-4 py-3 border-t border-border">
                <a href="/proposals" className="block w-full text-center py-2 text-xs font-semibold rounded-xl bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors">
                  전체 게시판 보기 →
                </a>
              </div>
            </div>
          </div>
        )}
        </div>{/* end map canvas wrapper */}

        {/* Mobile: 하단 nav 리본이 지도 위에 겹치지 않도록 공간 확보 */}
        <div
          className="md:hidden shrink-0"
          style={{ height: "calc(3.5rem + env(safe-area-inset-bottom))" }}
          aria-hidden="true"
        />
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
          <BottomNavItem icon={<IconBulb size={20} />} label="제보/제안" href="/proposals" />
          <BottomNavItem icon={<IconClipboard size={20} />} label="공약" href="/pledges" />
          <BottomNavItem icon={<IconUsers size={20} />} label="소개" href="/about" />
          <BottomNavItem icon={<IconMenu size={20} />} label="더보기" onClick={() => setMenuOpen(true)} />
        </div>
      </nav>

      {/* ══════════════════════════════════════════════
          MOBILE MENU DRAWER (shared component)
      ══════════════════════════════════════════════ */}
      <MobileMenuDrawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        extraNavItems={
          districts.length > 0 ? (
            <>
              <div className="my-2 h-px bg-border" />
              <DrawerItem
                icon={<IconLocation size={18} />}
                label={selectedDistrict ? `지역: ${selectedDistrict}` : "지역 선택 (전체)"}
                onClick={() => { setMenuOpen(false); setMobileDistrictOpen(true); }}
              />
            </>
          ) : undefined
        }
      />

      {/* ─── First-visit onboarding (regular theme only) ─────────────────────── */}
      {!isCute && <OnboardingModal />}

      {/* ─── Pledge pin hint tooltip (first visit) ─────────────────────────── */}
      <PledgePinTooltip />
    </div>
  );
}
