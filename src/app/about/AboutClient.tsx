"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "@/contexts/ThemeContext";

interface Candidate {
  id: string;
  name: string;
  district: string;
  profileImage: string | null;
  slogan: string | null;
  createdAt: string;
  likeCount: number;
  pledgeCount?: number;
  youtube?: string | null;
  instagram?: string | null;
  twitter?: string | null;
  facebook?: string | null;
  tiktok?: string | null;
  kakao?: string | null;
  naverBlog?: string | null;
}

type SortOrder = "signup" | "likes" | "pledges";

function CandidateSnsCard({ candidate }: { candidate: Candidate }) {
  const platforms = [
    { key: "youtube", label: "YouTube", color: "#FF0000", url: candidate.youtube, icon: "▶" },
    { key: "instagram", label: "Instagram", color: "#E1306C", url: candidate.instagram, icon: "📷" },
    { key: "twitter", label: "X", color: "#000", url: candidate.twitter, icon: "𝕏" },
    { key: "facebook", label: "Facebook", color: "#1877F2", url: candidate.facebook, icon: "f" },
    { key: "tiktok", label: "TikTok", color: "#000", url: candidate.tiktok, icon: "♪" },
    { key: "naverBlog", label: "블로그", color: "#03C75A", url: candidate.naverBlog, icon: "N" },
  ].filter((p) => p.url);

  if (platforms.length === 0) return null;

  return (
    <Link
      href={`/candidates/${candidate.id}`}
      className="flex items-center gap-4 p-4 bg-surface border border-border rounded-xl hover:border-primary/30 hover:bg-primary/5 transition-colors"
    >
      <div className="w-12 h-12 rounded-full bg-primary/10 overflow-hidden shrink-0 flex items-center justify-center">
        {candidate.profileImage ? (
          <Image src={candidate.profileImage} alt={candidate.name} width={48} height={48} className="w-full h-full object-cover" />
        ) : (
          <span className="text-primary font-bold text-lg">{candidate.name.charAt(0)}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground">{candidate.name}</p>
        <p className="text-xs text-muted truncate">{candidate.district}</p>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {platforms.map((p) => (
            <span
              key={p.key}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: p.color }}
            >
              {p.icon} {p.label}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}

export default function AboutClient({ candidates }: { candidates: Candidate[] }) {
  const [sortOrder, setSortOrder] = useState<SortOrder>("signup");
  const [activeTab, setActiveTab] = useState<"candidates" | "sns">("candidates");
  const { isCute } = useTheme();

  const sorted = [...candidates].sort((a, b) => {
    if (sortOrder === "likes") {
      if (b.likeCount !== a.likeCount) return b.likeCount - a.likeCount;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    if (sortOrder === "pledges") {
      const pa = a.pledgeCount ?? 0;
      const pb = b.pledgeCount ?? 0;
      if (pb !== pa) return pb - pa;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    // Default: sign-up date
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-screen-md mx-auto px-4 py-8">
        {/* Site description */}
        <div className="mb-10">
          <h1 className="text-2xl font-bold text-foreground mb-4">{isCute && <span className="mr-2">🌸</span>}사이트 & 후보자 소개</h1>
          <div className="p-5 bg-surface border border-border rounded-xl text-sm text-muted leading-relaxed space-y-3">
            <p>
              <span className="font-semibold text-foreground">개혁신당 충남 공동 선거운동 홈페이지</span>에 오신 것을 환영합니다.
            </p>
            <p>
              본 홈페이지는 제9회 전국동시지방선거 개혁신당 천안시의원(천안시다선거구) <strong className="font-semibold text-foreground">{'손승범'}</strong> (예비)후보가 기획 및 개설하였으며,
              개혁신당에서 공천을 받은 충남 지역 출마 (예비)후보자들이 정책과 공약을 유권자에게 알리기 위해 함께 사용하는{" "}
              <strong className="font-semibold text-foreground">{'공동 선거운동 공간'}</strong>입니다.
            </p>
            <p>
              본 사이트는 「공직선거법」 제59조 제3호에 따른 적법한 인터넷 홈페이지 이용 선거운동의 일환이며,
              같은 법 제88조의 타 후보자를 위한 선거운동 금지 예외 조항(같은 정당 후보자 지원)에 따라 합법적으로 운영됩니다.
              또한, 「공직선거법」 제87조 및 제89조에서 엄격히 금지하는 사조직, 정당의 외곽단체 또는 유사기관이 아님을 분명히 밝힙니다.
            </p>
            <p className="text-xs">
              개혁신당 공식 홈페이지:{" "}
              <a
                href="https://rallypoint.kr/main"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                https://rallypoint.kr/main
              </a>
            </p>
            <p className="text-xs">
              홈페이지 관련 연락:{" "}
              <a
                href="mailto:seungbeom2004@gmail.com"
                className="text-primary hover:underline"
              >
                seungbeom2004@gmail.com (손승범)
              </a>
            </p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1 bg-background rounded-xl p-1 border border-border mb-6">
          <button
            onClick={() => setActiveTab("candidates")}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === "candidates" ? "bg-primary text-white" : "text-muted hover:text-foreground"}`}
          >
            후보자 목록
          </button>
          <button
            onClick={() => setActiveTab("sns")}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === "sns" ? "bg-primary text-white" : "text-muted hover:text-foreground"}`}
          >
            SNS 활동
          </button>
        </div>

        {/* Candidates tab */}
        {activeTab === "candidates" && (
          <div>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="text-lg font-bold text-foreground">후보자 목록</h2>
              <div className="flex gap-2">
                {(["signup", "likes", "pledges"] as const).map((order) => (
                  <button
                    key={order}
                    onClick={() => setSortOrder(order)}
                    aria-pressed={sortOrder === order}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                      sortOrder === order
                        ? "bg-primary text-white border-primary"
                        : "border-border text-muted hover:text-foreground"
                    }`}
                  >
                    {order === "signup" ? "가입순" : order === "likes" ? "응원 많은 순" : "공약 많은 순"}
                  </button>
                ))}
              </div>
            </div>

            {sorted.length === 0 ? (
              <p className="text-muted text-sm text-center py-8">등록된 후보자가 없습니다.</p>
            ) : (
              <div className="space-y-3">
                {sorted.map((c, i) => (
                  <Link
                    key={c.id}
                    href={`/candidates/${c.id}`}
                    className="flex items-center gap-4 p-4 bg-surface border border-border rounded-xl hover:border-primary/30 hover:bg-primary/5 transition-colors"
                  >
                    {/* Rank — only rendered when a ranked sort is active */}
                    {sortOrder !== "signup" ? (
                      <span className="text-sm font-bold text-muted w-6 text-center shrink-0" aria-label={`${i + 1}위`}>
                        {i + 1}
                      </span>
                    ) : (
                      <span className="w-6 shrink-0" aria-hidden="true" />
                    )}
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-primary-light overflow-hidden shrink-0 flex items-center justify-center">
                      {c.profileImage ? (
                        <Image
                          src={c.profileImage}
                          alt={c.name}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-primary font-bold text-lg">{c.name.charAt(0)}</span>
                      )}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground">{c.name}</span>
                        <span
                          className="text-xs text-muted bg-background px-2 py-0.5 rounded-full border border-border max-w-[12rem] truncate"
                          title={c.district}
                        >
                          {c.district}
                        </span>
                      </div>
                      {c.slogan && (
                        <p className="text-xs text-muted mt-0.5 truncate">{c.slogan}</p>
                      )}
                    </div>
                    {/* Stats */}
                    <div className="flex items-center gap-2 shrink-0">
                      {c.pledgeCount !== undefined && (
                        <div className="flex items-center gap-0.5 text-xs text-muted" aria-label={`공약 ${c.pledgeCount}건`}>
                          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                            <path d="M3 3h10M3 6h10M3 9h6" strokeLinecap="round" />
                          </svg>
                          <span aria-hidden="true">{c.pledgeCount}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-0.5 text-xs text-muted" aria-label={`응원 ${c.likeCount}개`}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                        <span aria-hidden="true">{c.likeCount}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SNS tab */}
        {activeTab === "sns" && (
          <div>
            <p className="text-sm text-muted mb-4">SNS 계정을 등록한 후보자들의 활동을 확인하세요.</p>
            <div className="space-y-3">
              {sorted
                .filter((c) => c.youtube || c.instagram || c.twitter || c.facebook || c.tiktok || c.kakao || c.naverBlog)
                .map((c) => (
                  <CandidateSnsCard key={c.id} candidate={c} />
                ))}
            </div>
            {sorted.filter((c) => c.youtube || c.instagram || c.twitter || c.facebook || c.tiktok || c.kakao || c.naverBlog).length === 0 && (
              <p className="text-muted text-sm text-center py-8">SNS 계정을 등록한 후보자가 없습니다.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
