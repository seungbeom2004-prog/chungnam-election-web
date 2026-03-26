"use client";

import { useRef, useState, useCallback, useEffect } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────
interface DailyPost {
  id: string;
  title: string | null;
  content: string;
  authorName: string;
  city: string | null;
  dong: string | null;
  postType: string;
  likeCount: number;
  viewCount: number;
  createdAt: string;
}
interface CityBreakdown { city: string; reports: number; proposals: number; total: number }
export interface DailyStats {
  date: string;
  reports: DailyPost[];
  proposals: DailyPost[];
  totalReports: number;
  totalProposals: number;
  cityBreakdown: CityBreakdown[];
  topLikedPosts: DailyPost[];
}
interface Props {
  data: DailyStats;
  dayOffset: number;
  targetDate: Date;
}

// ── Constants ──────────────────────────────────────────────────────────────────
const SLIDE_W = 540;
const SLIDE_H = 675;

// Hex colors (avoids Tailwind oklch gradient crash)
const C = {
  orange:    "#f97316",
  orange600: "#ea580c",
  red500:    "#ef4444",
  amber400:  "#fbbf24",
  amber500:  "#f59e0b",
  gray950:   "#030712",
  gray900:   "#111827",
  gray800:   "#1f2937",
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function dayLabel(offset: number) {
  if (offset === 0) return "오늘";
  if (offset === -1) return "어제";
  return `${Math.abs(offset)}일 전`;
}
function shortDate(d: Date) {
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}
function truncate(str: string, n: number) {
  return str.length > n ? str.slice(0, n) + "…" : str;
}

// ── Slide wrapper ─────────────────────────────────────────────────────────────
function Slide({ id, children, bg }: { id: string; children: React.ReactNode; bg: React.CSSProperties }) {
  return (
    <div
      id={id}
      className="relative overflow-hidden select-none"
      style={{ width: SLIDE_W, height: SLIDE_H, flexShrink: 0, ...bg }}
    >
      {children}
    </div>
  );
}

// ── Top branding bar ──────────────────────────────────────────────────────────
function TopBar({ dark = true }: { dark?: boolean }) {
  const textColor = dark ? "rgba(255,255,255,0.95)" : "#111827";
  const subColor  = dark ? "rgba(255,255,255,0.65)" : "#374151";
  return (
    <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-7 pt-5 z-10">
      {/* Logo — plain <img> for screenshot capture */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/reform-party-logo.png"
        alt="개혁신당"
        width={96}
        height={37}
        crossOrigin="anonymous"
        style={{ filter: dark ? "brightness(0) invert(1)" : "none", display: "block" }}
      />
      <div className="text-right leading-tight">
        <p style={{ color: textColor, fontSize: 17, fontWeight: 900, lineHeight: 1.2 }}>4 손승범</p>
        <p style={{ color: subColor, fontSize: 10, fontWeight: 600, lineHeight: 1.4 }}>문성동 봉명동 성정1동 성정2동</p>
        <p style={{ color: subColor, fontSize: 10, fontWeight: 600, lineHeight: 1.4 }}>천안시의원 후보</p>
      </div>
    </div>
  );
}

// Slide counter
function Counter({ current, total, dark = true }: { current: number; total: number; dark?: boolean }) {
  return (
    <div style={{
      position: "absolute", top: 28, left: "50%", transform: "translateX(-50%)",
      fontSize: 11, fontWeight: 700, color: dark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.35)",
      fontVariantNumeric: "tabular-nums",
    }}>
      {String(current).padStart(2, "0")}/{String(total).padStart(2, "0")}
    </div>
  );
}

// ── Slide 1: Cover ────────────────────────────────────────────────────────────
function SlideCover({ id, data, total, targetDate, dayOffset }: {
  id: string; data: DailyStats; total: number; targetDate: Date; dayOffset: number;
}) {
  const totalPosts = data.totalReports + data.totalProposals;
  return (
    <Slide id={id} bg={{ background: `linear-gradient(145deg, ${C.orange}, ${C.orange600}, ${C.red500})` }}>
      <TopBar dark />
      <Counter current={1} total={total} />

      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 36px", paddingTop: 64 }}>
        <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: 700, marginBottom: 8, letterSpacing: 1 }}>
          📍 충청남도 · {shortDate(targetDate)}
        </p>

        <div style={{ marginBottom: 16 }}>
          <p style={{ color: "white", fontSize: 24, fontWeight: 900, lineHeight: 1.3 }}>집 앞 불편,</p>
          <p style={{ color: "white", fontSize: 24, fontWeight: 900, lineHeight: 1.3 }}>오늘도 기록되고 있습니다</p>
        </div>

        {/* Big number */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 12, marginBottom: 28 }}>
          <span style={{ color: "white", fontSize: 120, fontWeight: 900, lineHeight: 1 }}>{totalPosts}</span>
          <div style={{ marginBottom: 16 }}>
            <p style={{ color: "white", fontSize: 28, fontWeight: 900 }}>건</p>
            <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: 600 }}>{dayLabel(dayOffset)} 접수</p>
          </div>
        </div>

        {/* Sub breakdown */}
        <div style={{ display: "flex", gap: 16 }}>
          <div style={{ background: "rgba(255,255,255,0.22)", borderRadius: 16, padding: "12px 20px" }}>
            <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 11, fontWeight: 600, marginBottom: 2 }}>📢 불편 제보</p>
            <p style={{ color: "white", fontSize: 34, fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>{data.totalReports}</p>
          </div>
          <div style={{ background: "rgba(255,255,255,0.22)", borderRadius: 16, padding: "12px 20px" }}>
            <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 11, fontWeight: 600, marginBottom: 2 }}>💡 공약 제안</p>
            <p style={{ color: "white", fontSize: 34, fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>{data.totalProposals}</p>
          </div>
        </div>
      </div>
    </Slide>
  );
}

