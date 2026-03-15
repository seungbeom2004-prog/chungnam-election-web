"use client";

import Image from "next/image";
import Link from "next/link";
import type { CandidateForMap } from "@/components/map/MapPageContent";
import CandidateLikeButton from "@/components/candidate/CandidateLikeButton";

interface Props {
  candidate: CandidateForMap;
  onClose: () => void;
}

const SOCIAL_BUTTONS: {
  key: keyof CandidateForMap;
  label: string;
  color: string;
  getHref: (v: string) => string;
  icon: React.ReactNode;
}[] = [
  {
    key: "youtube",
    label: "YouTube",
    color: "#FF0000",
    getHref: (v) => v,
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
  {
    key: "instagram",
    label: "Instagram",
    color: "#E1306C",
    getHref: (v) => v,
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
      </svg>
    ),
  },
  {
    key: "twitter",
    label: "X",
    color: "#000000",
    getHref: (v) => v,
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.213 5.567zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    key: "facebook",
    label: "Facebook",
    color: "#1877F2",
    getHref: (v) => v,
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    key: "tiktok",
    label: "TikTok",
    color: "#010101",
    getHref: (v) => v,
    icon: (
      <svg width="12" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.84 4.84 0 0 1-1.01-.07z" />
      </svg>
    ),
  },
  {
    key: "kakao",
    label: "KakaoTalk",
    color: "#FAE100",
    getHref: (v) => (v.startsWith("http") ? v : `https://open.kakao.com/o/${v}`),
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 3C6.477 3 2 6.477 2 10.8c0 2.755 1.638 5.17 4.1 6.617l-1.05 3.9a.3.3 0 0 0 .456.324L9.7 19.24A11.4 11.4 0 0 0 12 19.5c5.523 0 10-3.477 10-7.8S17.523 3 12 3z" />
      </svg>
    ),
  },
  {
    key: "naverBlog",
    label: "Naver",
    color: "#03C75A",
    getHref: (v) => v,
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16.273 12.845 7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z" />
      </svg>
    ),
  },
];

export default function CandidatePopup({ candidate, onClose }: Props) {
  const electionLabel = candidate.detailedElectionName || candidate.electionName || candidate.electionType || "";
  // Show most specific district (ward portion only when available)
  const spaceIdx = candidate.district ? candidate.district.indexOf(" ") : -1;
  const specificDistrict = spaceIdx > -1 ? candidate.district.slice(spaceIdx + 1) : candidate.district;
  const socialLinks = SOCIAL_BUTTONS.filter(({ key }) => !!candidate[key]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${candidate.name} 후보자 정보`}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Popup Card */}
      <div
        className="relative z-50 bg-surface rounded-2xl shadow-2xl border border-border w-full max-w-sm mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "popupSlideUp 250ms ease-out" }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="팝업 닫기"
          className="absolute top-3 right-3 text-muted hover:text-foreground transition-colors z-10"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
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
            <span className="text-xs text-muted">{specificDistrict}</span>
          </div>

          {/* Social links */}
          {socialLinks.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {socialLinks.map(({ key, label, color, getHref, icon }) => {
                const value = candidate[key] as string;
                return (
                  <a
                    key={key}
                    href={getHref(value)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    title={label}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-white text-xs font-medium transition-opacity hover:opacity-80"
                    style={{ backgroundColor: color }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {icon}
                    <span>{label}</span>
                  </a>
                );
              })}
            </div>
          )}
        </div>

        {/* 응원하기 + CTA */}
        <div className="px-5 pb-5 flex flex-col gap-2.5">
          <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
            <CandidateLikeButton candidateId={candidate.id} variant="surface" />
          </div>
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
