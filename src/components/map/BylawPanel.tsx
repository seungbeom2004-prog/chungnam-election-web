"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useMapStore } from "@/store/useMapStore";
import type { Pledge, BylawGroup } from "@/types";
import type { ExtendedMapState } from "@/store/useMapStore";

export default function BylawPanel() {
  const store = useMapStore() as ExtendedMapState;
  const { isBylawPanelOpen, selectedBylawGroup, setIsBylawPanelOpen, setSelectedPledge } = store;

  if (!isBylawPanelOpen || !selectedBylawGroup) return null;

  const group = selectedBylawGroup;

  const handlePledgeClick = (pledge: Pledge) => {
    setIsBylawPanelOpen(false);
    setTimeout(() => setSelectedPledge(pledge), 50);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-20 bg-black/20"
        onClick={() => setIsBylawPanelOpen(false)}
      />
      {/* Mobile Bottom Sheet */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-surface rounded-t-2xl shadow-xl border-t border-border max-h-[78vh] overflow-y-auto"
        style={{ animation: "slideUp 300ms ease-out" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1 bg-border rounded-full mx-auto mt-3 mb-1" />
        <BylawPanelContent
          group={group}
          onClose={() => setIsBylawPanelOpen(false)}
          onPledgeClick={handlePledgeClick}
        />
      </div>
      {/* Desktop Sidebar */}
      <div
        className="hidden md:block fixed top-0 left-[3.75rem] z-30 w-96 h-screen bg-surface border-r border-border shadow-xl overflow-y-auto"
        style={{ animation: "slideRight 300ms ease-out" }}
        onClick={(e) => e.stopPropagation()}
      >
        <BylawPanelContent
          group={group}
          onClose={() => setIsBylawPanelOpen(false)}
          onPledgeClick={handlePledgeClick}
        />
      </div>
      <style jsx>{`
        @keyframes slideUp    { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes slideRight { from { transform: translateX(-100%); } to { transform: translateX(0); } }
      `}</style>
    </>
  );
}

// ── Panel body ────────────────────────────────────────────────────────────────

function BylawPanelContent({
  group,
  onClose,
  onPledgeClick,
}: {
  group: BylawGroup;
  onClose: () => void;
  onPledgeClick: (pledge: Pledge) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  // Group pledges by candidate (author)
  type CandidateInfo = NonNullable<Pledge["candidate"]>;
  const byCandidate = group.pledges.reduce<
    Record<string, { candidate: CandidateInfo; pledges: Pledge[] }>
  >((acc, pledge) => {
    if (!pledge.candidate) return acc;
    const cid = pledge.candidate.id;
    if (!acc[cid]) acc[cid] = { candidate: pledge.candidate, pledges: [] };
    acc[cid]!.pledges.push(pledge);
    return acc;
  }, {});

  const candidateGroups = Object.values(byCandidate);
  const totalCount = group.pledges.length;

  return (
    <div className="p-5 relative">
      {/* Close */}
      <button
        onClick={onClose}
        aria-label="닫기"
        className="absolute top-4 right-4 text-muted hover:text-foreground transition-colors"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {/* Header */}
      <div className="flex items-center gap-2 mb-5 pr-8">
        <span className="text-2xl" aria-hidden="true">📜</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-foreground text-base leading-tight">
            {group.cityName} 의회 조례 공약
          </h3>
          <p className="text-xs text-muted mt-0.5">
            {candidateGroups.length}명 후보자 · 총 {totalCount}건
          </p>
        </div>
        <span className="shrink-0 text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
          {totalCount}건
        </span>
      </div>

      {/* Pledges grouped by candidate */}
      {candidateGroups.length > 0 ? (
        <div className="space-y-5">
          {candidateGroups.map(({ candidate, pledges }) => (
            <div key={candidate.id}>
              {/* Candidate mini-header */}
              <Link
                href={`/candidates/${candidate.id}`}
                onClick={onClose}
                className="flex items-center gap-2 mb-2 hover:opacity-80 transition-opacity group"
              >
                <div className="w-8 h-8 rounded-full bg-blue-100 border-2 border-blue-300 overflow-hidden flex items-center justify-center shrink-0">
                  {candidate.profileImage ? (
                    <Image
                      src={candidate.profileImage}
                      alt={candidate.name}
                      width={32}
                      height={32}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <span className="text-blue-600 font-bold text-xs">{candidate.name.charAt(0)}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                    {candidate.name}
                  </p>
                  <p className="text-[10px] text-muted truncate">{candidate.district}</p>
                </div>
                <span className="shrink-0 text-[10px] text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-full">
                  {pledges.length}건
                </span>
              </Link>

              {/* Pledge items for this candidate */}
              <div className="space-y-1.5 pl-2 border-l-2 border-blue-100">
                {pledges.map((pledge) => (
                  <BylawPledgeItem
                    key={pledge.id}
                    pledge={pledge}
                    expanded={expanded === pledge.id}
                    onToggle={() => setExpanded(expanded === pledge.id ? null : pledge.id)}
                    onOpen={() => onPledgeClick(pledge)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Fallback: flat list when pledge.candidate is missing
        <div className="space-y-1.5">
          {group.pledges.map((pledge) => (
            <BylawPledgeItem
              key={pledge.id}
              pledge={pledge}
              expanded={expanded === pledge.id}
              onToggle={() => setExpanded(expanded === pledge.id ? null : pledge.id)}
              onOpen={() => onPledgeClick(pledge)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Individual pledge row ─────────────────────────────────────────────────────

function BylawPledgeItem({
  pledge,
  expanded,
  onToggle,
  onOpen,
}: {
  pledge: Pledge;
  expanded: boolean;
  onToggle: () => void;
  onOpen: () => void;
}) {
  const collaborators = pledge.collaborators ?? [];

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-background/50">
      {/* Header row */}
      <div className="flex items-center gap-2 p-2.5">
        {/* Category icon */}
        <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
          <span className="text-sm" aria-hidden="true">{pledge.category?.emoji || "📜"}</span>
        </div>

        {/* Title + collab */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground leading-snug line-clamp-1">
            {pledge.title}
          </p>
          {/* Collaborators preview */}
          {collaborators.length > 0 && (
            <div className="flex items-center gap-1 mt-0.5">
              <div className="flex -space-x-1">
                {collaborators.slice(0, 3).map((c) => (
                  <div
                    key={c.id}
                    className="w-4 h-4 rounded-full bg-primary/10 border border-surface overflow-hidden flex items-center justify-center"
                    title={c.candidate?.name}
                  >
                    {c.candidate?.profileImage ? (
                      <Image
                        src={c.candidate.profileImage}
                        alt={c.candidate.name ?? ""}
                        width={16}
                        height={16}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-[8px] text-primary font-bold">
                        {(c.candidate?.name ?? "?").charAt(0)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <span className="text-[9px] text-muted">공동 {collaborators.length}명</span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-0.5 shrink-0">
          {/* Open full pledge panel */}
          <button
            onClick={onOpen}
            aria-label="공약 상세 보기"
            className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {/* Expand/collapse description */}
          <button
            onClick={onToggle}
            aria-expanded={expanded}
            aria-label={expanded ? "설명 접기" : "설명 펼치기"}
            className="p-1.5 text-muted hover:text-foreground hover:bg-background rounded-lg transition-colors"
          >
            <svg
              className={`transition-transform ${expanded ? "rotate-180" : ""}`}
              width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true"
            >
              <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-3 pb-3 border-t border-border bg-background/30">
          {pledge.budget && (
            <span className="inline-block mt-2 text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              예산: {pledge.budget}
            </span>
          )}
          <p className="text-xs text-foreground leading-relaxed mt-2 line-clamp-4">
            {pledge.description}
          </p>

          {/* Author + collaborators detail */}
          {(pledge.candidate || collaborators.length > 0) && (
            <div className="mt-3 pt-2 border-t border-border/50 flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-muted">참여:</span>
              {pledge.candidate && (
                <div className="flex items-center gap-1">
                  <div className="w-5 h-5 rounded-full bg-primary/10 border border-primary/20 overflow-hidden flex items-center justify-center shrink-0">
                    {pledge.candidate.profileImage ? (
                      <Image src={pledge.candidate.profileImage} alt={pledge.candidate.name} width={20} height={20} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[8px] text-primary font-bold">{pledge.candidate.name.charAt(0)}</span>
                    )}
                  </div>
                  <span className="text-[10px] font-semibold text-foreground">{pledge.candidate.name}</span>
                  <span className="text-[9px] text-primary bg-primary/10 px-1 rounded-full">작성자</span>
                </div>
              )}
              {collaborators.map((c) => (
                <div key={c.id} className="flex items-center gap-1">
                  <div className="w-5 h-5 rounded-full bg-muted/20 border border-border overflow-hidden flex items-center justify-center shrink-0">
                    {c.candidate?.profileImage ? (
                      <Image src={c.candidate.profileImage} alt={c.candidate.name ?? ""} width={20} height={20} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[8px] text-muted font-bold">{(c.candidate?.name ?? "?").charAt(0)}</span>
                    )}
                  </div>
                  <span className="text-[10px] text-muted">{c.candidate?.name}</span>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={onOpen}
            className="mt-3 w-full py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold hover:bg-blue-100 transition-colors"
          >
            전체 공약 보기 →
          </button>
        </div>
      )}
    </div>
  );
}
