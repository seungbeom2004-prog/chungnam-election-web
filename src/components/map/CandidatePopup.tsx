"use client";

import Image from "next/image";
import Link from "next/link";
import type { CandidateForMap } from "@/app/page";

interface Props {
  candidate: CandidateForMap;
  onClose: () => void;
}

export default function CandidatePopup({ candidate, onClose }: Props) {
  const electionLabel = candidate.electionName || candidate.electionType || "";

  return (
    <div
      className="fixed inset-0 z-40 flex items-end md:items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Popup Card */}
      <div
        className="relative z-50 bg-surface rounded-2xl shadow-2xl border border-border w-full max-w-sm mx-4 mb-6 md:mb-0 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "popupSlideUp 250ms ease-out" }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-muted hover:text-foreground transition-colors z-10"
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

        {/* Profile section */}
        <div className="p-6 flex flex-col items-center text-center">
          {/* Profile image */}
          <div className="w-20 h-20 rounded-2xl overflow-hidden border-[3px] border-primary bg-primary/10 mb-4 shadow-lg">
            {candidate.profileImage ? (
              <Image
                src={candidate.profileImage}
                alt={candidate.name}
                width={80}
                height={80}
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-primary font-bold text-3xl">
                  {candidate.name.charAt(0)}
                </span>
              </div>
            )}
          </div>

          {/* Name */}
          <h2 className="text-2xl font-black text-foreground">
            {candidate.name}
          </h2>

          {/* Election label */}
          {electionLabel && (
            <p className="text-sm text-muted mt-1">{electionLabel}</p>
          )}

          {/* Status + district */}
          <div className="flex items-center gap-2 mt-2 flex-wrap justify-center">
            {candidate.candidateStatus && (
              <span className="text-xs px-2.5 py-1 bg-primary/10 text-primary rounded-full font-medium">
                {candidate.candidateStatus}
              </span>
            )}
            <span className="text-xs text-muted">{candidate.district}</span>
          </div>
        </div>

        {/* CTA Button */}
        <div className="px-5 pb-5">
          <Link
            href={`/candidates/${candidate.id}`}
            className="block w-full py-3.5 bg-primary text-white font-bold text-base text-center rounded-xl hover:bg-primary/90 transition-colors"
            onClick={onClose}
          >
            프로필 보기 →
          </Link>
        </div>
      </div>

      <style jsx>{`
        @keyframes popupSlideUp {
          from {
            transform: translateY(30px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