// ── Slide 2: Top Reports ──────────────────────────────────────────────────────
function SlideTopReports({ id, data, total }: { id: string; data: DailyStats; total: number }) {
  const top = data.reports.slice(0, 3);
  return (
    <Slide id={id} bg={{ backgroundColor: C.gray950 }}>
      <TopBar dark />
      <Counter current={2} total={total} />
      <div style={{ position: "absolute", inset: 0, padding: "0 28px", paddingTop: 60, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ marginBottom: 20 }}>
          <p style={{ color: C.orange, fontSize: 10, fontWeight: 900, letterSpacing: 3, textTransform: "uppercase", marginBottom: 4 }}>TODAY&apos;S REPORT</p>
          <p style={{ color: "white", fontSize: 26, fontWeight: 900, lineHeight: 1.2 }}>오늘의 불편 제보</p>
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 13 }}>총 {data.totalReports}건 접수됨</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {top.map((post, idx) => {
            const rank = ["🥇", "🥈", "🥉"][idx];
            const text = post.title ?? post.content;
            const location = [post.city, post.dong].filter(Boolean).join(" ");
            return (
              <div key={post.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, background: "rgba(255,255,255,0.06)", borderRadius: 16, padding: "14px 16px", border: "1px solid rgba(255,255,255,0.09)" }}>
                <span style={{ fontSize: 24, flexShrink: 0, marginTop: 2 }}>{rank}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: "white", fontWeight: 700, fontSize: 14, lineHeight: 1.4, marginBottom: 3 }}>{truncate(text, 28)}</p>
                  {location && <p style={{ color: "rgba(249,115,22,0.75)", fontSize: 11 }}>📍 {location}</p>}
                  <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 11, marginTop: 2 }}>{post.authorName}</p>
                </div>
                {post.likeCount > 0 && (
                  <p style={{ color: "#f87171", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>❤️ {post.likeCount}</p>
                )}
              </div>
            );
          })}
        </div>
        {data.totalReports > 3 && (
          <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 11, textAlign: "center", marginTop: 14 }}>외 {data.totalReports - 3}건 더 →</p>
        )}
      </div>
    </Slide>
  );
}

