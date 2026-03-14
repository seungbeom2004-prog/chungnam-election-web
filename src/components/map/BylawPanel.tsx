"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useMapStore } from "@/store/useMapStore";
import type { Pledge, BylawGroup } from "@/types";

export default function BylawPanel() {
  const { isBylawPanelOpen, selectedBylawGroup, setIsBylawPanelOpen } = useMapStore();

  if (!isBylawPanelOpen || !selectedBylawGroup) return null;

  const group = selectedBylawGroup;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-20 bg-black/20"
        onClick={() => setIsBylawPanelOpen(false)}
      />
      {/* Mobile Bottom Sheet */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-surface rounded-t-2xl shadow-xl border-t border-border max-h-[70vh] overflow-y-auto"
        style={{ animation: "slideUp 300ms ease-out" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1 bg-border rounded-full mx-auto mt-3" />
        <BylawPanelContent group={group} onClose={() => setIsBylawPanelOpen(false)} />
      </div>
      {/* Desktop Sidebar */}
      <div
        className="hidden md:block fixed top-14 left-0 z-30 w-96 h-[calc(100vh-3.5rem)] bg-surface border-r border-border shadow-xl overflow-y-auto"
        style={{ animation: "slideRight 300ms ease-out" }}
        onClick={(e) => e.stopPropagation()}
      >
        <BylawPanelContent group={group} onClose={() => setIsBylawPanelOpen(false)} />
      </div>
      <style jsx>{`
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes slideRight { from { transform: translateX(-100%); } to { transform: translateX(0); } }
      `}</style>
    </>
  );
}

function BylawPanelContent({
  group,
  onClose,
}: {
  group: BylawGroup;
  onClose: () => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="p-5">
      {/* Close */}
      <button onClick={onClose} aria-label="닫기" className="absolute top-4 right-4 text-muted hover:text-foreground transition-colors">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {/* Candidate header */}
      <div className="flex items-center gap-3 mb-4 pr-8">
        <div className="w-10 h-10 rounded-full bg-blue-100 border-2 border-blue-300 overflow-hidden flex items-center justify-center shrink-0">
          {group.candidateProfileImage ? (
            <Image src={group.candidateProfileImage} alt={group.candidateName} width={40} height={40} className="object-cover w-full h-full" />
          ) : (
            <span className="text-blue-600 font-bold text-sm">{group.candidateName.charAt(0)}</span>
          )}
        </div>
        <div>
          <p className="font-bold text-foreground text-sm">{group.candidateName}</p>
          <p className="text-xs text-muted">{group.candidateDistrict}</p>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">📜</span>
        <h3 className="font-bold text-foreground text-base">조례 입법 공약</h3>
        <span className="ml-auto text-xs text-muted bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-200">
          {group.pledges.length}건
        </span>
      </div>

      {/* Pledge list */}
      <div className="space-y-2">
        {group.pledges.map((pledge) => (
          <BylawPledgeItem
            key={pledge.id}
            pledge={pledge}
            expanded={expanded === pledge.id}
            onToggle={() => setExpanded(expanded === pledge.id ? null : pledge.id)}
          />
        ))}
      </div>

      {/* Link to candidate profile */}
      <Link
        href={`/candidates/${group.candidateId}`}
        className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 text-sm font-semibold hover:bg-blue-100 transition-colors"
        onClick={onClose}
      >
        후보자 프로필 보기 →
      </Link>
    </div>
  );
}

function BylawPledgeItem({
  pledge,
  expanded,
  onToggle,
}: {
  pledge: Pledge;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-background/60 transition-colors"
      >
        <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
          <span className="text-sm">{pledge.category?.emoji || "📜"}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground leading-snug line-clamp-1">{pledge.title}</p>
          {pledge.category && (
            <span className="text-[10px] text-muted">{pledge.category.name}</span>
          )}
        </div>
        <svg
          className={`shrink-0 text-muted transition-transform ${expanded ? "rotate-90" : ""}`}
          width="14" height="14" viewBox="0 0 16 16" fill="none"
        >
          <path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {expanded && (
        <div className="px-3 pb-3 border-t border-border bg-background/30">
          {pledge.budget && (
            <span className="inline-block mt-2 text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              예산: {pledge.budget}
            </span>
          )}
          <p className="text-sm text-foreground leading-relaxed mt-2">{pledge.description}</p>
        </div>
      )}
    </div>
  );
}
