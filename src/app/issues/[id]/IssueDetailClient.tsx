"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import Card from "@/components/ui/Card";

const IssueLocationMap = dynamic(() => import("./IssueLocationMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 bg-surface rounded-xl border border-border flex items-center justify-center">
      <span className="text-muted text-sm">지도를 불러오는 중...</span>
    </div>
  ),
});

interface LinkedPost {
  id: string;
  title: string;
  content: string;
  authorName: string;
  postType: string;
  createdAt: string;
  latitude: number | null;
  longitude: number | null;
  dong: string | null;
  adminStatus: string | null;
}

interface RelatedPledge {
  id: string;
  title: string;
  candidateName: string;
  district: string;
  category?: string;
  candidateId?: string;
}

interface IssueDetail {
  id: string;
  title: string;
  summary: string | null;
  category: string | null;
  dong: string | null;
  city: string | null;
  emoji: string | null;
  reportCount: number;
  status: string;
  adminStatus: string | null;
  createdAt: string;
  posts: LinkedPost[];
  relatedPledges?: RelatedPledge[];
  stats: {
    totalPostCount: number;
    cityBreakdown: Record<string, number>;
    dongBreakdown: Record<string, number>;
  };
}

interface CandidatePledge {
  id: string;
  title: string;
  category?: string;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  교통: { bg: "bg-blue-100", text: "text-blue-700" },
  안전: { bg: "bg-red-100", text: "text-red-700" },
  교육: { bg: "bg-purple-100", text: "text-purple-700" },
  복지: { bg: "bg-green-100", text: "text-green-700" },
  경제: { bg: "bg-yellow-100", text: "text-yellow-800" },
  환경: { bg: "bg-emerald-100", text: "text-emerald-700" },
  문화: { bg: "bg-pink-100", text: "text-pink-700" },
  기타: { bg: "bg-gray-100", text: "text-gray-600" },
};

const SUGGESTED_EMOJIS = [
  "🏙️","🛣️","🚦","🚌","🏗️","🌳","🏞️","💧","🌊","🔥",
  "🏫","🏥","🏛️","🏘️","🏚️","🚧","🗑️","💡","🔧","📢",
  "👶","👴","♿","🤝","🌿","♻️","🐾","🎭","🎨","🏆",
  "⚡","🌱","🌾","🐟","🎶","⚽","📚","🧹","🔑","🗺️",
];

function formatDate(dateString: string): string {
  const d = new Date(dateString);
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
}

function PostCard({ post }: { post: LinkedPost }) {
  const isReport = post.postType === "민원";
  return (
    <Link href={`/proposals/${post.id}`}>
      <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer group">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${isReport ? "bg-red-50 text-red-700 border border-red-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
            {isReport ? "📢 불편 제보" : "💡 공약 제안"}
          </span>
          {post.dong && <span className="text-[10px] text-muted">📍 {post.dong}</span>}
          <span className="text-[10px] text-muted ml-auto">{formatDate(post.createdAt)}</span>
        </div>
        <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1 mb-1">
          {post.title}
        </h3>
        <p className="text-xs text-muted line-clamp-2">{post.content}</p>
        <p className="text-[10px] text-muted mt-2">{post.authorName}</p>
      </Card>
    </Link>
  );
}

