"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import ProposalList from "@/components/proposals/ProposalList";
import ProposalForm from "@/components/proposals/ProposalForm";
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

export default function ProposalBoardClient({ candidates, districts }: Props) {
  const searchParams = useSearchParams();
  // Pre-select city and postType from URL query params (e.g. from map empty-state CTA)
  const [selectedCity, setSelectedCity] = useState<string>(searchParams.get("city") ?? "");
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>("");
  const [rankingRefreshKey, setRankingRefreshKey] = useState(0);
  const [showForm, setShowForm] = useState(!!searchParams.get("city"));
  const [postTypeFilter, setPostTypeFilter] = useState<"all" | "제안" | "민원">(
    (searchParams.get("type") as "민원" | "제안" | null) ?? "all"
  );
  const [mapPosts, setMapPosts] = useState<MapPost[]>([]);
  const [minwonCount, setMinwonCount] = useState<number | null>(null);
  const [proposalCount, setProposalCount] = useState<number | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { isCute } = useTheme();
  const { data: session } = useSession();
  const isCandidate = (session?.user as { role?: string })?.role === "candidate";
  const candidateName = (session?.user as { name?: string })?.name ?? undefined;

  const handleRankingSelect = (id: string) => {
    setHighlightedId(id);
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

  const filteredCandidates = selectedCity
    ? candidates.filter((c) => c.district === selectedCity || c.district.startsWith(selectedCity))
    : candidates;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">
            {isCute && <span className="mr-2">🌼</span>}불편 제보 & 공약 제안
          </h1>
          <p className="text-sm text-muted leading-relaxed">
            우리 동네 불편을 제보하거나 후보자에게 공약을 제안하세요.{" "}
            <span className="text-primary font-semibold">로그인 없이도 글을 쓸 수 있어요.</span>
          </p>
          {(minwonCount !== null || proposalCount !== null) && (
            <p className="text-xs text-muted mt-1">
              지금까지{" "}
              <span className="text-red-500 font-semibold">{minwonCount ?? 0}개의 불편 제보</span>
              와{" "}
              <span className="text-yellow-600 font-semibold">{proposalCount ?? 0}개의 공약 제안</span>
              이 쌓였습니다.
            </p>
          )}
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

      {/* Map section */}
      <div className="mb-6 rounded-2xl overflow-hidden border border-border shadow-sm" style={{ height: 380 }}>
        {/* Legend */}
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

      {/* Rankings - 2 columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <ProposalRanking postType="제안" refreshKey={rankingRefreshKey} onSelect={handleRankingSelect} />
        <ProposalRanking postType="민원" refreshKey={rankingRefreshKey} onSelect={handleRankingSelect} />
      </div>

      {/* Filters + list */}
      <div className="space-y-4">
        {/* Filters row */}
        <div className="flex flex-wrap items-center gap-3">
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

          {/* City filter */}
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
