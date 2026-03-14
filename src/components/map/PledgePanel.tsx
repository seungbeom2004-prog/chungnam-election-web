"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { QRCodeCanvas } from "qrcode.react";
import { useMapStore } from "@/store/useMapStore";
import { Badge } from "@/components/ui";
import type { PledgeCollaboration } from "@/types";

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

type MediaType = "youtube" | "instagram" | "facebook" | null;

/** Detect the type of media URL. */
function detectMediaType(url: string): MediaType {
  if (/youtube\.com|youtu\.be/.test(url)) return "youtube";
  if (/instagram\.com\/(p|reel)\//.test(url)) return "instagram";
  if (/facebook\.com/.test(url)) return "facebook";
  return null;
}

export default function PledgePanel() {
  const { selectedPledge, isPanelOpen, setIsPanelOpen } = useMapStore();

  if (!isPanelOpen || !selectedPledge) return null;

  const pledge = selectedPledge;

  return (
    <>
      {/* Mobile: semi-transparent backdrop — tap to close */}
      <div
        className="md:hidden fixed inset-0 z-20 bg-black/20"
        onClick={() => setIsPanelOpen(false)}
      />
      {/* Mobile Bottom Sheet — stops click propagation so backdrop doesn't fire */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-surface rounded-t-2xl shadow-xl border-t border-border max-h-[70vh] overflow-y-auto"
        style={{ animation: "slideUp 300ms ease-out" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1 bg-border rounded-full mx-auto mt-3" />
        <PledgePanelContent
          pledge={pledge}
          onClose={() => setIsPanelOpen(false)}
        />
      </div>

      {/* Desktop: transparent backdrop */}
      <div
        className="hidden md:block fixed inset-0 z-20"
        onClick={() => setIsPanelOpen(false)}
      />
      {/* Desktop Sidebar */}
      <div
        className="hidden md:block fixed top-14 left-0 z-30 w-96 h-[calc(100vh-3.5rem)] bg-surface border-r border-border shadow-xl overflow-y-auto"
        style={{ animation: "slideRight 300ms ease-out" }}
        onClick={(e) => e.stopPropagation()}
      >
        <PledgePanelContent
          pledge={pledge}
          onClose={() => setIsPanelOpen(false)}
        />
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        @keyframes slideRight {
          from { transform: translateX(-100%); }
          to   { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}

function PledgePanelContent({
  pledge,
  onClose,
}: {
  pledge: NonNullable<ReturnType<typeof useMapStore.getState>["selectedPledge"]>;
  onClose: () => void;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"description" | "sns">("description");
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);
  const [collaborators, setCollaborators] = useState<PledgeCollaboration[]>([]);
  const [collabLoading, setCollabLoading] = useState(false);

  const embedUrl = pledge.youtubeUrl || "";
  const mediaType = embedUrl ? detectMediaType(embedUrl) : null;
  const youtubeId =
    mediaType === "youtube"
      ? extractYouTubeId(embedUrl)
      : extractYouTubeId(pledge.description ?? "");

  const hasMedia = !!youtubeId || !!pledge.imageUrl || mediaType === "instagram" || mediaType === "facebook";

  const pledgeUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/?pledge=${pledge.id}`
      : "";

  // Fetch collaborators whenever this pledge is shown
  useEffect(() => {
    setCollaborators([]);
    setCollabLoading(true);
    fetch(`/api/pledges/${pledge.id}/collaborators`)
      .then((r) => r.json())
      .then((json) => setCollaborators(json.data ?? []))
      .catch(() => {})
      .finally(() => setCollabLoading(false));
  }, [pledge.id]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(pledgeUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  const navigateToCandidate = (candidateId: string) => {
    onClose();
    router.push(`/candidates/${candidateId}`);
  };

  return (
    <div className="p-5">
      {/* Close button */}
      <button
        onClick={onClose}
        aria-label="닫기"
        className="absolute top-4 right-4 text-muted hover:text-foreground transition-colors"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {/* Title — always visible */}
      <h3 className="text-lg font-bold text-foreground pr-8 mb-3">{pledge.title}</h3>

      {/* Tabs */}
      <div role="tablist" aria-label="공약 상세 탭" className="flex gap-0 border-b border-border mb-4">
        <button
          role="tab"
          aria-selected={activeTab === "description"}
          aria-controls="tab-description"
          onClick={() => setActiveTab("description")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
            activeTab === "description"
              ? "border-primary text-primary"
              : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          공약 설명
        </button>
        <button
          role="tab"
          aria-selected={activeTab === "sns"}
          aria-controls="tab-sns"
          onClick={() => setActiveTab("sns")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px flex items-center gap-1.5 ${
            activeTab === "sns"
              ? "border-primary text-primary"
              : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          관련 SNS
          {hasMedia && (
            <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* ── 공약 설명 tab ──────────────────────────────────────────────────── */}
      {activeTab === "description" && (
        <div className="space-y-4">
          {/* Budget Badge */}
          {pledge.budget && (
            <Badge variant="primary">예산: {pledge.budget}</Badge>
          )}

          {/* Address */}
          {pledge.address && (
            <p className="text-sm text-muted flex items-center gap-1">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 7.5a1.75 1.75 0 100-3.5 1.75 1.75 0 000 3.5z" stroke="currentColor" strokeWidth="1.2" />
                <path d="M7 1.167A4.083 4.083 0 0111.083 5.25C11.083 8.313 7 12.833 7 12.833S2.917 8.313 2.917 5.25A4.083 4.083 0 017 1.167z" stroke="currentColor" strokeWidth="1.2" />
              </svg>
              {pledge.address}
            </p>
          )}

          {/* Description */}
          <p className="text-sm text-foreground leading-relaxed">
            {pledge.description}
          </p>

          {/* Author card — highlighted with primary border */}
          {pledge.candidate && (
            <button
              onClick={() => navigateToCandidate(pledge.candidate!.id)}
              className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-primary bg-primary-light hover:bg-primary/10 transition-colors text-left cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0 border-2 border-primary/30">
                {pledge.candidate.profileImage ? (
                  <Image
                    src={pledge.candidate.profileImage}
                    alt={pledge.candidate.name}
                    width={40}
                    height={40}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <span className="text-primary font-bold text-sm">
                    {pledge.candidate.name.charAt(0)}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-foreground">
                    {pledge.candidate.name}
                  </p>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary text-white leading-none">
                    공약 작성자
                  </span>
                </div>
                <p className="text-xs text-muted mt-0.5">{pledge.candidate.district}</p>
              </div>
              <svg className="shrink-0 text-primary" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}

          {/* Collaborators list */}
          {collabLoading ? (
            <div className="flex justify-center py-2">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : collaborators.length > 0 ? (
            <div>
              <p className="text-xs font-semibold text-muted mb-2">공동 제안자들:</p>
              <div className="space-y-2">
                {collaborators.map((collab) => {
                  const c = collab.candidate;
                  return (
                    <button
                      key={collab.id}
                      onClick={() => c && navigateToCandidate(c.id)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-background hover:bg-border/50 transition-colors text-left cursor-pointer"
                    >
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                        {c?.profileImage ? (
                          <Image
                            src={c.profileImage}
                            alt={c.name}
                            width={36}
                            height={36}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <span className="text-primary font-bold text-xs">
                            {(c?.name ?? "?").charAt(0)}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">
                          {c?.name ?? "후보자"}
                        </p>
                        {c?.district && (
                          <p className="text-xs text-muted mt-0.5">{c.district}</p>
                        )}
                      </div>
                      <svg className="shrink-0 text-muted" width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* ── 관련 SNS tab ───────────────────────────────────────────────────── */}
      {activeTab === "sns" && (
        <div className="space-y-4">
          {/* Pledge Image */}
          {pledge.imageUrl && (
            <div className="relative w-full h-48 rounded-xl overflow-hidden">
              <Image src={pledge.imageUrl} alt={pledge.title} fill className="object-cover" />
            </div>
          )}

          {/* YouTube */}
          {youtubeId && (
            <div className="relative w-full rounded-xl overflow-hidden bg-black" style={{ paddingBottom: "56.25%" }}>
              <iframe
                className="absolute inset-0 w-full h-full"
                src={`https://www.youtube.com/embed/${youtubeId}`}
                title="관련 영상"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          {/* Instagram */}
          {mediaType === "instagram" && (
            <div className="flex justify-center">
              <blockquote
                className="instagram-media"
                data-instgrm-permalink={embedUrl}
                data-instgrm-version="14"
                style={{ maxWidth: 540, width: "100%" }}
              />
              {/* eslint-disable-next-line @next/next/no-sync-scripts */}
              <script async src="//www.instagram.com/embed.js" />
            </div>
          )}

          {/* Facebook */}
          {mediaType === "facebook" && (
            <div className="flex justify-center">
              <iframe
                src={`https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(embedUrl)}&show_text=true&width=500`}
                width="500"
                height="400"
                style={{ border: "none", overflow: "hidden" }}
                scrolling="no"
                allowFullScreen
                allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
              />
            </div>
          )}

          {/* Empty state */}
          {!hasMedia && (
            <div className="text-center py-10">
              <p className="text-sm text-muted">등록된 SNS 콘텐츠가 없습니다.</p>
            </div>
          )}
        </div>
      )}

      {/* Share / QR — always visible at bottom */}
      <div className="mt-5 pt-4 border-t border-border">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowQR((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted border border-border rounded-lg hover:text-foreground hover:border-foreground/30 transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/>
              <path d="M14 14h1v1h-1zM17 14h1v1h-1zM14 17h1v1h-1zM17 17h4v4h-4z"/>
            </svg>
            QR 코드
          </button>
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted border border-border rounded-lg hover:text-foreground hover:border-foreground/30 transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
            {copied ? "복사됨!" : "링크 복사"}
          </button>
        </div>
        {showQR && pledgeUrl && (
          <div className="mt-3 flex flex-col items-center gap-2 p-3 bg-background rounded-xl">
            <QRCodeCanvas value={pledgeUrl} size={160} level="M" includeMargin />
            <p className="text-[10px] text-muted text-center break-all">{pledgeUrl}</p>
          </div>
        )}
      </div>
    </div>
  );
}
