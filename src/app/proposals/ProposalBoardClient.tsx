"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import ProposalList from "@/components/proposals/ProposalList";
import ProposalForm from "@/components/proposals/ProposalForm";
import IssueCard from "@/components/issues/IssueCard";
import { useTheme } from "@/contexts/ThemeContext";

const ProposalRanking = dynamic(() => import("@/components/proposals/ProposalRanking"), { ssr: false });
const ProposalMapEmbed = dynamic(() => import("@/components/proposals/ProposalMapEmbed"), { ssr: false });

interface CandidateOption { id: string; name: string; district: string }
interface DistrictOption { name: string }
interface Props { candidates: CandidateOption[]; districts: DistrictOption[] }

interface MapPost {
  id: string; title: string; content: string; authorName: string;
  postType: string; latitude: number; longitude: number;
  likeCount?: number; createdAt: string;
}

interface Issue {
  id: string; title: string; summary: string | null;
  category: string | null; dong: string | null; city: string | null;
  reportCount: number; proposalCount?: number;
  status: string; adminStatus: string | null; createdAt: string;
}

interface IssueStats { totalIssues: number; totalReports: number }

const CITY_FILTERS = [
  "전체", "천안시", "공주시", "보령시", "아산시", "서산시", "논산시",
  "계룡시", "당진시", "금산군", "부여군", "서천군", "청양군", "홍성군", "예산군", "태안군",
];

