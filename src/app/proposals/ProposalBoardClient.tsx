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

interface CandidateOption {
  id: string;
  name: string;
  district: string;
}

interface DistrictOption {
  name: string;
}

interface Props {
  candidates: CandidateOption[];
  districts: DistrictOption[];
}

interface MapPost {
  id: string;
  title: string;
  content: string;
  authorName: string;
  postType: string;
  latitude: number;
  longitude: number;
  likeCount?: number;
  createdAt: string;
}

interface Issue {
  id: string;
  title: string;
  summary: string | null;
  category: string | null;
  dong: string | null;
  city: string | null;
  reportCount: number;
  status: string;
  adminStatus: string | null;
  createdAt: string;
}

interface IssueStats {
  totalIssues: number;
  totalReports: number;
}

const CITY_FILTERS = [
  "전체", "천안시", "공주시", "보령시", "아산시", "서산시", "논산시",
  "계룡시", "당진시", "금산군", "부여군", "서천군", "청양군", "홍성군", "예산군", "태안군",
];

export default function ProposalBoardClient({ candidates, districts }: Props) {
  const searchParams = useSearchParams();
  const [selectedCity, setSelectedCity] = useState<string>(searchParams.get("city") ?? "");
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>("");
  const [rankingRefreshKey, setRankingRefreshKey] = useState(0);
  const [showForm, setShowForm] = useState(!!searchParams.get("city") || !!searchParams.get("issueId"));
  const [postTypeFilter, setPostTypeFilter] = useState<"all" | "제안" | "민원">(
    (searchParams.get("type") as "민원" | "제안" | null) ?? "all"
  );
  const [mapPosts, setMapPosts] = useState<MapPost[]>([]);
  const [minwonCount, setMinwonCount] = useState<number | null>(null);
  const [proposalCount, setProposalCount] = useState<number | null>(null);
  const [todayMinwonCount, setTodayMinwonCount] = useState<number | null>(null);
  const [todayProposalCount, setTodayProposalCount] = useState<number | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { isCute } = useTheme();
  const { data: session } = useSession();
  const isCandidate = (session?.user as { role?: string })?.role === "candidate";
  const candidateName = (session?.user as { name?: string })?.name ?? undefined;

  // View mode: issue-centered vs proposal list
  const [viewMode, setViewMode] = useState<"issues" | "posts">("issues");

  // Issues state
  const [issues, setIssues] = useState<Issue[]>([]);
  const [issuesLoading, setIssuesLoading] = useState(true);
  const [issueStats, setIssueStats] = useState<IssueStats>({ totalIssues: 0, totalReports: 0 });
  const [issueCityFilter, setIssueCityFilter] = useState("전체");

  const handleRankingSelect = (id: string) => {
    setHighlightedId(id);
    setViewMode("posts");
    listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Fetch counts for minwon / proposal
  useEffect(() => {
    fetch("/api/proposals?limit=1&postType=민원")
      .then((r) => r.json())
      .then((json) => { if (typeof json.total === "number") setMinwonCount(json.total); })
      .catch(() => {});
    fetch("/api/proposals?limit=1&postType=제안")
      .then((r) => r.json())
      .then((json) => { if (typeof json.total === "number") setProposalCount(json.total); })
      .catch(() => {});
    const today = new Date().toISOString().split("T")[0];
    fetch(`/api/proposals?limit=1&postType=민원&since=${today}T00:00:00.000Z`)
      .then((r) => r.json())
      .then((json) => { if (typeof json.total === "number") setTodayMinwonCount(json.total); })
      .catch(() => {});
    fetch(`/api/proposals?limit=1&postType=제안&since=${today}T00:00:00.000Z`)
      .then((r) => r.json())
      .then((json) => { if (typeof json.total === "number") setTodayProposalCount(json.total); })
      .catch(() => {});
  }, [rankingRefreshKey]);

  // Fetch posts with location for the map
  useEffect(() => {
    fetch("/api/proposals?limit=500&hasLocation=true")
      .then((r) => r.json())
      .then((json) => {
        const data = (json.data ?? []) as Array<{
          id: string; title: string; content: string; authorName: string;
          postType?: string; latitude: number | null; longitude: number | null;
          likeCount?: number; createdAt: string;
        }>;
        setMapPosts(
          data
            .filter((p) => p.latitude != null && p.longitude != null)
            .map((p) => ({
              id: p.id,
              title: p.title,
              content: p.content,
              authorName: p.authorName,
              postType: p.postType ?? "제안",
              latitude: p.latitude as number,
              longitude: p.longitude as number,
              likeCount: p.likeCount,
              createdAt: p.createdAt,
            }))
        );
      })
      .catch(() => {});
  }, [rankingRefreshKey]);

  // Fetch issues
  useEffect(() => {
    async function fetchIssues() {
      setIssuesLoading(true);
      try {
        const params = new URLSearchParams();
        if (issueCityFilter !== "전체") params.set("city", issueCityFilter);
        params.set("limit", "100");
        const res = await fetch(`/api/issues?${params.toString()}`);
        if (res.ok) {
          const json = await res.json();
          setIssues(json.data ?? []);
        }
      } catch {
        // silent
      } finally {
        setIssuesLoading(false);
      }
    }
    fetchIssues();
  }, [issueCityFilter]);

  // Fetch issue stats
  useEffect(() => {
    fetch("/api/issues/stats")
      .then((r) => r.json())
      .then((json) => {
        setIssueStats({
          totalIssues: json.totalIssues ?? 0,
          totalReports: json.totalReports ?? 0,
        });
      })
      .catch(() => {});
  }, []);

  const filteredCandidates = selectedCity
    ? candidates.filter((c) => c.district === selectedCity || c.district.startsWith(selectedCity))
    : candidates;

  const hotIssues = issues.filter((i) => i.reportCount >= 5);
  const regularIssues = issues.filter((i) => i.reportCount < 5);

  // Only show cities that have at least one issue
  const citiesWithIssues = new Set(issues.map((i) => i.city).filter(Boolean));
  const visibleCityFilters = CITY_FILTERS.filter(
    (city) => city === "전체" || citiesWithIssues.has(city)
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">
            {isCute && <span className="mr-2">🌼</span>}지역 이슈 & 제보/제안
          </h1>
          <p className="text-sm text-muted leading-relaxed">
            우리 동네 이슈를 확인하고, 불편을 제보하거나 공약을 제안하세요.{" "}
            <span className="text-primary font-semibold">로그인 없이도 글을 쓸 수 있어요.</span>
          </p>

          {/* Stats bar */}
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
              <span className="text-xs font-bold text-primary">{issueStats.totalIssues}</span>
              <span className="text-[10px] text-muted">이슈</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 border border-red-200">
              <span className="text-xs font-bold text-red-600">{issueStats.totalReports}</span>
              <span className="text-[10px] text-muted">총 제보</span>
            </div>
            {(minwonCount !== null || proposalCount !== null) && (
              <>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 border border-red-200">
                  <span className="text-xs font-bold text-red-500">{minwonCount ?? 0}</span>
                  <span className="text-[10px] text-muted">불편 제보</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-50 border border-yellow-200">
                  <span className="text-xs font-bold text-yellow-600">{proposalCount ?? 0}</span>
                  <span className="text-[10px] text-muted">공약 제안</span>
                </div>
              </>
            )}
            {(todayMinwonCount !== null || todayProposalCount !== null) && (todayMinwonCount ?? 0) + (todayProposalCount ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-50 border border-green-200 text-green-700 font-semibold text-[10px]">
                오늘 +{(todayMinwonCount ?? 0) + (todayProposalCount ?? 0)}
              </span>
            )}
            <Link href="/issues/stats" className="text-[10px] text-primary hover:underline ml-auto">
              현황판 보기 →
            </Link>
          </div>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
        >
          {showForm ? "✕ 닫기" : "✍️ 글 작성하기"}
        </button>
      </div>

      {/* Write form */}
      {showForm && (
        <div className="mb-6">
          <ProposalForm
            candidateId={selectedCandidateId || undefined}
            city={selectedCity || undefined}
            onSuccess={() => {
              setShowForm(false);
              setRankingRefreshKey((k) => k + 1);
            }}
          />
        </div>
      )}

      {/* View mode toggle + City filter */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-1 bg-background rounded-xl p-1 border border-border">
          <button
            onClick={() => setViewMode("issues")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              viewMode === "issues" ? "bg-primary text-white" : "text-muted hover:text-foreground"
            }`}
          >
            이슈 중심
          </button>
          <button
            onClick={() => setViewMode("posts")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              viewMode === "posts" ? "bg-primary text-white" : "text-muted hover:text-foreground"
            }`}
          >
            게시물 보기
          </button>
        </div>

        {viewMode === "posts" && (
          <>
            {/* Post type tabs */}
            <div className="flex items-center gap-1 bg-background rounded-xl p-1 border border-border">
              {(["all", "제안", "민원"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setPostTypeFilter(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    postTypeFilter === t
                      ? t === "민원" ? "bg-red-500 text-white" : t === "제안" ? "bg-yellow-400 text-gray-900" : "bg-primary text-white"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {t === "all" ? "전체" : t === "제안" ? "💡 공약 제안" : "📢 불편 제보"}
                </button>
              ))}
            </div>

            {/* City filter (dropdown) */}
            <select
              value={selectedCity}
              onChange={(e) => { setSelectedCity(e.target.value); setSelectedCandidateId(""); }}
              className="px-3 py-2 text-xs border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors"
            >
              <option value="">전체 지역</option>
              {districts.map((d) => <option key={d.name} value={d.name}>{d.name}</option>)}
            </select>

            {/* Candidate filter */}
            <select
              value={selectedCandidateId}
              onChange={(e) => setSelectedCandidateId(e.target.value)}
              className="px-3 py-2 text-xs border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors"
            >
              <option value="">전체 후보자</option>
              {filteredCandidates.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.district})</option>)}
            </select>

            {(selectedCity || selectedCandidateId) && (
              <button
                onClick={() => { setSelectedCity(""); setSelectedCandidateId(""); }}
                className="px-3 py-2 text-xs text-muted hover:text-foreground border border-border rounded-lg hover:bg-background transition-colors"
              >
                초기화
              </button>
            )}
          </>
        )}
      </div>

      {viewMode === "issues" ? (
        /* ── Issue-centered view ─────────────────────────────────── */
        <div className="space-y-6">
          {/* City filter tabs */}
          <div className="overflow-x-auto">
            <div className="flex gap-2 pb-2 min-w-max">
              {visibleCityFilters.map((city) => (
                <button
                  key={city}
                  onClick={() => setIssueCityFilter(city)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    issueCityFilter === city
                      ? "bg-primary text-white"
                      : "bg-surface text-muted border border-border hover:bg-primary-light hover:text-primary"
                  }`}
                >
                  {city}
                </button>
              ))}
            </div>
          </div>

          {issuesLoading ? (
            <div className="flex justify-center py-16">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : issues.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted text-lg">등록된 이슈가 없습니다</p>
              <p className="text-muted text-sm mt-1">
                {issueCityFilter !== "전체"
                  ? `${issueCityFilter} 지역에 등록된 이슈가 아직 없습니다.`
                  : "아직 등록된 이슈가 없습니다."}
              </p>
            </div>
          ) : (
            <>
              {/* Hot issues */}
              {hotIssues.length > 0 && (
                <div>
                  <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
                    🔥 주요 이슈
                    <span className="text-xs font-normal text-muted">제보 5건 이상</span>
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {hotIssues.map((issue) => (
                      <IssueCard key={issue.id} issue={issue} />
                    ))}
                  </div>
                </div>
              )}

              {/* All issues */}
              <div>
                <h2 className="text-base font-bold text-foreground mb-3">
                  📋 {issueCityFilter !== "전체" ? `${issueCityFilter} ` : ""}전체 이슈 ({issues.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(hotIssues.length > 0 ? regularIssues : issues).map((issue) => (
                    <IssueCard key={issue.id} issue={issue} />
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Map section */}
          <div className="rounded-2xl overflow-hidden border border-border shadow-sm" style={{ height: 380 }}>
            <div className="flex items-center gap-4 px-4 py-2 bg-white/95 border-b border-border text-xs font-medium">
              <span className="font-semibold text-foreground">📍 지도</span>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: "#FACC15" }} />
                <span className="text-muted">공약 제안</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: "#EF4444" }} />
                <span className="text-muted">불편 제보</span>
              </div>
              <span className="text-muted ml-auto">{mapPosts.length}개 게시물</span>
            </div>
            <div style={{ height: "calc(380px - 40px)" }}>
              <ProposalMapEmbed items={mapPosts} />
            </div>
          </div>

          {/* Rankings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ProposalRanking postType="제안" refreshKey={rankingRefreshKey} onSelect={handleRankingSelect} />
            <ProposalRanking postType="민원" refreshKey={rankingRefreshKey} onSelect={handleRankingSelect} />
          </div>
        </div>
      ) : (
        /* ── Post list view ──────────────────────────────────────── */
        <div className="space-y-4">
          {/* Map section */}
          <div className="rounded-2xl overflow-hidden border border-border shadow-sm" style={{ height: 380 }}>
            <div className="flex items-center gap-4 px-4 py-2 bg-white/95 border-b border-border text-xs font-medium">
              <span className="font-semibold text-foreground">📍 지도</span>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: "#FACC15" }} />
                <span className="text-muted">공약 제안</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: "#EF4444" }} />
                <span className="text-muted">불편 제보</span>
              </div>
              <span className="text-muted ml-auto">{mapPosts.length}개 게시물</span>
            </div>
            <div style={{ height: "calc(380px - 40px)" }}>
              <ProposalMapEmbed items={mapPosts} />
            </div>
          </div>

          {/* Rankings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ProposalRanking postType="제안" refreshKey={rankingRefreshKey} onSelect={handleRankingSelect} />
            <ProposalRanking postType="민원" refreshKey={rankingRefreshKey} onSelect={handleRankingSelect} />
          </div>

          {/* Post list */}
          <div ref={listRef}>
            {selectedCity ? (
              <div className="space-y-4">
                <h2 className="text-base font-bold text-foreground">
                  📍 {selectedCity} 전체 불편 제보 &amp; 공약 제안
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-red-600 mb-2">📢 불편 제보</h3>
                    <ProposalList
                      candidateId={selectedCandidateId || undefined}
                      city={selectedCity}
                      postType="민원"
                      showForm={false}
                      onRankingRefresh={() => setRankingRefreshKey((k) => k + 1)}
                      isCandidate={isCandidate}
                      candidateName={candidateName}
                      highlightedId={highlightedId ?? undefined}
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-yellow-600 mb-2">💡 공약 제안</h3>
                    <ProposalList
                      candidateId={selectedCandidateId || undefined}
                      city={selectedCity}
                      postType="제안"
                      showForm={false}
                      onRankingRefresh={() => setRankingRefreshKey((k) => k + 1)}
                      isCandidate={isCandidate}
                      candidateName={candidateName}
                      highlightedId={highlightedId ?? undefined}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <ProposalList
                candidateId={selectedCandidateId || undefined}
                city={selectedCity || undefined}
                postType={postTypeFilter === "all" ? undefined : postTypeFilter}
                showForm={false}
                onRankingRefresh={() => setRankingRefreshKey((k) => k + 1)}
                isCandidate={isCandidate}
                candidateName={candidateName}
                highlightedId={highlightedId ?? undefined}
              />
            )}
          </div>
        </div>
      )}

      {/* Fixed floating write button — bottom-left */}
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