// ── Slide 3: City Breakdown ───────────────────────────────────────────────────
function SlideCityMap({ id, data, total }: { id: string; data: DailyStats; total: number }) {
  const cities = data.cityBreakdown.slice(0, 5);
  const maxVal = cities[0]?.total ?? 1;
  return (
    <Slide id={id} bg={{ backgroundColor: C.gray950 }}>
      <TopBar dark />
      <Counter current={3} total={total} />
      <div style={{ position: "absolute", inset: 0, padding: "0 28px", paddingTop: 60, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ marginBottom: 20 }}>
          <p style={{ color: C.orange, fontSize: 10, fontWeight: 900, letterSpacing: 3, textTransform: "uppercase", marginBottom: 4 }}>AREA BREAKDOWN</p>
          <p style={{ color: "white", fontSize: 26, fontWeight: 900, lineHeight: 1.2 }}>지역별 현황</p>
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 13 }}>제보/제안이 많은 지역 TOP {cities.length}</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {cities.map((item, idx) => {
            const pct = maxVal > 0 ? (item.total / maxVal) * 100 : 0;
            const reportPct = item.total > 0 ? (item.reports / item.total) * 100 : 0;
            return (
              <div key={item.city} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ color: C.orange, fontWeight: 900, fontSize: 13, width: 18, textAlign: "right", flexShrink: 0 }}>{idx + 1}</span>
                <span style={{ color: "white", fontWeight: 700, fontSize: 13, width: 56, flexShrink: 0 }}>{item.city}</span>
                <div style={{ flex: 1, position: "relative", height: 26, background: "rgba(255,255,255,0.1)", borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, overflow: "hidden" }}>
                    <div style={{ display: "flex", height: "100%" }}>
                      <div style={{ width: `${reportPct}%`, background: `linear-gradient(to right, ${C.orange}, ${C.red500})` }} />
                      <div style={{ flex: 1, background: `linear-gradient(to right, ${C.amber400}, ${C.amber500})` }} />
                    </div>
                  </div>
                  <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "white", fontSize: 11, fontWeight: 900 }}>{item.total}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 20 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.45)", fontSize: 11 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: C.orange, flexShrink: 0, display: "inline-block" }} />불편제보
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.45)", fontSize: 11 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: C.amber400, flexShrink: 0, display: "inline-block" }} />공약제안
          </span>
        </div>
      </div>
    </Slide>
  );
}

// ── Slide 4: Popular Posts ────────────────────────────────────────────────────
function SlidePopular({ id, data, total }: { id: string; data: DailyStats; total: number }) {
  const topLiked = data.topLikedPosts.filter(p => p.likeCount > 0).slice(0, 3);
  return (
    <Slide id={id} bg={{ background: `linear-gradient(to bottom, ${C.gray950}, ${C.gray900})` }}>
      <TopBar dark />
      <Counter current={4} total={total} />
      <div style={{ position: "absolute", inset: 0, padding: "0 28px", paddingTop: 60, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ marginBottom: 20 }}>
          <p style={{ color: "#f87171", fontSize: 10, fontWeight: 900, letterSpacing: 3, textTransform: "uppercase", marginBottom: 4 }}>POPULAR TODAY</p>
          <p style={{ color: "white", fontSize: 26, fontWeight: 900, lineHeight: 1.2 }}>오늘의 인기 글</p>
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 13 }}>가장 많은 공감을 받은 제보</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {topLiked.map((post, idx) => {
            const text = post.title ?? post.content;
            return (
              <div key={post.id} style={{ background: "rgba(255,255,255,0.06)", borderRadius: 16, padding: "14px 16px", border: "1px solid rgba(255,255,255,0.09)" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 999, background: post.postType === "민원" ? "rgba(239,68,68,0.25)" : "rgba(251,191,36,0.25)", color: post.postType === "민원" ? "#fca5a5" : "#fde68a" }}>
                        {post.postType === "민원" ? "📢 제보" : "💡 제안"}
                      </span>
                      <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 10 }}>#{idx + 1}</span>
                    </div>
                    <p style={{ color: "white", fontWeight: 700, fontSize: 14, lineHeight: 1.4 }}>{truncate(text, 30)}</p>
                    {(post.city || post.dong) && (
                      <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginTop: 4 }}>📍 {[post.city, post.dong].filter(Boolean).join(" ")}</p>
                    )}
                  </div>
                  <div style={{ flexShrink: 0, background: "rgba(239,68,68,0.18)", borderRadius: 12, padding: "6px 10px", textAlign: "center" }}>
                    <p style={{ fontSize: 16, fontWeight: 900 }}>❤️</p>
                    <p style={{ color: "#fca5a5", fontWeight: 900, fontSize: 14, fontVariantNumeric: "tabular-nums" }}>{post.likeCount}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Slide>
  );
}

