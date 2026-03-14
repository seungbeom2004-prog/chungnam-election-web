"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

export interface PledgeTile {
  id: string;
  title: string;
  description: string;
  budget: string | null;
  youtubeUrl: string | null;
  pledgeType: "map" | "bylaws";
  category: { name: string; emoji: string | null; color: string } | null;
  candidateId: string;
  candidateName: string;
  candidateDistrict: string;
  candidateProfileImage: string | null;
}

function truncate(text: string, max: number) {
  return text.length > max ? text.slice(0, max) + "…" : text;
}

function TileCard({ tile }: { tile: PledgeTile }) {
  return (
    <Link
      href={`/candidates/${tile.candidateId}`}
      className="flex-shrink-0 w-72 flex flex-col gap-2 p-4 bg-surface border border-border rounded-xl hover:border-primary/30 hover:bg-primary/5 transition-colors mx-2"
      style={{ pointerEvents: "auto" }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Candidate header */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-7 h-7 rounded-full bg-primary/10 overflow-hidden shrink-0 flex items-center justify-center">
          {tile.candidateProfileImage ? (
            <Image
              src={tile.candidateProfileImage}
              alt={tile.candidateName}
              width={28}
              height={28}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-primary font-bold text-xs">
              {tile.candidateName.charAt(0)}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <span className="text-xs font-semibold text-foreground truncate block">
            {tile.candidateName}
          </span>
          <span className="text-[10px] text-muted truncate block">
            {tile.candidateDistrict}
          </span>
        </div>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-1.5 flex-wrap min-w-0">
        {tile.category && (
          <span
            className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
            style={{
              backgroundColor: tile.category.color + "20",
              color: tile.category.color,
            }}
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
          {tile.pledgeType === "bylaws" ? "조례" : "지역"}
        </span>
        {tile.youtubeUrl && (
          <span className="text-[10px] text-red-500 flex items-center gap-0.5 ml-auto shrink-0">
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
    </Link>
  );
}

function TickerRow({
  tiles,
  paused,
  speed,
  reverse,
}: {
  tiles: PledgeTile[];
  paused: boolean;
  speed: number;
  reverse?: boolean;
}) {
  if (tiles.length === 0) return null;

  // Duplicate tiles for seamless loop
  const doubled = [...tiles, ...tiles];

  return (
    <div className="overflow-hidden w-full">
      <div
        className="flex"
        style={{
          animation: `pledgeTicker${reverse ? "Rev" : ""} ${speed}s linear infinite`,
          animationPlayState: paused ? "paused" : "running",
          width: "max-content",
        }}
      >
        {doubled.map((tile, i) => (
          <TileCard key={`${tile.id}-${i}`} tile={tile} />
        ))}
      </div>
    </div>
  );
}

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
  const containerRef = useRef<HTMLDivElement>(null);

  // Distribute tiles across 2 rows (interleaved)
  const row1 = tiles.filter((_, i) => i % 2 === 0);
  const row2 = tiles.filter((_, i) => i % 2 === 1);

  // Speed: ~40s for ~10 tiles, scales with count
  const speed = Math.max(20, Math.min(80, tiles.length * 4));

  const handleAreaClick = () => setPaused((p) => !p);

  return (
    <div className="min-h-screen bg-background">
      {/* Keyframe styles injected inline */}
      <style>{`
        @keyframes pledgeTicker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes pledgeTickerRev {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
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

          {/* Pause button */}
          <button
            onClick={() => setPaused((p) => !p)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-surface hover:bg-primary/5 hover:border-primary/30 transition-colors"
          >
            {paused ? (
              <>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
                재생
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
                일시정지
              </>
            )}
          </button>
        </div>

        {tiles.length === 0 ? (
          <div className="text-center py-16 text-muted">
            <p className="text-sm">등록된 공약이 없습니다.</p>
          </div>
        ) : (
          /* Ticker area — click anywhere to pause/resume */
          <div
            ref={containerRef}
            onClick={handleAreaClick}
            className="flex flex-col gap-4 cursor-pointer select-none"
            title={paused ? "클릭하여 재생" : "클릭하여 일시정지"}
          >
            <TickerRow tiles={row1} paused={paused} speed={speed} />
            {row2.length > 0 && (
              <TickerRow tiles={row2} paused={paused} speed={speed} reverse />
            )}

            {/* Pause hint overlay */}
            {paused && (
              <div className="text-center mt-2">
                <span className="text-xs text-muted bg-surface border border-border px-3 py-1 rounded-full">
                  ⏸ 일시정지됨 — 클릭하여 재생
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
