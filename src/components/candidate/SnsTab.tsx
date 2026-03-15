"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import type { YouTubeVideo } from "@/app/api/sns/youtube/route";

interface SocialLinks {
  youtube?: string | null;
  instagram?: string | null;
  twitter?: string | null;
  facebook?: string | null;
  tiktok?: string | null;
  kakao?: string | null;
  naverBlog?: string | null;
}

interface Props extends SocialLinks {
  articleUrl?: string | null;
  articleTitle?: string | null;
}

const PLATFORM_META: {
  key: keyof SocialLinks;
  label: string;
  color: string;
  icon: React.ReactNode;
}[] = [
  {
    key: "youtube",
    label: "YouTube",
    color: "#FF0000",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
  {
    key: "instagram",
    label: "Instagram",
    color: "#E1306C",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
      </svg>
    ),
  },
  {
    key: "facebook",
    label: "Facebook",
    color: "#1877F2",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    key: "twitter",
    label: "X (Twitter)",
    color: "#000000",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.213 5.567zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    key: "tiktok",
    label: "TikTok",
    color: "#000000",
    icon: (
      <svg width="18" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.84 4.84 0 0 1-1.01-.07z" />
      </svg>
    ),
  },
  {
    key: "naverBlog",
    label: "네이버 블로그",
    color: "#03C75A",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16.273 12.845 7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z" />
      </svg>
    ),
  },
  {
    key: "kakao",
    label: "KakaoTalk",
    color: "#3A1D1D",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="#FEE500">
        <path d="M12 3C6.477 3 2 6.477 2 10.8c0 2.755 1.638 5.17 4.1 6.617l-1.05 3.9a.3.3 0 0 0 .456.324L9.7 19.24A11.4 11.4 0 0 0 12 19.5c5.523 0 10-3.477 10-7.8S17.523 3 12 3z" />
      </svg>
    ),
  },
];

function relativeTime(iso: string) {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 3600) return Math.floor(diff / 60) + "분 전";
  if (diff < 86400) return Math.floor(diff / 3600) + "시간 전";
  if (diff < 86400 * 30) return Math.floor(diff / 86400) + "일 전";
  return d.toLocaleDateString("ko-KR");
}

function getPlatformHref(key: keyof SocialLinks, url: string): string {
  if (key === "kakao" && !url.startsWith("http")) return `https://open.kakao.com/o/${url}`;
  return url;
}

