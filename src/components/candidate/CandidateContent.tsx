"use client";

import { useState } from "react";
import CandidateMiniMap from "./CandidateMiniMap";
import ProposalList from "@/components/proposals/ProposalList";
import SnsTab from "./SnsTab";

interface PledgeCategory {
  id: string;
  name: string;
  emoji: string | null;
  color: string;
  iconImage: string | null;
}

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
  pledgeType?: string;
  category?: PledgeCategory | null;
}

interface CandidateContentProps {
  candidate: {
    id: string;
    name: string;
    district: string;
    bio: string | null;
    profileImage?: string | null;
    pinLat?: number | null;
    pinLng?: number | null;
    pledges: PledgeData[];
    bylaws?: PledgeData[];
    youtube?: string | null;
    instagram?: string | null;
    twitter?: string | null;
    facebook?: string | null;
    tiktok?: string | null;
    kakao?: string | null;
    naverBlog?: string | null;
  };
}

/** Renders a category icon the same way the map marker does:
 *  CSS background-image for the uploaded icon (never <img> which can crash
 *  in some contexts), or the emoji as text fallback. */
function PledgeIcon({ category }: { category?: PledgeCategory | null }) {
  const color = category?.color || "#FF5A00";
  const emoji = category?.emoji || "📌";
  const iconImage = category?.iconImage || null;

  return (
    <div
      className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center overflow-hidden relative mt-0.5"
      style={{ backgroundColor: color + "22", border: `2px solid ${color}` }}
    >
      <span className="text-lg leading-none">{emoji}</span>
      {iconImage && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url('${iconImage.replace(/'/g, "\\'")}')`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      )}
    </div>
  );
}

export default function CandidateContent({ candidate }: CandidateContentProps) {
  const [activeView, setActiveView] = useState<"list" | "map" | "proposals" | "sns">("list");
  const hasSns = !!(candidate.youtube || candidate.instagram || candidate.twitter || candidate.facebook || candidate.tiktok || candidate.kakao || candidate.naverBlog);

  const allPledges = [
    ...candidate.pledges.map((p) => ({ ...p, isBylaw: false })),
    ...(candidate.bylaws ?? []).map((p) => ({ ...p, isBylaw: true })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="max-w-screen-xl mx-auto px-4 pt-8 pb-24 md:pb-8">
      {/* Bio — whitespace-pre-wrap preserves line breaks entered in the dashboard */}
      {candidate.bio && (
        <div className="mb-8 p-6 bg-surface rounded-xl border border-border">
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
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
          공약
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
        <button
          onClick={() => setActiveView("proposals")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeView === "proposals"
              ? "bg-surface text-foreground shadow-sm"
              : "text-muted hover:text-foreground"
          }`}
        >
          <span className="hidden sm:inline">{candidate.name} 후보에게 공약 제안하기</span>
          <span className="sm:hidden">공약 제안</span>
        </button>
        {hasSns && (
          <button
            onClick={() => setActiveView("sns")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeView === "sns"
                ? "bg-surface text-foreground shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            SNS 활동
          </button>
        )}
      </div>

      {/* Content */}
      {activeView === "list" ? (
        /* ── Pledge + Bylaws combined list ───────────────────────────── */
        <div className="relative z-50">
          {allPledges.length === 0 ? (
            <p className="text-center text-muted py-12">
              등록된 공약이 없습니다.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {allPledges.map((pledge, index) => (
                <div
                  key={pledge.id}
                  className="p-5 border border-border rounded-xl bg-surface"
                >
                  <div className="flex items-start gap-3">
                    {/* Rank number */}
                    <div className="shrink-0 w-6 h-6 mt-0.5 flex items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold leading-none">
                      {index + 1}
                    </div>
                    {pledge.isBylaw && !pledge.category ? (
                      <div className="w-10 h-10 rounded-xl bg-blue-50 border-2 border-blue-200 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-blue-600 text-sm font-bold">{"\u00A7"}</span>
                      </div>
                    ) : (
                      <PledgeIcon category={pledge.category} />
                    )}
                    <div className="flex-1 min-w-0">
                      {pledge.isBylaw && (
                        <div className="mb-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600 border border-blue-200">
                            조례 입법 공약
                          </span>
                        </div>
                      )}
                      <h3 className="font-semibold text-foreground text-sm leading-snug">
                        {pledge.title}
                      </h3>
                      <p className="text-sm text-muted mt-1.5 leading-relaxed whitespace-pre-wrap line-clamp-3">
                        {pledge.description}
                      </p>
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        {pledge.budget && (
                          <span className="text-xs text-primary font-medium">
                            {pledge.budget}
                          </span>
                        )}
                        {pledge.address && (
                          <span className="text-xs text-muted truncate">
                            📍 {pledge.address}
                          </span>
                        )}
                        <time className="text-xs text-muted ml-auto">
                          {new Date(pledge.createdAt).toLocaleDateString("ko-KR")}
                        </time>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeView === "map" ? (
        /* ── Map view ────────────────────────────────────────────────── */
        <div className="h-[500px] rounded-xl overflow-hidden border border-border">
          <CandidateMiniMap
            pledges={candidate.pledges}
            district={candidate.district}
            pinLat={candidate.pinLat ?? null}
            pinLng={candidate.pinLng ?? null}
            profileImage={candidate.profileImage ?? null}
            candidateName={candidate.name}
          />
        </div>
      ) : activeView === "proposals" ? (
        /* ── Proposals view ──────────────────────────────────────────── */
        <ProposalList candidateId={candidate.id} showForm={true} />
      ) : (
        /* ── SNS tab ─────────────────────────────────────────────────── */
        <SnsTab
          youtube={candidate.youtube}
          instagram={candidate.instagram}
          twitter={candidate.twitter}
          facebook={candidate.facebook}
          tiktok={candidate.tiktok}
          kakao={candidate.kakao}
          naverBlog={candidate.naverBlog}
        />
      )}
    </div>
  );
}