// ─── Emoji Picker ─────────────────────────────────────────────────────────────
function EmojiPicker({
  currentEmoji,
  onSelect,
  onClose,
}: {
  currentEmoji: string | null;
  onSelect: (emoji: string) => void;
  onClose: () => void;
}) {
  const [custom, setCustom] = useState(currentEmoji ?? "");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute z-30 top-full left-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-border p-4 space-y-3"
    >
      <p className="text-xs font-bold text-foreground">이모지 선택</p>
      <div className="grid grid-cols-10 gap-1">
        {SUGGESTED_EMOJIS.map(e => (
          <button
            key={e}
            type="button"
            onClick={() => { onSelect(e); onClose(); }}
            className={`text-xl leading-none p-1 rounded-lg hover:bg-gray-100 transition-colors ${currentEmoji === e ? "bg-primary/10 ring-1 ring-primary/30" : ""}`}
          >
            {e}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={custom}
          onChange={e => setCustom(e.target.value)}
          placeholder="직접 입력…"
          maxLength={4}
          className="flex-1 text-sm px-3 py-1.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <button
          type="button"
          onClick={() => { if (custom.trim()) { onSelect(custom.trim()); onClose(); } }}
          className="px-3 py-1.5 text-xs font-bold text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
        >
          적용
        </button>
      </div>
    </div>
  );
}

// ─── Pledge Selection Modal ───────────────────────────────────────────────────
function PledgeSelectModal({
  issueId,
  candidateId,
  isAdmin,
  existingPledgeIds,
  onAdded,
  onClose,
}: {
  issueId: string;
  candidateId?: string;
  isAdmin: boolean;
  existingPledgeIds: string[];
  onAdded: (pledge: RelatedPledge) => void;
  onClose: () => void;
}) {
  const [pledges, setPledges] = useState<CandidatePledge[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!candidateId) return;
    fetch(`/api/pledges?candidateId=${candidateId}&limit=100`)
      .then(r => r.json())
      .then(json => {
        const mapped: CandidatePledge[] = (json.data ?? []).map((p: { id: string; title: string; category?: { name?: string } | null }) => ({
          id: p.id,
          title: p.title,
          category: p.category?.name,
        }));
        setPledges(mapped);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [candidateId]);

  const handleAdd = async (pledge: CandidatePledge) => {
    setAdding(pledge.id);
    setError("");
    try {
      const res = await fetch(`/api/issues/${issueId}/pledges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pledgeId: pledge.id }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "공약 추가에 실패했습니다"); return; }
      onAdded({
        id: pledge.id,
        title: pledge.title,
        candidateName: "",
        district: "",
        category: pledge.category,
        candidateId,
      });
    } catch {
      setError("네트워크 오류가 발생했습니다");
    } finally {
      setAdding(null);
    }
  };

  const available = pledges.filter(p => !existingPledgeIds.includes(p.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">공약 이슈에 등록</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground text-xs">✕ 닫기</button>
        </div>
        <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-6">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : available.length === 0 ? (
            <p className="text-sm text-muted text-center py-4">
              {pledges.length === 0 ? "등록된 공약이 없습니다." : "이미 모든 공약이 등록됐습니다."}
            </p>
          ) : (
            available.map(pledge => (
              <div key={pledge.id} className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{pledge.title}</p>
                  {pledge.category && <p className="text-xs text-muted">{pledge.category}</p>}
                </div>
                <button
                  onClick={() => handleAdd(pledge)}
                  disabled={adding === pledge.id}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 shrink-0 flex items-center gap-1"
                >
                  {adding === pledge.id ? (
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : "추가"}
                </button>
              </div>
            ))
          )}
          {error && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function IssueDetailClient({ issueId }: { issueId: string }) {
  const { data: session } = useSession();
  const user = session?.user as { id?: string; role?: string } | undefined;
  const isCandidate = user?.role === "candidate";
  const isAdmin = user?.role === "admin";
  const canEdit = isCandidate || isAdmin;

  const [issue, setIssue] = useState<IssueDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [activePostTab, setActivePostTab] = useState<"all" | "민원" | "제안">("all");

  const POSTS_PER_PAGE = 10;
  const [postsPage, setPostsPage] = useState(1);

  // Emoji state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiUpdating, setEmojiUpdating] = useState(false);

  // Pledge state
  const [pledges, setPledges] = useState<RelatedPledge[]>([]);
  const [showPledgeModal, setShowPledgeModal] = useState(false);
  const [removingPledgeId, setRemovingPledgeId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchIssue() {
      try {
        const res = await fetch(`/api/issues/${issueId}`);
        if (!res.ok) { setError(true); return; }
        const json = await res.json();
        setIssue(json.data);
        setPledges(json.data.relatedPledges ?? []);
      } catch { setError(true); }
      finally { setLoading(false); }
    }
    fetchIssue();
  }, [issueId]);

  const handleEmojiSelect = async (emoji: string) => {
    if (!issue) return;
    setEmojiUpdating(true);
    try {
      const res = await fetch(`/api/issues/${issueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
      if (res.ok) {
        setIssue(prev => prev ? { ...prev, emoji } : prev);
      }
    } catch {}
    finally { setEmojiUpdating(false); }
  };

  const handlePledgeRemove = async (pledgeId: string) => {
    setRemovingPledgeId(pledgeId);
    try {
      await fetch(`/api/issues/${issueId}/pledges?pledgeId=${pledgeId}`, { method: "DELETE" });
      setPledges(prev => prev.filter(p => p.id !== pledgeId));
    } catch {}
    finally { setRemovingPledgeId(null); }
  };

  const handlePledgeAdded = (pledge: RelatedPledge) => {
    setPledges(prev => [...prev, pledge]);
    setShowPledgeModal(false);
  };

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error || !issue) return (
    <div className="text-center py-16">
      <p className="text-lg font-semibold text-foreground mb-2">이슈를 찾을 수 없습니다</p>
      <Link href="/issues" className="text-primary hover:underline text-sm">이슈 목록으로 돌아가기</Link>
    </div>
  );

  const categoryColor = CATEGORY_COLORS[issue.category ?? "기타"] ?? CATEGORY_COLORS["기타"];
  const location = [issue.city, issue.dong].filter(Boolean).join(" ");
  const postsWithLocation = issue.posts.filter(p => p.latitude != null && p.longitude != null);

  const minwonPosts = issue.posts.filter(p => p.postType === "민원");
  const proposalPosts = issue.posts.filter(p => p.postType !== "민원");

  const displayedPosts = activePostTab === "all"
    ? issue.posts
    : activePostTab === "민원"
    ? minwonPosts
    : proposalPosts;

  const pagedPosts = displayedPosts.slice((postsPage - 1) * POSTS_PER_PAGE, postsPage * POSTS_PER_PAGE);
  const totalPages = Math.ceil(displayedPosts.length / POSTS_PER_PAGE);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back link */}
      <Link href="/proposals" className="inline-flex items-center gap-1 text-sm text-muted hover:text-primary transition-colors mb-8">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        제보/이슈로 돌아가기
      </Link>

      {/* ── Notion-style header ───────────────────────────────────────────── */}
      <div className="mb-6">
        {/* Emoji display + picker trigger */}
        <div className="relative inline-block mb-3">
          <button
            type="button"
            onClick={() => canEdit && setShowEmojiPicker(v => !v)}
            title={canEdit ? "이모지 변경" : undefined}
            className={`text-6xl leading-none select-none transition-transform ${
              canEdit
                ? "cursor-pointer hover:scale-110 active:scale-95"
                : "cursor-default"
            } ${emojiUpdating ? "opacity-50" : ""}`}
          >
            {issue.emoji ?? (canEdit ? "➕" : "📋")}
          </button>
          {canEdit && !issue.emoji && (
            <span className="absolute -bottom-4 left-0 text-[10px] text-muted whitespace-nowrap">
              이모지 추가
            </span>
          )}
          {showEmojiPicker && (
            <EmojiPicker
              currentEmoji={issue.emoji}
              onSelect={handleEmojiSelect}
              onClose={() => setShowEmojiPicker(false)}
            />
          )}
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight mt-6 mb-3">
          {issue.title}
        </h1>

        {/* Meta pills */}
        <div className="flex flex-wrap items-center gap-2">
          {issue.category && (
            <span className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full ${categoryColor.bg} ${categoryColor.text}`}>
              {issue.category}
            </span>
          )}
          {location && <span className="text-sm text-muted">📍 {location}</span>}
          <span className="text-sm font-semibold text-orange-500">🔥 {issue.reportCount}명 제보</span>
          {proposalPosts.length > 0 && (
            <span className="text-sm font-semibold text-amber-600">💡 {proposalPosts.length}건 제안</span>
          )}
        </div>
      </div>

      {/* Summary */}
      {issue.summary && (
        <Card className="p-5 mb-5">
          <h2 className="text-sm font-bold text-foreground mb-2">이슈 요약</h2>
          <p className="text-sm text-muted leading-relaxed whitespace-pre-wrap">{issue.summary}</p>
        </Card>
      )}

      {/* ── 천안 버스 이슈에만 노출되는 특별 캠페인 배너 ─────────────── */}
      {issue.id === "c3583196-0fcc-46ff-ae73-648baa260a2a" && (
        <Link
          href="/campaigns/cheonan-bus-questionnaire"
          className="block mb-5 rounded-2xl p-5 md:p-6 bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg hover:shadow-xl transition-shadow"
        >
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest opacity-90 mb-1">
                📢 공개질의서 · 손승범 천안시의원 후보
              </p>
              <p className="text-lg md:text-2xl font-black leading-tight mb-1">
                천안 버스 정상화 공동 약속 공개질의서
              </p>
              <p className="text-xs md:text-sm opacity-95 leading-snug">
                각 당 천안시장 후보들에게 보낸 4대 핵심 과제 — 인포그래픽·영상·원본 PDF 보기
              </p>
            </div>
            <span className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 bg-white text-orange-600 text-sm font-bold rounded-xl whitespace-nowrap">
              보러가기 →
            </span>
          </div>
        </Link>
      )}

      {/* Post breakdown pills */}
      <Card className="p-4 mb-5">
        <div className="flex gap-2 flex-wrap">
          {minwonPosts.length > 0 && (
            <span className="text-xs px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full font-medium">📢 불편 제보 {minwonPosts.length}건</span>
          )}
          {proposalPosts.length > 0 && (
            <span className="text-xs px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full font-medium">💡 공약 제안 {proposalPosts.length}건</span>
          )}
          <span className="text-xs px-2.5 py-1 bg-gray-50 text-gray-600 border border-gray-200 rounded-full font-medium">총 {issue.posts.length}건</span>
        </div>
      </Card>

      {/* ── 이슈 공약 (explicitly registered) ───────────────────────────── */}
      <Card className="p-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
            🏛️ 이슈 공약
            {pledges.length > 0 && (
              <span className="text-xs font-normal text-muted">({pledges.length}건)</span>
            )}
          </h2>
          {canEdit && (
            <button
              onClick={() => setShowPledgeModal(true)}
              className="text-xs font-bold text-white bg-primary hover:bg-primary/90 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1"
            >
              <span>+</span>
              {isAdmin ? "공약 추가" : "내 공약 추가"}
            </button>
          )}
        </div>

        {pledges.length === 0 ? (
          <p className="text-xs text-muted text-center py-3">
            {canEdit
              ? "아직 등록된 공약이 없습니다. 이 이슈와 관련된 공약을 추가해주세요."
              : "아직 등록된 공약이 없습니다."}
          </p>
        ) : (
          <div className="space-y-2">
            {pledges.map(pledge => {
              const canRemove = isAdmin || (isCandidate && pledge.candidateId === user?.id);
              return (
                <div key={pledge.id} className="flex items-center gap-2 p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 transition-colors group">
                  <Link href={`/pledge/${pledge.id}`} className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">{pledge.title}</p>
                    <p className="text-xs text-muted">
                      {pledge.candidateName && `${pledge.candidateName} · `}{pledge.district}
                      {pledge.category && ` · ${pledge.category}`}
                    </p>
                  </Link>
                  {canRemove && (
                    <button
                      onClick={() => handlePledgeRemove(pledge.id)}
                      disabled={removingPledgeId === pledge.id}
                      title="공약 연결 해제"
                      className="shrink-0 text-muted hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-50 disabled:opacity-40"
                    >
                      {removingPledgeId === pledge.id ? (
                        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin block" />
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      )}
                    </button>
                  )}
                  <Link href={`/pledge/${pledge.id}`} className="shrink-0">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-muted">
                      <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Collapsible location map */}
      {postsWithLocation.length > 0 && (
        <div className="mb-5 rounded-2xl border border-border overflow-hidden bg-surface">
          <button
            onClick={() => setShowMap(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-background transition-colors text-sm font-semibold text-foreground"
            aria-expanded={showMap}
          >
            <div className="flex items-center gap-2">
              <span>📍 제보 위치</span>
              <span className="text-xs text-muted font-normal">{postsWithLocation.length}건</span>
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
              <IssueLocationMap markers={postsWithLocation.map(p => ({ lat: p.latitude!, lng: p.longitude!, title: p.title }))} />
            </div>
          )}
        </div>
      )}

      {/* Linked posts with tab filter */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-foreground">관련 게시물 ({issue.posts.length}건)</h2>
          {minwonPosts.length > 0 && proposalPosts.length > 0 && (
            <div className="flex gap-1 bg-background border border-border rounded-lg p-0.5">
              {(["all", "민원", "제안"] as const).map(t => (
                <button key={t} onClick={() => { setActivePostTab(t); setPostsPage(1); }}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                    activePostTab === t
                      ? t === "민원" ? "bg-red-500 text-white" : t === "제안" ? "bg-amber-400 text-gray-900" : "bg-primary text-white"
                      : "text-muted hover:text-foreground"
                  }`}>
                  {t === "all" ? "전체" : t === "민원" ? `📢 제보(${minwonPosts.length})` : `💡 제안(${proposalPosts.length})`}
                </button>
              ))}
            </div>
          )}
        </div>

        {displayedPosts.length === 0 ? (
          <p className="text-sm text-muted">연결된 게시물이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {pagedPosts.map(post => <PostCard key={post.id} post={post} />)}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <button
              onClick={() => setPostsPage(p => Math.max(1, p - 1))}
              disabled={postsPage === 1}
              className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg text-muted hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← 이전
            </button>
            <span className="text-xs text-muted font-medium">
              {postsPage} / {totalPages}
            </span>
            <button
              onClick={() => setPostsPage(p => Math.min(totalPages, p + 1))}
              disabled={postsPage === totalPages}
              className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg text-muted hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              다음 →
            </button>
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="text-center py-6">
        <Link href={`/proposals?issueId=${issue.id}`}
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-sm">
          🔥 나도 이 문제!
        </Link>
        <p className="text-xs text-muted mt-2">같은 문제를 겪고 계신다면, 제보를 남겨주세요</p>
      </div>

      {/* Pledge select modal */}
      {showPledgeModal && (
        <PledgeSelectModal
          issueId={issue.id}
          candidateId={user?.id}
          isAdmin={isAdmin}
          existingPledgeIds={pledges.map(p => p.id)}
          onAdded={handlePledgeAdded}
          onClose={() => setShowPledgeModal(false)}
        />
      )}
    </div>
  );
}