// ── Slide CTA (last) — light background ───────────────────────────────────────
export function SlideCTA({ id, current, total }: { id: string; current: number; total: number }) {
  return (
    <Slide id={id} bg={{ backgroundColor: "#fff7ed" }}>
      {/* Decorative top orange strip */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 8, background: `linear-gradient(to right, ${C.orange}, ${C.red500})` }} />

      <TopBar dark={false} />
      <Counter current={current} total={total} dark={false} />

      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 32px", textAlign: "center" }}>
        <p style={{ color: C.orange, fontSize: 11, fontWeight: 900, letterSpacing: 3, textTransform: "uppercase", marginBottom: 12 }}>YOUR TURN</p>

        <p style={{ color: "#111827", fontSize: 30, fontWeight: 900, lineHeight: 1.3, marginBottom: 8 }}>
          당신 집 앞<br />불편을 제보하세요
        </p>
        <p style={{ color: "#6b7280", fontSize: 14, lineHeight: 1.7, marginBottom: 32 }}>
          함께 기록하면 정치인은 움직입니다<br />로그인 없이도 바로 제보할 수 있어요
        </p>

        {/* URL box */}
        <div style={{ width: "100%", background: `linear-gradient(135deg, ${C.orange}, ${C.orange600})`, borderRadius: 18, padding: "16px 28px", marginBottom: 14 }}>
          <p style={{ color: "white", fontSize: 22, fontWeight: 900, letterSpacing: -0.5 }}>reform-chungnam.kr</p>
        </div>

        {/* Profile hint */}
        <div style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, background: "rgba(0,0,0,0.05)", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 14, padding: "12px 20px" }}>
          <span style={{ fontSize: 18 }}>👆</span>
          <p style={{ color: "#374151", fontSize: 13, fontWeight: 600 }}>프로필 링크에서도 바로 접속 가능</p>
        </div>

        {/* Footer name + district */}
        <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 1, height: 16, background: "rgba(0,0,0,0.2)" }} />
          <p style={{ color: "#374151", fontSize: 12, fontWeight: 700 }}>개혁신당 손승범 · 문성동 봉명동 성정1동 성정2동 천안시의원 후보</p>
          <div style={{ width: 1, height: 16, background: "rgba(0,0,0,0.2)" }} />
        </div>
      </div>
    </Slide>
  );
}

