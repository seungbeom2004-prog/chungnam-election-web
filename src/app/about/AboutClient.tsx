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
}

type SortOrder = "signup" | "likes";

export default function AboutClient({ candidates }: { candidates: Candidate[] }) {
  const [sortOrder, setSortOrder] = useState<SortOrder>("signup");
  const { isCute } = useTheme();

  const sorted = [...candidates].sort((a, b) => {
    if (sortOrder === "likes") {
      if (b.likeCount !== a.likeCount) return b.likeCount - a.likeCount;
      // Same likes: earlier signup first
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

        {/* Candidate list */}
        <div>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="text-lg font-bold text-foreground">후보자 목록</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setSortOrder("signup")}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  sortOrder === "signup"
                    ? "bg-primary text-white border-primary"
                    : "border-border text-muted hover:text-foreground"
                }`}
              >
                가입순
              </button>
              <button
                onClick={() => setSortOrder("likes")}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  sortOrder === "likes"
                    ? "bg-primary text-white border-primary"
                    : "border-border text-muted hover:text-foreground"
                }`}
              >
                응원 많은 순
              </button>
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
                  {/* Rank */}
                  <span className="text-sm font-bold text-muted w-6 text-center shrink-0">
                    {sortOrder === "likes" ? i + 1 : ""}
                  </span>
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
                      <span className="text-xs text-muted bg-background px-2 py-0.5 rounded-full border border-border">
                        {c.district}
                      </span>
                    </div>
                    {c.slogan && (
                      <p className="text-xs text-muted mt-0.5 truncate">{c.slogan}</p>
                    )}
                  </div>
                  {/* Like count */}
                  <div className="flex items-center gap-1 text-xs text-muted shrink-0">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                    <span>{c.likeCount}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