export default function SnsTab(props: Props) {
  const { articleUrl, articleTitle, ...socialProps } = props;
  const availablePlatforms = PLATFORM_META.filter(({ key }) => !!socialProps[key]);
  const [activeKey, setActiveKey] = useState<keyof SocialLinks | "all">("all");
  const [ytVideos, setYtVideos] = useState<YouTubeVideo[]>([]);
  const [ytLoading, setYtLoading] = useState(false);
  const [ytFetched, setYtFetched] = useState(false);

  const needYt = (activeKey === "all" || activeKey === "youtube") && !!socialProps.youtube;

  useEffect(() => {
    if (!needYt || ytFetched || !socialProps.youtube) return;
    setYtLoading(true);
    fetch(`/api/sns/youtube?url=${encodeURIComponent(socialProps.youtube)}`)
      .then((r) => r.json())
      .then((json) => { setYtVideos(json.videos ?? []); })
      .catch(() => {})
      .finally(() => { setYtLoading(false); setYtFetched(true); });
  }, [needYt, ytFetched, socialProps.youtube]);

  const hasAnySns = availablePlatforms.length > 0;

  if (!hasAnySns && !articleUrl) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-muted">등록된 SNS 계정이 없습니다.</p>
      </div>
    );
  }

  const nonYtPlatforms = availablePlatforms.filter((p) => p.key !== "youtube");
  const showYt = (activeKey === "all" || activeKey === "youtube") && !!socialProps.youtube;
  const showLinks =
    activeKey === "all"
      ? nonYtPlatforms
      : availablePlatforms.filter((p) => p.key === activeKey && p.key !== "youtube");

  return (
    <div>
      {/* Platform selector tabs — only shown when there are SNS accounts */}
      {hasAnySns && <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setActiveKey("all")}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
            activeKey === "all"
              ? "bg-foreground text-background border-foreground"
              : "bg-background border-border text-muted hover:text-foreground"
          }`}
        >
          전체 보기
        </button>
        {availablePlatforms.map(({ key, label, color, icon }) => (
          <button
            key={key}
            onClick={() => setActiveKey(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
              activeKey === key
                ? "text-white border-transparent"
                : "bg-background border-border text-muted hover:text-foreground"
            }`}
            style={activeKey === key ? { backgroundColor: color, borderColor: color } : {}}
          >
            <span style={{ color: activeKey === key ? "white" : color }}>{icon}</span>
            {label}
          </button>
        ))}
      </div>}

      {/* Content */}
      <div className="space-y-8">
        {/* YouTube section */}
        {showYt && (
          <div>
            {activeKey === "all" && (
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-red-600">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                    </svg>
                  </span>
                  <span className="text-sm font-semibold text-foreground">YouTube</span>
                </div>
                <a href={socialProps.youtube ?? "#"} target="_blank" rel="noopener noreferrer" className="text-xs text-red-600 hover:underline">
                  채널 방문 ↗
                </a>
              </div>
            )}
            {ytLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : ytVideos.length > 0 ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {ytVideos.map((video) => (
                    <a
                      key={video.id}
                      href={video.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-xl overflow-hidden border border-border bg-surface hover:shadow-md transition-shadow group"
                    >
                      <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                        <Image
                          src={video.thumbnail}
                          alt={video.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-200"
                          unoptimized
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-10 h-10 bg-red-600/90 rounded-full flex items-center justify-center">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z" /></svg>
                          </div>
                        </div>
                      </div>
                      <div className="p-2.5">
                        <p className="text-xs font-medium text-foreground line-clamp-2 leading-snug">{video.title}</p>
                        <p className="text-[10px] text-muted mt-1">{relativeTime(video.published)}</p>
                      </div>
                    </a>
                  ))}
                </div>
                <div className="mt-3 text-center">
                  <a
                    href={socialProps.youtube ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-full hover:bg-red-50 transition-colors"
                  >
                    YouTube 채널 더보기 ↗
                  </a>
                </div>
              </>
            ) : (
              <LinkCard
                href={socialProps.youtube ?? "#"}
                label="YouTube 채널 방문"
                color="#FF0000"
                icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>}
                description="YouTube에서 최신 영상을 확인하세요."
              />
            )}
          </div>
        )}

        {/* Link cards for non-YouTube platforms */}
        {showLinks.length > 0 && (
          <div>
            {activeKey === "all" && nonYtPlatforms.length > 0 && (
              <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">SNS 채널</p>
            )}
            <div className="space-y-3">
              {showLinks.map(({ key, label, color, icon }) => {
                const url = socialProps[key];
                if (!url) return null;
                return (
                  <LinkCard
                    key={key}
                    href={getPlatformHref(key, url)}
                    label={`${label} 방문`}
                    color={color}
                    icon={icon}
                    description={`${label}에서 최신 소식을 확인하세요.`}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Article card — shown below all SNS content */}
        {articleUrl && (
          <div>
            <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">📰 관련 기사</p>
            <a
              href={articleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-4 p-4 border border-border rounded-xl bg-surface hover:shadow-md transition-shadow group"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-slate-100 text-slate-600">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M4 4h16v4H4zM4 10h10M4 14h10M4 18h6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors leading-snug">
                  {articleTitle || "기사 읽기"}
                </p>
                <p className="text-xs text-muted mt-1 truncate">{articleUrl}</p>
              </div>
              <svg className="shrink-0 text-muted mt-0.5" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function LinkCard({ href, label, color, icon, description }: {
  href: string;
  label: string;
  color: string;
  icon: React.ReactNode;
  description: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-4 p-4 border border-border rounded-xl bg-surface hover:shadow-md transition-shadow group"
    >
      <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-white" style={{ backgroundColor: color }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{label}</p>
        <p className="text-xs text-muted mt-0.5 truncate">{href}</p>
        <p className="text-xs text-muted/70 mt-0.5">{description}</p>
      </div>
      <svg className="shrink-0 text-muted" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </a>
  );
}