// ── Arrow Button ──────────────────────────────────────────────────────────────
function ArrowBtn({ direction, onClick }: { direction: "left" | "right"; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        position: "absolute",
        top: "50%",
        transform: "translateY(-50%)",
        [direction]: 10,
        zIndex: 20,
        width: 36,
        height: 36,
        borderRadius: "50%",
        background: "rgba(0,0,0,0.45)",
        border: "none",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
      }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        {direction === "left"
          ? <path d="M10 3L5 8l5 5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          : <path d="M6 3l5 5-5 5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        }
      </svg>
    </button>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function CardNewsCarousel({ data, dayOffset, targetDate }: Props) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [scale, setScale] = useState(1);
  const carouselRef = useRef<HTMLDivElement>(null);
  const outerRef    = useRef<HTMLDivElement>(null);

  // Responsive scale
  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      setScale(w > 0 ? Math.min(w / SLIDE_W, 1) : 1);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Build slide list
  const hasTopReports = data.reports.length > 0;
  const hasCityMap    = data.cityBreakdown.length > 0;
  const hasPopular    = data.topLikedPosts.filter(p => p.likeCount > 0).length > 0;
  const slideCount    = 2 + (hasTopReports ? 1 : 0) + (hasCityMap ? 1 : 0) + (hasPopular ? 1 : 0);
  const slideIds      = ["card-slide-1","card-slide-2","card-slide-3","card-slide-4","card-slide-5"].slice(0, slideCount);

  const goTo = useCallback((idx: number) => {
    setCurrentSlide(idx);
    const c = carouselRef.current;
    if (c) c.scrollTo({ left: idx * SLIDE_W, behavior: "smooth" });
  }, []);

  const handleScroll = useCallback(() => {
    const c = carouselRef.current;
    if (!c) return;
    const idx = Math.round(c.scrollLeft / SLIDE_W);
    if (idx !== currentSlide) setCurrentSlide(idx);
  }, [currentSlide]);

  // ── Capture: use modern-screenshot (handles Tailwind v4 oklch/lab) ───────────
  const captureSlide = useCallback(async (id: string): Promise<string> => {
    const { domToJpeg } = await import("modern-screenshot");
    const el = document.getElementById(id);
    if (!el) throw new Error("Slide not found: " + id);

    // Clone off-screen to escape CSS transform context
    const clone = el.cloneNode(true) as HTMLElement;
    Object.assign(clone.style, {
      position: "fixed",
      top: "-99999px",
      left: "0px",
      width:  `${SLIDE_W}px`,
      height: `${SLIDE_H}px`,
      transform: "none",
      zIndex: "-1",
    });
    clone.id = `${id}-cap`;
    document.body.appendChild(clone);

    try {
      return await domToJpeg(clone, {
        scale: 2,      // 540×2 = 1080px, 675×2 = 1350px
        quality: 0.95,
        width:  SLIDE_W,
        height: SLIDE_H,
      });
    } finally {
      document.body.removeChild(clone);
    }
  }, []);

  const dateStr = `${targetDate.getFullYear()}${String(targetDate.getMonth()+1).padStart(2,"0")}${String(targetDate.getDate()).padStart(2,"0")}`;

  const downloadAll = useCallback(async () => {
    setDownloading(true);
    setDownloadProgress(0);
    try {
      for (let i = 0; i < slideIds.length; i++) {
        setDownloadProgress(Math.round(((i + 0.5) / slideIds.length) * 100));
        const dataUrl = await captureSlide(slideIds[i]);
        const a = document.createElement("a");
        a.download = `reform-chungnam-${dateStr}-${String(i+1).padStart(2,"0")}.jpg`;
        a.href = dataUrl;
        a.click();
        await new Promise(r => setTimeout(r, 400));
        setDownloadProgress(Math.round(((i + 1) / slideIds.length) * 100));
      }
    } catch (err) {
      console.error("Download failed:", err);
      alert("이미지 저장에 실패했습니다.\n" + (err instanceof Error ? err.message : ""));
    } finally {
      setDownloading(false);
      setDownloadProgress(0);
    }
  }, [slideIds, dateStr, captureSlide]);

  const downloadCurrent = useCallback(async () => {
    setDownloading(true);
    try {
      const dataUrl = await captureSlide(slideIds[currentSlide]);
      const a = document.createElement("a");
      a.download = `reform-chungnam-${dateStr}-${String(currentSlide+1).padStart(2,"0")}.jpg`;
      a.href = dataUrl;
      a.click();
    } catch (err) {
      console.error("Download failed:", err);
      alert("이미지 저장에 실패했습니다.\n" + (err instanceof Error ? err.message : ""));
    } finally {
      setDownloading(false);
    }
  }, [slideIds, currentSlide, dateStr, captureSlide]);

  const shareCurrent = useCallback(async () => {
    try {
      const dataUrl = await captureSlide(slideIds[currentSlide]);
      // Convert data URL to Blob for sharing
      const res  = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `reform-chungnam-${currentSlide+1}.jpg`, { type: "image/jpeg" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `${shortDate(targetDate)} 지역 불편 현황`,
          text:  `${shortDate(targetDate)} 천안 지역 불편 제보 현황 | reform-chungnam.kr`,
          files: [file],
        });
      } else {
        await navigator.clipboard.writeText("https://reform-chungnam.kr/proposals/daily-stats");
        alert("링크가 복사됐습니다!");
      }
    } catch (err) {
      console.error("Share failed:", err);
    }
  }, [slideIds, currentSlide, targetDate, captureSlide]);

  const viewH = Math.round(SLIDE_H * scale);
  let si = 0;

  return (
    <div className="rounded-3xl overflow-hidden border border-gray-200 shadow-lg bg-white">
      {/* Carousel area — arrows overlay */}
      <div ref={outerRef} className="w-full relative" style={{ height: viewH }}>
        {/* Left arrow */}
        {currentSlide > 0 && (
          <ArrowBtn direction="left" onClick={() => goTo(currentSlide - 1)} />
        )}
        {/* Right arrow */}
        {currentSlide < slideCount - 1 && (
          <ArrowBtn direction="right" onClick={() => goTo(currentSlide + 1)} />
        )}

        {/* Scale + scroll layer */}
        <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: SLIDE_W, height: SLIDE_H }}>
          <div
            ref={carouselRef}
            style={{ display: "flex", width: SLIDE_W, height: SLIDE_H, overflowX: "scroll", scrollSnapType: "x mandatory", scrollbarWidth: "none" }}
            onScroll={handleScroll}
          >
            {/* Slide 1 */}
            <div style={{ scrollSnapAlign: "start", flexShrink: 0 }}>
              <SlideCover id={slideIds[si++]} data={data} total={slideCount} targetDate={targetDate} dayOffset={dayOffset} />
            </div>
            {/* Slide 2 */}
            {hasTopReports && (
              <div style={{ scrollSnapAlign: "start", flexShrink: 0 }}>
                <SlideTopReports id={slideIds[si++]} data={data} total={slideCount} />
              </div>
            )}
            {/* Slide 3 */}
            {hasCityMap && (
              <div style={{ scrollSnapAlign: "start", flexShrink: 0 }}>
                <SlideCityMap id={slideIds[si++]} data={data} total={slideCount} />
              </div>
            )}
            {/* Slide 4 */}
            {hasPopular && (
              <div style={{ scrollSnapAlign: "start", flexShrink: 0 }}>
                <SlidePopular id={slideIds[si++]} data={data} total={slideCount} />
              </div>
            )}
            {/* Slide CTA */}
            <div style={{ scrollSnapAlign: "start", flexShrink: 0 }}>
              <SlideCTA id={slideIds[si++]} current={slideCount} total={slideCount} />
            </div>
          </div>
        </div>
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-1.5 py-3 bg-gray-50 border-t border-gray-100">
        {Array.from({ length: slideCount }).map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`rounded-full transition-all ${i === currentSlide ? "w-5 h-2 bg-orange-500" : "w-2 h-2 bg-gray-300"}`}
          />
        ))}
      </div>

      {/* Action buttons */}
      <div className="px-5 pb-5 pt-3 flex gap-2">
        <button
          onClick={downloadCurrent}
          disabled={downloading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-colors disabled:opacity-50"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1v8M4 6l3 3 3-3M2 11h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          이 슬라이드
        </button>
        <button
          onClick={downloadAll}
          disabled={downloading}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-colors disabled:opacity-50"
        >
          {downloading ? (
            <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />저장 중{downloadProgress > 0 ? ` ${downloadProgress}%` : ""}</>
          ) : (
            <><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v8M4 6l3 3 3-3M2 11h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>전체 다운로드 ({slideCount}장)</>
          )}
        </button>
        <button
          onClick={shareCurrent}
          disabled={downloading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-colors disabled:opacity-50"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="11" cy="2.5" r="1.5" stroke="currentColor" strokeWidth="1.3" />
            <circle cx="11" cy="11.5" r="1.5" stroke="currentColor" strokeWidth="1.3" />
            <circle cx="3" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.3" />
            <path d="M4.3 6.2L9.7 3.3M4.3 7.8l5.4 2.9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          공유
        </button>
      </div>
    </div>
  );
}