export default function ProposalBoardClient({ candidates, districts }: Props) {
  const searchParams = useSearchParams();
  const { isCute } = useTheme();
  const { data: session } = useSession();
  const isCandidate = (session?.user as { role?: string })?.role === "candidate";
  const candidateName = (session?.user as { name?: string })?.name ?? undefined;

  // Tab: 0=이슈 1=불편제보 2=공약제안
  const [activeTab, setActiveTab] = useState<0 | 1 | 2>(() => {
    const t = searchParams.get("type");
    if (t === "report") return 1;
    if (t === "proposal") return 2;
    return 0;
  });
  // Map collapsed by default
  const [showMap, setShowMap] = useState(false);
  // Write form
  const [showForm, setShowForm] = useState(
    !!searchParams.get("city") || !!searchParams.get("issueId")
  );

  const [selectedCity, setSelectedCity] = useState(searchParams.get("city") ?? "");
  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const [rankingRefreshKey, setRankingRefreshKey] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const [minwonCount, setMinwonCount] = useState<number | null>(null);
  const [proposalCount, setProposalCount] = useState<number | null>(null);
  const [todayMinwonCount, setTodayMinwonCount] = useState<number | null>(null);
  const [todayProposalCount, setTodayProposalCount] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const [mapPosts, setMapPosts] = useState<MapPost[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [issuesLoading, setIssuesLoading] = useState(true);
  const [issueStats, setIssueStats] = useState<IssueStats>({ totalIssues: 0, totalReports: 0 });
  const [issueCityFilter, setIssueCityFilter] = useState("전체");

  // ── Data fetching ─────────────────────────────────────────────────────────
  useEffect(() => {
    // Use local midnight (KST) for today's count
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todaySince = todayStart.toISOString();
    fetch("/api/proposals?limit=1&postType=민원").then(r => r.json()).then(j => { if (typeof j.total === "number") setMinwonCount(j.total); }).catch(() => {});
    fetch("/api/proposals?limit=1&postType=제안").then(r => r.json()).then(j => { if (typeof j.total === "number") setProposalCount(j.total); }).catch(() => {});
    fetch(`/api/proposals?limit=1&postType=민원&since=${todaySince}`).then(r => r.json()).then(j => { if (typeof j.total === "number") setTodayMinwonCount(j.total); }).catch(() => {});
    fetch(`/api/proposals?limit=1&postType=제안&since=${todaySince}`).then(r => r.json()).then(j => { if (typeof j.total === "number") setTodayProposalCount(j.total); }).catch(() => {});
  }, [rankingRefreshKey]);

  useEffect(() => {
    fetch("/api/proposals?limit=500&hasLocation=true")
      .then(r => r.json())
      .then(json => {
        type P = { id: string; title: string; content: string; authorName: string; postType?: string; latitude: number | null; longitude: number | null; likeCount?: number; createdAt: string };
        const data = (json.data ?? []) as P[];
        setMapPosts(data.filter(p => p.latitude != null && p.longitude != null).map(p => ({ id: p.id, title: p.title, content: p.content, authorName: p.authorName, postType: p.postType ?? "제안", latitude: p.latitude as number, longitude: p.longitude as number, likeCount: p.likeCount, createdAt: p.createdAt })));
      }).catch(() => {});
  }, [rankingRefreshKey]);

  useEffect(() => {
    setIssuesLoading(true);
    const params = new URLSearchParams();
    if (issueCityFilter !== "전체") params.set("city", issueCityFilter);
    params.set("limit", "100");
    fetch(`/api/issues?${params.toString()}`).then(r => r.json()).then(j => setIssues(j.data ?? [])).catch(() => {}).finally(() => setIssuesLoading(false));
  }, [issueCityFilter]);

  useEffect(() => {
    fetch("/api/issues/stats").then(r => r.json()).then(j => setIssueStats({ totalIssues: j.totalIssues ?? 0, totalReports: j.totalReports ?? 0 })).catch(() => {});
  }, []);

  // ── Derived ───────────────────────────────────────────────────────────────
  const filteredCandidates = selectedCity ? candidates.filter(c => c.district === selectedCity || c.district.startsWith(selectedCity)) : candidates;
  const hotIssues = issues.filter(i => i.reportCount >= 5);
  const regularIssues = issues.filter(i => i.reportCount < 5);
  const citiesWithIssues = new Set(issues.map(i => i.city).filter(Boolean));
  const visibleCityFilters = CITY_FILTERS.filter(city => city === "전체" || citiesWithIssues.has(city));

  // ── Column renderers ──────────────────────────────────────────────────────
  const renderIssueColumn = () => (
    <div className="space-y-4">
      {/* Column header */}
      <div className="flex items-center gap-2 py-2 border-b border-border">
        <span className="font-black text-primary text-sm">📋 이슈</span>
        <span className="text-xs text-muted bg-background border border-border rounded-full px-2 py-0.5">{issueStats.totalIssues}개</span>
        <Link href="/issues/stats" className="text-[10px] text-primary font-semibold hover:underline ml-auto">현황판 →</Link>
      </div>

      {/* City tabs */}
      <div className="overflow-x-auto scrollbar-none">
        <div className="flex gap-1.5 pb-1 min-w-max">
          {visibleCityFilters.map(city => (
            <button key={city} onClick={() => setIssueCityFilter(city)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${issueCityFilter === city ? "bg-primary text-white" : "bg-surface text-muted border border-border hover:bg-primary-light hover:text-primary"}`}
            >{city}</button>
          ))}
        </div>
      </div>

      {issuesLoading ? (
        <div className="flex justify-center py-10"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : issues.length === 0 ? (
        <p className="text-center text-muted text-sm py-10">등록된 이슈가 없습니다</p>
      ) : (
        <div className="space-y-5">
          {hotIssues.length > 0 && (
            <div>
              <p className="text-xs font-bold text-orange-500 mb-2">🔥 주요 이슈</p>
              <div className="space-y-2">{hotIssues.map(issue => <IssueCard key={issue.id} issue={issue} />)}</div>
            </div>
          )}
          <div>
            {hotIssues.length > 0 && <p className="text-xs font-bold text-muted mb-2">📋 전체 이슈 ({issues.length})</p>}
            <div className="space-y-2">{(hotIssues.length > 0 ? regularIssues : issues).map(issue => <IssueCard key={issue.id} issue={issue} />)}</div>
          </div>
        </div>
      )}
    </div>
  );

  const renderReportColumn = () => (
    <div className="space-y-4" ref={listRef}>
      {/* Column header */}
      <div className="flex items-center gap-2 py-2 border-b border-border">
        <span className="font-black text-red-500 text-sm">📢 불편제보</span>
        {minwonCount !== null && <span className="text-xs text-muted bg-background border border-border rounded-full px-2 py-0.5">{minwonCount}건</span>}
        {(todayMinwonCount ?? 0) > 0 && <span className="text-[10px] text-green-600 font-semibold">오늘 +{todayMinwonCount}</span>}
        {/* City filter */}
        <div className="ml-auto flex items-center gap-1">
          <select value={selectedCity} onChange={e => { setSelectedCity(e.target.value); setSelectedCandidateId(""); }}
            className="px-2 py-1 text-xs border border-border rounded-lg bg-surface text-foreground focus:outline-none">
            <option value="">전체</option>
            {districts.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
          </select>
          {selectedCity && <button onClick={() => { setSelectedCity(""); setSelectedCandidateId(""); }} className="text-xs text-muted hover:text-foreground">✕</button>}
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={() => { setShowForm(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-colors shadow-sm"
      >
        📢 나도 불편 제보하기
      </button>
      <ProposalRanking postType="민원" refreshKey={rankingRefreshKey} onSelect={() => { setActiveTab(1); listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }} />
      <ProposalList candidateId={selectedCandidateId || undefined} city={selectedCity || undefined} postType="민원" showForm={false} onRankingRefresh={() => setRankingRefreshKey(k => k + 1)} isCandidate={isCandidate} candidateName={candidateName} search={search || undefined} />
    </div>
  );

  const renderProposalColumn = () => (
    <div className="space-y-4">
      {/* Column header */}
      <div className="flex items-center gap-2 py-2 border-b border-border">
        <span className="font-black text-amber-500 text-sm">💡 공약제안</span>
        {proposalCount !== null && <span className="text-xs text-muted bg-background border border-border rounded-full px-2 py-0.5">{proposalCount}건</span>}
        {(todayProposalCount ?? 0) > 0 && <span className="text-[10px] text-green-600 font-semibold">오늘 +{todayProposalCount}</span>}
        {/* Candidate filter */}
        <div className="ml-auto">
          <select value={selectedCandidateId} onChange={e => setSelectedCandidateId(e.target.value)}
            className="px-2 py-1 text-xs border border-border rounded-lg bg-surface text-foreground focus:outline-none">
            <option value="">전체 후보</option>
            {filteredCandidates.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={() => { setShowForm(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-gray-900 text-sm font-bold transition-colors shadow-sm"
      >
        💡 나도 제안하기
      </button>
      <ProposalRanking postType="제안" refreshKey={rankingRefreshKey} onSelect={() => { setActiveTab(2); }} />
      <ProposalList candidateId={selectedCandidateId || undefined} city={selectedCity || undefined} postType="제안" showForm={false} onRankingRefresh={() => setRankingRefreshKey(k => k + 1)} isCandidate={isCandidate} candidateName={candidateName} search={search || undefined} />
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground mb-1">
            {isCute && <span className="mr-2">🌼</span>}지역 이슈 & 제보/제안
          </h1>
          <p className="text-sm text-muted leading-relaxed hidden sm:block">
            우리 동네 이슈를 확인하고, 불편을 제보하거나 공약을 제안하세요.{" "}
            <span className="text-primary font-semibold">로그인 없이도 글을 쓸 수 있어요.</span>
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary">{issueStats.totalIssues} 이슈</span>
            <span className="px-2 py-0.5 rounded-full bg-red-50 border border-red-200 text-xs font-bold text-red-600">{minwonCount ?? 0} 제보</span>
            <span className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-xs font-bold text-amber-600">{proposalCount ?? 0} 제안</span>
            {(todayMinwonCount ?? 0) + (todayProposalCount ?? 0) > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-green-50 border border-green-200 text-green-700 font-semibold text-[10px]">
                오늘 +{(todayMinwonCount ?? 0) + (todayProposalCount ?? 0)}
              </span>
            )}
            <Link href="/issues/stats" className="text-[10px] text-primary font-semibold hover:underline">
              📊 현황판 →
            </Link>
            <Link href="/proposals/responses" className="text-[10px] text-green-600 font-semibold hover:underline">
              💬 후보자 답변 모아보기 →
            </Link>
          </div>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
        >
          {showForm ? "✕ 닫기" : "✍️ 글 작성하기"}
        </button>
      </div>

      {/* Write form */}
      {showForm && (
        <div className="mb-5">
          <ProposalForm
            candidateId={selectedCandidateId || undefined}
            city={selectedCity || undefined}
            onSuccess={() => { setShowForm(false); setRankingRefreshKey(k => k + 1); }}
          />
        </div>
      )}

      {/* ── Collapsible map (제보위치, 접이식) ── */}
      <div className="mb-5 rounded-2xl border border-border overflow-hidden bg-surface">
        <button
          onClick={() => setShowMap(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-background transition-colors text-sm font-semibold text-foreground"
          aria-expanded={showMap}
        >
          <div className="flex items-center gap-2">
            <span>📍</span>
            <span>제보/제안 위치 지도</span>
            {mapPosts.length > 0 && <span className="text-xs text-muted font-normal">{mapPosts.length}건</span>}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted">
            <span>{showMap ? "접기" : "펼치기"}</span>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
              className={`transition-transform duration-200 ${showMap ? "rotate-180" : ""}`}>
              <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </button>

        {showMap && (
          <div className="border-t border-border">
            <div className="flex items-center gap-4 px-4 py-1.5 bg-white/95 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: "#FACC15" }} />
                <span className="text-muted">공약 제안</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: "#EF4444" }} />
                <span className="text-muted">불편 제보</span>
              </div>
              <span className="text-muted ml-auto">{mapPosts.length}개</span>
            </div>
            <div style={{ height: 320 }}>
              <ProposalMapEmbed items={mapPosts} />
            </div>
          </div>
        )}
      </div>

      {/* ── Search bar ── */}
      <div className="mb-4">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="제보/제안 검색..."
            className="w-full pl-8 pr-8 py-2 text-sm border border-border rounded-xl bg-surface text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground" aria-label="검색 초기화">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          )}
        </div>
      </div>

      {/* ── Mobile: 3-tab bar ── */}
      <div className="lg:hidden mb-4">
        <div className="grid grid-cols-3 gap-0 border border-border rounded-xl overflow-hidden">
          {([
            { id: 0 as const, label: "이슈", icon: "📋" },
            { id: 1 as const, label: "불편제보", icon: "📢" },
            { id: 2 as const, label: "공약제안", icon: "💡" },
          ]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-0.5 py-2.5 text-xs font-bold transition-colors border-r last:border-r-0 border-border ${
                activeTab === tab.id ? "bg-primary text-white" : "bg-surface text-muted hover:bg-background"
              }`}
            >
              <span className="text-base leading-none">{tab.icon}</span>
              <span className="text-[11px] leading-tight">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Desktop: 3-column grid (hidden on mobile) ── */}
      <div className="hidden lg:grid lg:grid-cols-3 lg:gap-5 lg:items-start">
        <div>{renderIssueColumn()}</div>
        <div>{renderReportColumn()}</div>
        <div>{renderProposalColumn()}</div>
      </div>

      {/* ── Mobile: single active tab ── */}
      <div className="lg:hidden">
        {activeTab === 0 && renderIssueColumn()}
        {activeTab === 1 && renderReportColumn()}
        {activeTab === 2 && renderProposalColumn()}
      </div>

      {/* Floating write button */}
      <button
        onClick={() => { setShowForm(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}
        className="fixed left-4 bottom-20 md:bottom-6 z-40 flex items-center gap-2 px-4 py-3 bg-primary text-white text-sm font-bold rounded-2xl shadow-lg hover:bg-primary/90 active:scale-95 transition-all"
        aria-label="불편 제보·공약 제안 글 작성하기"
      >
        ✍️ <span>글 작성하기</span>
      </button>
    </div>
  );
}
