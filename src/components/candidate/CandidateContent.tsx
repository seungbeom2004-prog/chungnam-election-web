"use client";

import { useState } from "react";
import PledgeCard from "./PledgeCard";
import CandidateMiniMap from "./CandidateMiniMap";

interface PledgeData {
  id: string;
  title: string;
  description: string;
  budget: string | null;
  imageUrl: string | null;
  latitude: number;
  longitude: number;
  address: string | null;
  createdAt: string;
}

interface CandidateContentProps {
  candidate: {
    id: string;
    name: string;
    district: string;
    bio: string | null;
    pledges: PledgeData[];
  };
}

export default function CandidateContent({ candidate }: CandidateContentProps) {
  const [activeView, setActiveView] = useState<"list" | "map">("list");

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-8">
      {/* Bio */}
      {candidate.bio && (
        <div className="mb-8 p-6 bg-surface rounded-xl border border-border">
          <p className="text-sm text-foreground leading-relaxed">
            {candidate.bio}
          </p>
        </div>
      )}

      {/* Toggle */}
      <div className="flex items-center gap-1 mb-6 bg-background rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveView("list")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeView === "list"
              ? "bg-surface text-foreground shadow-sm"
              : "text-muted hover:text-foreground"
          }`}
        >
          목록 보기
        </button>
        <button
          onClick={() => setActiveView("map")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeView === "map"
              ? "bg-surface text-foreground shadow-sm"
              : "text-muted hover:text-foreground"
          }`}
        >
          지도 보기
        </button>
      </div>

      {/* Content */}
      {activeView === "list" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {candidate.pledges.length === 0 ? (
            <p className="col-span-full text-center text-muted py-12">
              등록된 공약이 없습니다.
            </p>
          ) : (
            candidate.pledges.map((pledge) => (
              <PledgeCard key={pledge.id} pledge={pledge} />
            ))
          )}
        </div>
      ) : (
        <div className="h-[500px] rounded-xl overflow-hidden border border-border">
          <CandidateMiniMap
            pledges={candidate.pledges}
            district={candidate.district}
          />
        </div>
      )}
    </div>
  );
}
