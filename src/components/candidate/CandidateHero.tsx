import Image from "next/image";
import { Badge } from "@/components/ui";
import CandidateLikeButton from "./CandidateLikeButton";

interface SocialLinks {
  youtube: string | null;
  instagram: string | null;
  twitter: string | null;
  facebook: string | null;
  tiktok: string | null;
  kakao: string | null;
  naverBlog: string | null;
}

interface CandidateHeroProps {
  candidate: {
    id: string;
    name: string;
    district: string;
    profileImage: string | null;
    slogan: string | null;
    party: string;
    caucusStatus?: string | null;
  } & Partial<SocialLinks>;
}

const SOCIAL_ICONS: {
  key: keyof SocialLinks;
  label: string;
  icon: React.ReactNode;
  getHref: (v: string) => string;
}[] = [
  {
    key: "youtube",
    label: "YouTube",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
    getHref: (v) => v,
  },
  {
    key: "instagram",
    label: "Instagram",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
      </svg>
    ),
    getHref: (v) => v,
  },
  {
    key: "twitter",
    label: "X",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.213 5.567zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    getHref: (v) => v,
  },
  {
    key: "facebook",
    label: "Facebook",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
    getHref: (v) => v,
  },
  {
    key: "tiktok",
    label: "TikTok",
    icon: (
      <svg width="16" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.84 4.84 0 0 1-1.01-.07z" />
      </svg>
    ),
    getHref: (v) => v,
  },
  {
    key: "kakao",
    label: "KakaoTalk",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 3C6.477 3 2 6.477 2 10.8c0 2.755 1.638 5.17 4.1 6.617l-1.05 3.9a.3.3 0 0 0 .456.324L9.7 19.24A11.4 11.4 0 0 0 12 19.5c5.523 0 10-3.477 10-7.8S17.523 3 12 3z" />
      </svg>
    ),
    getHref: (v) => {
      if (v.startsWith("http")) return v;
      return `https://open.kakao.com/o/${v}`;
    },
  },
  {
    key: "naverBlog",
    label: "Naver Blog",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16.273 12.845 7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z" />
      </svg>
    ),
    getHref: (v) => v,
  },
];

export default function CandidateHero({ candidate }: CandidateHeroProps) {
  const socialEntries = SOCIAL_ICONS.filter(({ key }) => !!candidate[key]);

  return (
    <div className="relative bg-gradient-to-br from-primary to-primary-hover overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: "radial-gradient(circle at 25% 25%, white 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }} />
      </div>

      <div className="relative max-w-screen-xl mx-auto px-4 py-12 md:py-16">
        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
          {/* Profile Image */}
          <div className="w-28 h-28 md:w-36 md:h-36 rounded-full bg-white/20 border-4 border-white/50 overflow-hidden shrink-0">
            {candidate.profileImage ? (
              <Image
                src={candidate.profileImage}
                alt={candidate.name}
                width={144}
                height={144}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-white text-4xl font-bold">
                  {candidate.name.charAt(0)}
                </span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="text-center md:text-left">
            <div className="mb-2 flex flex-col items-center md:items-start gap-1.5">
              {/* Reform party logo */}
              <div className="bg-white rounded-lg px-2 py-1 flex items-center justify-center shrink-0">
                <Image
                  src="/images/reform-party-logo.png"
                  alt={candidate.party}
                  width={72}
                  height={24}
                  className="h-5 w-auto object-contain"
                />
              </div>
              {/* District + nomination badges on same row */}
              <div className="flex items-center gap-2 flex-wrap justify-center md:justify-start">
                <Badge className="bg-white/20 text-white break-keep">{candidate.district}</Badge>
                {candidate.caucusStatus === "공천 확정" && (
                  <Badge className="bg-green-500 text-white border-transparent">공천 확정</Badge>
                )}
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              {candidate.name}
            </h1>
            {candidate.slogan && (
              <p className="text-lg text-white/90 max-w-lg break-keep">
                {candidate.slogan}
              </p>
            )}

            {/* Social links + Like button */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-4">
              <CandidateLikeButton candidateId={candidate.id} />
              {socialEntries.map(({ key, label, icon, getHref }) => {
                const value = candidate[key] as string;
                return (
                  <a
                    key={key}
                    href={getHref(value)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    title={label}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-full text-xs font-medium transition-colors"
                  >
                    {icon}
                    <span>{label}</span>
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
