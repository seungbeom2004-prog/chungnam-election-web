"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
  /** Present only on shared pledges — the original author (another candidate). */
  author?: { id: string; name: string; district: string; profileImage: string | null } | null;
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
    sharedPledges?: PledgeData[];
    youtube?: string | null;
    instagram?: string | null;
    twitter?: string | null;
    facebook?: string | null;
    tiktok?: string | null;
    kakao?: string | null;
    naverBlog?: string | null;
    donationUrl?: string | null;
    articleUrl?: string | null;
    articleTitle?: string | null;
    phone?: string | null;
    contactEmail?: string | null;
    showPhone?: boolean;
    showContactEmail?: boolean;
  };
}

/** Renders a category icon the same way the map marker does. */
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
  const [activeView, setActiveView] = useState<"list" | "map" | "proposals" | "sns" | "contact">("list");
  const hasSns = !!(candidate.youtube || candidate.instagram || candidate.twitter || candidate.facebook || candidate.tiktok || candidate.kakao || candidate.naverBlog);
  const hasContact = !!(
    (candidate.showPhone && candidate.phone) ||
    (candidate.showContactEmail && candidate.contactEmail)
  );

  // Merge own pledges + bylaws + shared pledges (from other authors), sorted by date
  const allPledges = [
    ...candidate.pledges.map((p) => ({ ...p, isBylaw: false, isShared: false })),
    ...(candidate.bylaws ?? []).map((p) => ({ ...p, isBylaw: true, isShared: false })),
    ...(candidate.sharedPledges ?? []).map((p) => ({ ...p, isBylaw: p.pledgeType === "bylaws", isShared: true })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="max-w-screen-xl mx-auto px-4 pt-8 pb-24 md:pb-8">
      {/* Bio */}
      {candidate.bio && (
        <div className="mb-8 p-6 bg-surface rounded-xl border border-border">
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
            {candidate.bio}
          </p>
          {candidate.donationUrl && (
            <a
              href={candidate.donationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
            >
              💝 후원하기
            </a>
          )}
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
        {hasContact && (
          <button
            onClick={() => setActiveView("contact")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeView === "contact"
                ? "bg-surface text-foreground shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            연락처
          </button>
        )}
      </div>

      {/* Content */}
      {activeView === "list" ? (
        <div className="relative z-50">
          {allPledges.length === 0 ? (
            <p className="text-center text-muted py-12">등록된 공약이 없습니다.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {allPledges.map((pledge, index) => (
                <div
                  key={`${pledge.id}-${pledge.isShared ? "shared" : "own"}`}
                  className={`p-5 border rounded-xl bg-surface ${
                    pledge.isShared
                      ? "border-primary/30 bg-primary/5"
                      : "border-border"
                  }`}
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
                      {/* Badges row */}
                      <div className="flex flex-wrap gap-1.5 mb-1">
                        {pledge.isBylaw && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600 border border-blue-200">
                            조례 입법 공약
                          </span>
                        )}
                        {pledge.isShared && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                            공동공약
                          </span>
                        )}
                      </div>

                      <h3 className="font-semibold text-foreground text-sm leading-snug">
                        {pledge.title}
                      </h3>
                      <p className="text-sm text-muted mt-1.5 leading-relaxed whitespace-pre-wrap line-clamp-3">
                        {pledge.description}
                      </p>
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        {pledge.budget && (
                          <span className="text-xs text-primary font-medium">{pledge.budget}</span>
                        )}
                        {pledge.address && (
                          <span className="text-xs text-muted truncate">📍 {pledge.address}</span>
                        )}
                        <time className="text-xs text-muted ml-auto">
                          {new Date(pledge.createdAt).toLocaleDateString("ko-KR")}
                        </time>
                      </div>

                      {/* Original author credit for shared pledges */}
                      {pledge.isShared && pledge.author && (
                        <Link
                          href={`/candidates/${pledge.author.id}`}
                          className="mt-2 flex items-center gap-2 p-2 rounded-lg bg-surface border border-border hover:border-primary/30 hover:bg-primary/5 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                            {pledge.author.profileImage ? (
                              <Image
                                src={pledge.author.profileImage}
                                alt={pledge.author.name}
                                width={24}
                                height={24}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-primary font-bold text-[9px]">
                                {pledge.author.name.charAt(0)}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] font-semibold text-primary">공약 작성자: </span>
                            <span className="text-[10px] text-foreground font-medium">{pledge.author.name}</span>
                            <span className="text-[10px] text-muted ml-1">({pledge.author.district})</span>
                          </div>
                          <svg className="shrink-0 text-muted" width="12" height="12" viewBox="0 0 16 16" fill="none">
                            <path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </Link>
                      )}

                      {/* CTA inside each pledge box */}
                      <Link
                        href="/proposals"
                        className="mt-3 flex items-center justify-center gap-1.5 w-full py-2 rounded-lg border border-primary/25 text-primary text-[11px] font-semibold hover:bg-primary hover:text-white transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        💡 불편 제보 / 공약 제안하러 가기
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CTA — 공약을 다 본 사람에게 민원/제안 유도 */}
          <div className="mt-6 rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="font-bold text-foreground text-sm mb-0.5">혹시 당신의 집 앞 문제는 없나요?</p>
              <p className="text-xs text-muted">불편 사항을 제보하거나, {candidate.name} 후보에게 직접 공약을 제안해보세요.</p>
            </div>
            <Link
              href="/proposals"
              className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-sm whitespace-nowrap"
            >
              💡 불편 제보 / 공약 제안하러 가기
            </Link>
          </div>
        </div>
      ) : activeView === "map" ? (
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
        <ProposalList candidateId={candidate.id} showForm={true} />
      ) : activeView === "contact" ? (
        <div className="p-6 bg-surface rounded-xl border border-border max-w-md">
          <h2 className="text-base font-bold text-foreground mb-4">📬 연락처</h2>
          <div className="space-y-3">
            {candidate.showPhone && candidate.phone && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border">
                <span className="text-xl">📞</span>
                <div>
                  <p className="text-xs text-muted mb-0.5">전화번호</p>
                  <a href={`tel:${candidate.phone}`} className="text-sm font-semibold text-foreground hover:text-primary transition-colors">
                    {candidate.phone}
                  </a>
                </div>
              </div>
            )}
            {candidate.showContactEmail && candidate.contactEmail && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border">
                <span className="text-xl">✉️</span>
                <div>
                  <p className="text-xs text-muted mb-0.5">이메일</p>
                  <a href={`mailto:${candidate.contactEmail}`} className="text-sm font-semibold text-foreground hover:text-primary transition-colors break-all">
                    {candidate.contactEmail}
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <SnsTab
          youtube={candidate.youtube}
          instagram={candidate.instagram}
          twitter={candidate.twitter}
          facebook={candidate.facebook}
          tiktok={candidate.tiktok}
          kakao={candidate.kakao}
          naverBlog={candidate.naverBlog}
          articleUrl={candidate.articleUrl}
          articleTitle={candidate.articleTitle}
        />
      )}
    </div>
  );
}
