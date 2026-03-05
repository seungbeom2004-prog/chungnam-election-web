"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useMapStore } from "@/store/useMapStore";
import { Badge } from "@/components/ui";

/** Extract YouTube video ID from a URL embedded in any text. */
function extractYouTubeId(text: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export default function PledgePanel() {
  const { selectedPledge, isPanelOpen, setIsPanelOpen } = useMapStore();
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click (desktop)
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsPanelOpen(false);
      }
    };
    if (isPanelOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isPanelOpen, setIsPanelOpen]);

  if (!isPanelOpen || !selectedPledge) return null;

  const pledge = selectedPledge;

  return (
    <>
      {/* Mobile Bottom Sheet */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-surface rounded-t-2xl shadow-xl border-t border-border max-h-[70vh] overflow-y-auto"
        style={{ animation: "slideUp 300ms ease-out" }}
      >
        <div className="w-12 h-1 bg-border rounded-full mx-auto mt-3" />
        <PledgePanelContent
          pledge={pledge}
          onClose={() => setIsPanelOpen(false)}
          panelRef={panelRef}
        />
      </div>

      {/* Desktop Sidebar */}
      <div
        ref={panelRef}
        className="hidden md:block fixed top-14 left-0 z-30 w-96 h-[calc(100vh-3.5rem)] bg-surface border-r border-border shadow-xl overflow-y-auto"
        style={{ animation: "slideRight 300ms ease-out" }}
      >
        <PledgePanelContent
          pledge={pledge}
          onClose={() => setIsPanelOpen(false)}
        />
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        @keyframes slideRight {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
}

function PledgePanelContent({
  pledge,
  onClose,
  panelRef,
}: {
  pledge: NonNullable<ReturnType<typeof useMapStore.getState>["selectedPledge"]>;
  onClose: () => void;
  panelRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const router = useRouter();
  const youtubeId = extractYouTubeId(pledge.description ?? "");

  const navigateToCandidate = () => {
    if (!pledge.candidate) return;
    onClose();
    router.push(`/candidates/${pledge.candidate.id}`);
  };

  return (
    <div ref={panelRef} className="p-5">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-muted hover:text-foreground transition-colors"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path
            d="M15 5L5 15M5 5l10 10"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {/* Pledge Image */}
      {pledge.imageUrl && (
        <div className="relative w-full h-48 rounded-xl overflow-hidden mb-4">
          <Image
            src={pledge.imageUrl}
            alt={pledge.title}
            fill
            className="object-cover"
          />
        </div>
      )}

      {/* YouTube iframe — shown when description contains a YouTube link */}
      {youtubeId && (
        <div className="relative w-full rounded-xl overflow-hidden mb-4 bg-black" style={{ paddingBottom: "56.25%" }}>
          <iframe
            className="absolute inset-0 w-full h-full"
            src={`https://www.youtube.com/embed/${youtubeId}`}
            title="관련 영상"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {/* Title */}
      <h3 className="text-lg font-bold text-foreground mb-2">{pledge.title}</h3>

      {/* Budget Badge */}
      {pledge.budget && (
        <Badge variant="primary" className="mb-3">
          예산: {pledge.budget}
        </Badge>
      )}

      {/* Address */}
      {pledge.address && (
        <p className="text-sm text-muted mb-3 flex items-center gap-1">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M7 7.5a1.75 1.75 0 100-3.5 1.75 1.75 0 000 3.5z"
              stroke="currentColor"
              strokeWidth="1.2"
            />
            <path
              d="M7 1.167A4.083 4.083 0 0111.083 5.25C11.083 8.313 7 12.833 7 12.833S2.917 8.313 2.917 5.25A4.083 4.083 0 017 1.167z"
              stroke="currentColor"
              strokeWidth="1.2"
            />
          </svg>
          {pledge.address}
        </p>
      )}

      {/* Description */}
      <p className="text-sm text-foreground leading-relaxed mb-4">
        {pledge.description}
      </p>

      {/* Candidate card — entire card is clickable */}
      {pledge.candidate && (
        <button
          onClick={navigateToCandidate}
          className="w-full flex items-center gap-3 p-3 rounded-lg bg-background hover:bg-border/50 transition-colors text-left cursor-pointer"
        >
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
            {pledge.candidate.profileImage ? (
              <Image
                src={pledge.candidate.profileImage}
                alt={pledge.candidate.name}
                width={40}
                height={40}
                className="object-cover"
              />
            ) : (
              <span className="text-primary font-bold text-sm">
                {pledge.candidate.name.charAt(0)}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {pledge.candidate.name}
            </p>
            <p className="text-xs text-muted">{pledge.candidate.district}</p>
          </div>
          <svg
            className="shrink-0 text-muted"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
          >
            <path
              d="M6 12l4-4-4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
