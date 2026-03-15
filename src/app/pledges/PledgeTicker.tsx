"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { QRCodeCanvas } from "qrcode.react";
import PledgeLocationMap from "@/components/map/PledgeLocationMap";

export interface PledgeTile {
  id: string;
  title: string;
  description: string;
  budget: string | null;
  youtubeUrl: string | null;
  pledgeType: "map" | "bylaws";
  /** True when a map pledge is also tagged as bylaw-related. */
  bylawTagged?: boolean;
  latitude: number;
  longitude: number;
  address: string | null;
  imageUrl: string | null;
  category: { name: string; emoji: string | null; color: string } | null;
  candidateId: string;
  candidateName: string;
  candidateDistrict: string;
  candidateProfileImage: string | null;
  /** Co-proposers (excludes the original author). */
  collaborators: { id: string; name: string; profileImage: string | null }[];
  /** Cumulative like count from PledgeLike table. */
  likeCount?: number;
}

function truncate(text: string, max: number) {
  return text.length > max ? text.slice(0, max) + "…" : text;
}

function extractYouTubeId(text: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[1];
  }
  return null;
}

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

// ─── Pledge detail modal ──────────────────────────────────────────────────────

type ModalTab = "description" | "sns" | "location";

function PledgeModal({
  tile,
  onClose,
}: {
  tile: PledgeTile;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<ModalTab>("description");
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const embedUrl = tile.youtubeUrl || "";
  const youtubeId = embedUrl ? extractYouTubeId(embedUrl) : null;
  const hasMedia = !!(youtubeId || tile.imageUrl);
  const hasLocation = tile.pledgeType === "map" && tile.latitude !== 0 && tile.longitude !== 0;

  const pledgeUrl = typeof window !== "undefined"
    ? `${window.location.origin}/?pledge=${tile.id}`
    : `/?pledge=${tile.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(pledgeUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  // Move focus to close button when modal opens
  useEffect(() => {
    const id = setTimeout(() => closeButtonRef.current?.focus(), 50);
    return () => clearTimeout(id);
  }, []);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pledge-modal-title"
        className="bg-surface rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Scrollable content area */}
        <div className="overflow-y-auto flex-1 p-5">
          {/* Close + Title */}
          <div className="flex items-start gap-3 mb-3">
            <h3 id="pledge-modal-title" className="text-lg font-bold text-foreground flex-1 leading-snug">{tile.title}</h3>
            <button ref={closeButtonRef} onClick={onClose} aria-label="닫기" className="shrink-0 text-muted hover:text-foreground transition-colors mt-0.5">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div role="tablist" aria-label="공약 탭" className="flex gap-0 border-b border-border mb-4">
            {(["description", "sns", "location"] as ModalTab[]).map((tab) => {
              if (tab === "location" && !hasLocation) return null;
              const labels: Record<ModalTab, string> = {
                description: "공약 설명",
                sns: "관련 SNS",
                location: "위치보기",
              };
              const dotTabs: ModalTab[] = [];
              if (hasMedia) dotTabs.push("sns");
              if (hasLocation) dotTabs.push("location");
              return (
                <button
                  key={tab}
                  role="tab"
                  aria-selected={activeTab === tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px flex items-center gap-1.5 ${
                    activeTab === tab
                      ? "border-primary text-primary"
                      : "border-transparent text-muted hover:text-foreground"
                  }`}
                >
                  {labels[tab]}
                  {dotTabs.includes(tab) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>

          {/* ── 공약 설명 tab ──────────────────────────────────────────── */}
          {activeTab === "description" && (
            <div className="space-y-3">
              {tile.budget && (
                <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  예산: {tile.budget}
                </span>
              )}
              {tile.address && (
                <p className="text-xs text-muted flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" className="shrink-0">
                    <path d="M7 7.5a1.75 1.75 0 100-3.5 1.75 1.75 0 000 3.5z" stroke="currentColor" strokeWidth="1.2" />
                    <path d="M7 1.167A4.083 4.083 0 0111.083 5.25C11.083 8.313 7 12.833 7 12.833S2.917 8.313 2.917 5.25A4.083 4.083 0 017 1.167z" stroke="currentColor" strokeWidth="1.2" />
                  </svg>
                  {tile.address}
                </p>
              )}
              <p className="text-sm text-foreground leading-relaxed">{tile.description}</p>

              {/* Author card — primary border + 공약 작성자 badge */}
              <Link
                href={`/candidates/${tile.candidateId}`}
                className="flex items-center gap-3 p-3 rounded-xl border-2 border-primary bg-primary-light hover:bg-primary/10 transition-colors"
                onClick={onClose}
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0 border-2 border-primary/30">
                  {tile.candidateProfileImage ? (
                    <Image src={tile.candidateProfileImage} alt={tile.candidateName} width={40} height={40} className="object-cover w-full h-full" />
                  ) : (
                    <span className="text-primary font-bold text-sm">{tile.candidateName.charAt(0)}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-foreground">{tile.candidateName}</p>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary text-white leading-none">공약 작성자</span>
                  </div>
                  <p className="text-xs text-muted mt-0.5">{tile.candidateDistrict}</p>
                </div>
                <svg className="shrink-0 text-primary" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>

              {/* Collaborators */}
              {tile.collaborators.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted mb-2">공동 제안자들:</p>
                  <div className="space-y-2">
                    {tile.collaborators.map((c) => (
                      <Link
                        key={c.id}
                        href={`/candidates/${c.id}`}
                        className="flex items-center gap-3 p-3 rounded-xl border border-border bg-background hover:bg-border/50 transition-colors"
                        onClick={onClose}
                      >
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                          {c.profileImage ? (
                            <Image src={c.profileImage} alt={c.name} width={36} height={36} className="object-cover w-full h-full" />
                          ) : (
                            <span className="text-primary font-bold text-xs">{c.name.charAt(0)}</span>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-foreground flex-1">{c.name}</p>
                        <svg className="shrink-0 text-muted" width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── 관련 SNS tab ────────────────────────────────────────────── */}
          {activeTab === "sns" && (
            <div className="space-y-4">
              {tile.imageUrl && (
                <div className="relative w-full h-48 rounded-xl overflow-hidden">
                  <Image src={tile.imageUrl} alt={tile.title} fill className="object-cover" />
                </div>
              )}
              {youtubeId && (
                <div className="relative w-full rounded-xl overflow-hidden bg-black" style={{ paddingBottom: "56.25%" }}>
                  <iframe
                    className="absolute inset-0 w-full h-full"
                    src={`https://www.youtube.com/embed/${youtubeId}`}
                    title={`${tile.title} - 관련 영상`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}
              {!hasMedia && (
                <div className="text-center py-10">
                  <p className="text-sm text-muted">등록된 SNS 콘텐츠가 없습니다.</p>
                </div>
              )}
            </div>
          )}

          {/* ── 위치보기 tab ─────────────────────────────────────────────── */}
          {activeTab === "location" && hasLocation && (
            <div className="space-y-3">
              {tile.address && (
                <p className="text-sm text-muted flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 text-primary">
                    <path d="M7 7.5a1.75 1.75 0 100-3.5 1.75 1.75 0 000 3.5z" stroke="currentColor" strokeWidth="1.2" />
                    <path d="M7 1.167A4.083 4.083 0 0111.083 5.25C11.083 8.313 7 12.833 7 12.833S2.917 8.313 2.917 5.25A4.083 4.083 0 017 1.167z" stroke="currentColor" strokeWidth="1.2" />
                  </svg>
                  {tile.address}
                </p>
              )}
              {/* Naver map — SDK loaded globally via root layout */}
              <div className="rounded-xl overflow-hidden border border-border" style={{ height: 240 }}>
                <PledgeLocationMap lat={tile.latitude} lng={tile.longitude} title={tile.title} />
              </div>
              <Link
                href={`/?pledge=${tile.id}`}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover transition-colors"
                onClick={onClose}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM2 8a6 6 0 1112 0A6 6 0 012 8z" fill="currentColor"/>
                  <path d="M8 4.5L8 8l2.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                공약 지도에서 보기
              </Link>
            </div>
          )}
        </div>

        {/* Share / QR — sticky bottom */}
        <div className="border-t border-border px-5 py-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowQR((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted border border-border rounded-lg hover:text-foreground hover:border-foreground/30 transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/>
                <path d="M14 14h1v1h-1zM17 14h1v1h-1zM14 17h1v1h-1zM17 17h4v4h-4z"/>
              </svg>
              QR 코드
            </button>
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted border border-border rounded-lg hover:text-foreground hover:border-foreground/30 transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
              {copied ? "복사됨!" : "링크 복사"}
            </button>
          </div>
          {showQR && pledgeUrl && (
            <div className="mt-3 flex flex-col items-center gap-2 p-3 bg-background rounded-xl">
              <QRCodeCanvas value={pledgeUrl} size={140} level="M" includeMargin />
              <p className="text-[10px] text-muted text-center break-all">{pledgeUrl}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Tile card ────────────────────────────────────────────────────────────────

function TileCard({ tile, onClick }: { tile: PledgeTile; onClick: () => void }) {
  const isShared = tile.collaborators.length > 0;
  const visibleCollabs = tile.collaborators.slice(0, 2);
  const extraCollabs = tile.collaborators.length - visibleCollabs.length;
  const totalParticipants = 1 + tile.collaborators.length; // author + collabs

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${tile.candidateName}의 공약: ${tile.title}`}
      className="flex-shrink-0 w-72 flex flex-col gap-2 p-4 bg-surface border border-border rounded-xl hover:border-primary/30 hover:bg-primary/5 transition-colors mx-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50"
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      {/* Candidate header */}
      <div className="flex items-center gap-2 min-w-0">
        {isShared ? (
          <>
            {/* Stacked avatars: author on top (highest z-index) */}
            <div className="flex -space-x-2 shrink-0">
              <AvatarBubble
                image={tile.candidateProfileImage}
                name={tile.candidateName}
                zIndex={totalParticipants}
              />
              {visibleCollabs.map((c, idx) => (
                <AvatarBubble
                  key={c.id}
                  image={c.profileImage}
                  name={c.name}
                  zIndex={totalParticipants - 1 - idx}
                />
              ))}
              {extraCollabs > 0 && (
                <div
                  className="rounded-full bg-muted/20 border-2 border-surface flex items-center justify-center text-[9px] font-bold text-muted shrink-0 relative"
                  style={{ width: 28, height: 28, zIndex: 0 }}
                >
                  +{extraCollabs}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <span className="text-xs font-semibold text-foreground truncate block">
                {tile.candidateName} 외 {tile.collaborators.length}명
              </span>
              <span className="text-[10px] text-muted truncate block">{tile.candidateDistrict}</span>
            </div>
          </>
        ) : (
          <>
            <AvatarBubble image={tile.candidateProfileImage} name={tile.candidateName} />
            <div className="min-w-0">
              <span className="text-xs font-semibold text-foreground truncate block">{tile.candidateName}</span>
              <span className="text-[10px] text-muted truncate block">{tile.candidateDistrict}</span>
            </div>
          </>
        )}
      </div>

      {/* Badges */}
      <div className="flex items-center gap-1.5 flex-wrap min-w-0">
        {tile.category && (
          <span
            className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: tile.category.color + "20", color: tile.category.color }}
          >
            {tile.category.emoji && <span>{tile.category.emoji}</span>}
            {tile.category.name}
          </span>
        )}
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${
            tile.pledgeType === "bylaws"
              ? "border-blue-200 text-blue-600 bg-blue-50"
              : "border-green-200 text-green-600 bg-green-50"
          }`}
        >
          {tile.pledgeType === "bylaws" ? "조례" : "지역 공약"}
        </span>
        {isShared && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-primary/30 text-primary bg-primary/5 font-medium ml-auto shrink-0">
            공동공약
          </span>
        )}
        {tile.youtubeUrl && (
          <span className="text-[10px] text-red-500 flex items-center gap-0.5 shrink-0">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
            영상
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="font-semibold text-foreground text-sm leading-snug line-clamp-2 break-keep flex-1">
        {tile.title}
      </h3>

      {/* Description */}
      <p className="text-xs text-muted line-clamp-2 leading-relaxed">
        {truncate(tile.description, 80)}
      </p>
    </div>
  );
}

// ─── Ticker row ───────────────────────────────────────────────────────────────

function TickerRow({
  tiles,
  paused,
  speed,
  reverse,
  onTileClick,
}: {
  tiles: PledgeTile[];
  paused: boolean;
  speed: number;
  reverse?: boolean;
  onTileClick: (tile: PledgeTile) => void;
}) {
  if (tiles.length === 0) return null;
  const doubled = [...tiles, ...tiles];

  return (
    <div className="overflow-hidden w-full" style={{ contain: "layout paint" }}>
      <div
        className="flex"
        style={{
          animation: `pledgeTicker${reverse ? "Rev" : ""} ${speed}s linear infinite`,
          animationPlayState: paused ? "paused" : "running",
          width: "max-content",
          willChange: "transform",
          transform: "translateZ(0)",
          backfaceVisibility: "hidden",
        }}
      >
        {doubled.map((tile, i) => (
          <TileCard
            key={`${tile.id}-${i}`}
            tile={tile}
            onClick={() => onTileClick(tile)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PledgeTicker({
  tiles,
  totalCandidates,
  totalPledges,
}: {
  tiles: PledgeTile[];
  totalCandidates: number;
  totalPledges: number;
}) {
  const [paused, setPaused] = useState(false);
  const [selectedTile, setSelectedTile] = useState<PledgeTile | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const row1 = tiles.filter((_, i) => i % 3 === 0);
  const row2 = tiles.filter((_, i) => i % 3 === 1);
  const row3 = tiles.filter((_, i) => i % 3 === 2);

  const speed = Math.max(20, Math.min(80, tiles.length * 4));

  const handleAreaClick = () => {
    if (!selectedTile) setPaused((p) => !p);
  };

  const handleTileClick = (tile: PledgeTile) => {
    setPaused(true);
    setSelectedTile(tile);
  };

  return (
    <div className="min-h-screen bg-background">
      <style>{`
        @keyframes pledgeTicker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        @keyframes pledgeTickerRev { 0% { transform: translateX(-50%); } 100% { transform: translateX(0); } }
      `}</style>

      <div className="max-w-screen-xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-1">공약 목록</h1>
            <p className="text-sm text-muted">
              공천 확정 후보자{" "}
              <span className="font-semibold text-foreground">{totalCandidates}명</span>의 공약{" "}
              <span className="font-semibold text-foreground">{totalPledges}건</span>
            </p>
          </div>
          <button
            onClick={() => setPaused((p) => !p)}
            aria-pressed={paused}
            aria-label={paused ? "공약 슬라이더 재생" : "공약 슬라이더 일시정지"}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-surface hover:bg-primary/5 hover:border-primary/30 transition-colors"
          >
            {paused ? (
              <><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>재생</>
            ) : (
              <><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>일시정지</>
            )}
          </button>
        </div>

        {tiles.length === 0 ? (
          <div className="text-center py-16 text-muted">
            <p className="text-sm">등록된 공약이 없습니다.</p>
          </div>
        ) : (
          <div
            ref={containerRef}
            onClick={handleAreaClick}
            className="flex flex-col gap-4 select-none"
            title={paused ? "클릭하여 재생" : "클릭하여 일시정지"}
          >
            <TickerRow tiles={row1} paused={paused} speed={speed} onTileClick={handleTileClick} />
            {row2.length > 0 && <TickerRow tiles={row2} paused={paused} speed={speed} reverse onTileClick={handleTileClick} />}
            {row3.length > 0 && <TickerRow tiles={row3} paused={paused} speed={speed} onTileClick={handleTileClick} />}

            {paused && !selectedTile && (
              <div className="text-center mt-2">
                <span className="text-xs text-muted bg-surface border border-border px-3 py-1 rounded-full">
                  ⏸ 일시정지됨 — 클릭하여 재생
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pledge detail modal */}
      {selectedTile && (
        <PledgeModal
          tile={selectedTile}
          onClose={() => {
            setSelectedTile(null);
            // Keep paused state; user can resume manually
          }}
        />
      )}
    </div>
  );
}
