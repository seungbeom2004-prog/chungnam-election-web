"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import Image from "next/image";

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
  dayOffset: number; // 0=today, -1=yesterday, etc.
  targetDate: Date;
}

// ── Constants ──────────────────────────────────────────────────────────────────
const SLIDE_W = 540;
const SLIDE_H = 675; // 4:5 ratio

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

// ── Slide inner wrapper (always 540×675 in layout) ────────────────────────────
function Slide({ id, children, className = "" }: { id: string; children: React.ReactNode; className?: string }) {
  return (
    <div
      id={id}
      className={`relative overflow-hidden select-none ${className}`}
      style={{ width: SLIDE_W, height: SLIDE_H, flexShrink: 0 }}
    >
      {children}
    </div>
  );
}

// 개혁신당 logo bar
function TopBar({ light = false }: { light?: boolean }) {
  return (
    <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-7 pt-6 z-10">
      <Image
        src="/images/reform-party-logo.png"
        alt="개혁신당"
        width={72}
        height={28}
        style={{ filter: light ? "none" : "brightness(0) invert(1)" }}
        unoptimized
      />
      <div className={`text-right text-xs font-bold leading-tight ${light ? "text-gray-700" : "text-white/90"}`}>
        <p className="text-sm font-black">4 손승범</p>
        <p className="opacity-70 text-[10px]">reform-chungnam.kr</p>
      </div>
    </div>
  );
}

// Slide counter
function SlideCounter({ current, total }: { current: number; total: number }) {
  return (
    <div className="absolute top-7 left-1/2 -translate-x-1/2 text-xs font-bold tabular-nums text-white/50">
      {String(current).padStart(2, "0")}/{String(total).padStart(2, "0")}
    </div>
  );
}

// ── Slide 1: Cover ─────────────────────────────────────────────────────────────
function SlideCover({ id, data, total, targetDate, dayOffset }: {
  id: string; data: DailyStats; total: number; targetDate: Date; dayOffset: number;
}) {
  const totalPosts = data.totalReports + data.totalProposals;
  return (
    <Slide id={id} className="bg-gradient-to-br from-orange-500 via-orange-600 to-red-500">
      <TopBar />
      <SlideCounter current={1} total={total} />

      <div className="absolute inset-0 flex flex-col justify-center px-8 pt-16">
        <p className="text-white/80 text-sm font-bold mb-2 tracking-wide">📍 충청남도 · {shortDate(targetDate)}</p>

        <div className="mb-4">
          <p className="text-white text-xl font-black leading-tight mb-1">집 앞 불편,</p>
          <p className="text-white text-xl font-black leading-tight">오늘도 기록되고 있습니다</p>
        </div>

        {/* Big number */}
        <div className="flex items-end gap-3 mb-6">
          <span className="text-white font-black leading-none" style={{ fontSize: 110 }}>{totalPosts}</span>
          <div className="mb-4">
            <p className="text-white font-black text-2xl">건</p>
            <p className="text-white/80 text-sm font-semibold">{dayLabel(dayOffset)} 접수</p>
          </div>
        </div>

        {/* Sub breakdown */}
        <div className="flex gap-4">
          <div className="bg-white/20 rounded-2xl px-5 py-3 backdrop-blur-sm">
            <p className="text-white/80 text-xs font-semibold mb-0.5">📢 불편 제보</p>
            <p className="text-white font-black text-3xl tabular-nums">{data.totalReports}</p>
          </div>
          <div className="bg-white/20 rounded-2xl px-5 py-3 backdrop-blur-sm">
            <p className="text-white/80 text-xs font-semibold mb-0.5">💡 공약 제안</p>
            <p className="text-white font-black text-3xl tabular-nums">{data.totalProposals}</p>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/30 backdrop-blur-sm px-8 py-4">
        <p className="text-white font-black text-lg">{shortDate(targetDate)}</p>
        <p className="text-white/60 text-xs">개혁신당 천안시의원후보 손승범 | 지역 변화 플랫폼</p>
      </div>
    </Slide>
  );
}

// ── Slide 2: Top Reports ────────────────────────────────────────────────────────
function SlideTopReports({ id, data, total }: { id: string; data: DailyStats; total: number }) {
  const top = data.reports.slice(0, 3);
  return (
    <Slide id={id} className="bg-gray-950">
      <TopBar />
      <SlideCounter current={2} total={total} />
      <div className="absolute inset-0 px-7 pt-16 flex flex-col justify-center">
        <div className="mb-5">
          <p className="text-orange-400 text-xs font-black tracking-widest uppercase mb-1">TODAY&apos;S REPORT</p>
          <p className="text-white font-black text-2xl leading-tight">오늘의 불편 제보</p>
          <p className="text-white/40 text-sm">총 {data.totalReports}건 접수됨</p>
        </div>
        <div className="space-y-3">
          {top.map((post, idx) => {
            const rank = ["🥇", "🥈", "🥉"][idx];
            const text = post.title ?? post.content;
            const location = [post.city, post.dong].filter(Boolean).join(" ");
            return (
              <div key={post.id} className="flex items-start gap-3 bg-white/5 rounded-2xl px-4 py-3.5 border border-white/10">
                <span className="text-2xl shrink-0 mt-0.5">{rank}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm leading-tight mb-1">{truncate(text, 28)}</p>
                  {location && <p className="text-orange-400/80 text-xs">📍 {location}</p>}
                  <p className="text-white/30 text-xs mt-0.5">{post.authorName}</p>
                </div>
                {post.likeCount > 0 && (
                  <p className="text-red-400 text-xs font-bold shrink-0">❤️ {post.likeCount}</p>
                )}
              </div>
            );
          })}
        </div>
        {data.totalReports > 3 && (
          <p className="text-white/30 text-xs text-center mt-4">외 {data.totalReports - 3}건 더 →</p>
        )}
      </div>
    </Slide>
  );
}

// ── Slide 3: City Breakdown ─────────────────────────────────────────────────────
function SlideCityMap({ id, data, total }: { id: string; data: DailyStats; total: number }) {
  const cities = data.cityBreakdown.slice(0, 5);
  const maxVal = cities[0]?.total ?? 1;
  return (
    <Slide id={id} className="bg-gray-950">
      <TopBar />
      <SlideCounter current={3} total={total} />
      <div className="absolute inset-0 px-7 pt-16 flex flex-col justify-center">
        <div className="mb-5">
          <p className="text-orange-400 text-xs font-black tracking-widest uppercase mb-1">AREA BREAKDOWN</p>
          <p className="text-white font-black text-2xl leading-tight">지역별 현황</p>
          <p className="text-white/40 text-sm">제보/제안이 많은 지역 TOP {cities.length}</p>
        </div>
        <div className="space-y-4">
          {cities.map((item, idx) => {
            const pct = maxVal > 0 ? (item.total / maxVal) * 100 : 0;
            const reportPct = item.total > 0 ? (item.reports / item.total) * 100 : 0;
            return (
              <div key={item.city} className="flex items-center gap-3">
                <span className="text-orange-400 font-black text-sm w-5 text-right shrink-0">{idx + 1}</span>
                <span className="text-white font-bold text-sm w-16 shrink-0">{item.city}</span>
                <div className="flex-1 relative h-7 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full rounded-full overflow-hidden" style={{ width: `${pct}%`, backgroundColor: "rgba(255,255,255,0.15)" }}>
                    <div className="h-full bg-gradient-to-r from-orange-500 to-red-500 float-left" style={{ width: `${reportPct}%` }} />
                    <div className="h-full bg-gradient-to-r from-amber-400 to-amber-500 float-left" style={{ width: `${100 - reportPct}%` }} />
                  </div>
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-white font-black text-xs">{item.total}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 mt-5">
          <span className="flex items-center gap-1.5 text-[11px] text-white/50">
            <span className="w-3 h-3 rounded-full bg-gradient-to-r from-orange-500 to-red-500 shrink-0" />불편제보
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-white/50">
            <span className="w-3 h-3 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 shrink-0" />공약제안
          </span>
        </div>
      </div>
    </Slide>
  );
}

// ── Slide 4: Popular Posts ──────────────────────────────────────────────────────
function SlidePopular({ id, data, total }: { id: string; data: DailyStats; total: number }) {
  const topLiked = data.topLikedPosts.filter(p => p.likeCount > 0).slice(0, 3);
  return (
    <Slide id={id} className="bg-gradient-to-b from-gray-950 to-gray-900">
      <TopBar />
      <SlideCounter current={4} total={total} />
      <div className="absolute inset-0 px-7 pt-16 flex flex-col justify-center">
        <div className="mb-5">
          <p className="text-red-400 text-xs font-black tracking-widest uppercase mb-1">POPULAR TODAY</p>
          <p className="text-white font-black text-2xl leading-tight">오늘의 인기 글</p>
          <p className="text-white/40 text-sm">가장 많은 공감을 받은 제보</p>
        </div>
        <div className="space-y-3">
          {topLiked.map((post, idx) => {
            const text = post.title ?? post.content;
            return (
              <div key={post.id} className="bg-white/5 rounded-2xl px-4 py-3.5 border border-white/10">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${post.postType === "민원" ? "bg-red-500/30 text-red-300" : "bg-amber-500/30 text-amber-300"}`}>
                        {post.postType === "민원" ? "📢 제보" : "💡 제안"}
                      </span>
                      <span className="text-white/30 text-[10px]">#{idx + 1}</span>
                    </div>
                    <p className="text-white font-bold text-sm leading-tight">{truncate(text, 30)}</p>
                    {(post.city || post.dong) && (
                      <p className="text-white/40 text-xs mt-1">📍 {[post.city, post.dong].filter(Boolean).join(" ")}</p>
                    )}
                  </div>
                  <div className="shrink-0 bg-red-500/20 rounded-xl px-2.5 py-1.5 text-center">
                    <p className="text-red-400 text-base font-black">❤️</p>
                    <p className="text-red-300 font-black text-sm">{post.likeCount}</p>
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

// ── Slide 5: CTA ───────────────────────────────────────────────────────────────
function SlideCTA({ id, total }: { id: string; total: number }) {
  return (
    <Slide id={id} className="bg-gray-950">
      <TopBar />
      <SlideCounter current={total} total={total} />
      <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
        <p className="text-orange-400 text-sm font-black tracking-widest uppercase mb-3">YOUR TURN</p>
        <p className="text-white font-black text-[28px] leading-tight mb-2">
          당신 집 앞<br />불편을 제보하세요
        </p>
        <p className="text-white/50 text-sm mb-8 leading-relaxed">
          함께 기록하면 정치인은 움직입니다<br />
          로그인 없이도 바로 제보할 수 있어요
        </p>
        <div className="bg-orange-500 rounded-2xl px-8 py-4 mb-4 w-full">
          <p className="text-white font-black text-xl tracking-tight">reform-chungnam.kr</p>
        </div>
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-5 py-3 w-full">
          <span className="text-orange-400 text-lg">👆</span>
          <p className="text-white/70 text-sm font-medium">프로필 링크에서도 바로 접속 가능</p>
        </div>
        <div className="mt-6 flex items-center gap-2">
          <div className="w-px h-4 bg-white/20" />
          <p className="text-white/30 text-xs">개혁신당 천안시의원후보 손승범</p>
          <div className="w-px h-4 bg-white/20" />
        </div>
      </div>
    </Slide>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function CardNewsCarousel({ data, dayOffset, targetDate }: Props) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [scale, setScale] = useState(1);
  const carouselRef = useRef<HTMLDivElement>(null);
  const outerRef = useRef<HTMLDivElement>(null);

  // Measure container width and compute scale
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
  const hasCityMap = data.cityBreakdown.length > 0;
  const hasPopular = data.topLikedPosts.filter(p => p.likeCount > 0).length > 0;
  const slideCount = 2 + (hasTopReports ? 1 : 0) + (hasCityMap ? 1 : 0) + (hasPopular ? 1 : 0);
  const slideIds = ["card-slide-1", "card-slide-2", "card-slide-3", "card-slide-4", "card-slide-5"].slice(0, slideCount);

  const goTo = useCallback((idx: number) => {
    setCurrentSlide(idx);
    const container = carouselRef.current;
    if (container) {
      container.scrollTo({ left: idx * SLIDE_W, behavior: "smooth" });
    }
  }, []);

  const handleScroll = useCallback(() => {
    const container = carouselRef.current;
    if (!container) return;
    const idx = Math.round(container.scrollLeft / SLIDE_W);
    if (idx !== currentSlide) setCurrentSlide(idx);
  }, [currentSlide]);

  // html2canvas helper
  const captureSlide = useCallback(async (id: string, scale2x = 2) => {
    const { default: html2canvas } = await import("html2canvas");
    const el = document.getElementById(id);
    if (!el) throw new Error("Slide not found");
    return await html2canvas(el, {
      scale: scale2x,
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
      logging: false,
      width: SLIDE_W,
      height: SLIDE_H,
    });
  }, []);

  const dateStr = `${targetDate.getFullYear()}${String(targetDate.getMonth() + 1).padStart(2, "0")}${String(targetDate.getDate()).padStart(2, "0")}`;

  const downloadAll = useCallback(async () => {
    setDownloading(true);
    setDownloadProgress(0);
    try {
      for (let i = 0; i < slideIds.length; i++) {
        setDownloadProgress(Math.round(((i + 0.5) / slideIds.length) * 100));
        const canvas = await captureSlide(slideIds[i]);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
        const a = document.createElement("a");
        a.download = `reform-chungnam-${dateStr}-${String(i + 1).padStart(2, "0")}.jpg`;
        a.href = dataUrl;
        a.click();
        await new Promise(r => setTimeout(r, 350));
        setDownloadProgress(Math.round(((i + 1) / slideIds.length) * 100));
      }
    } catch (err) {
      console.error("Download failed:", err);
      alert("이미지 저장에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setDownloading(false);
      setDownloadProgress(0);
    }
  }, [slideIds, dateStr, captureSlide]);

  const downloadCurrent = useCallback(async () => {
    setDownloading(true);
    try {
      const canvas = await captureSlide(slideIds[currentSlide]);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
      const a = document.createElement("a");
      a.download = `reform-chungnam-${dateStr}-${String(currentSlide + 1).padStart(2, "0")}.jpg`;
      a.href = dataUrl;
      a.click();
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setDownloading(false);
    }
  }, [slideIds, currentSlide, dateStr, captureSlide]);

  const shareCurrent = useCallback(async () => {
    try {
      const canvas = await captureSlide(slideIds[currentSlide]);
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], `reform-chungnam-${currentSlide + 1}.jpg`, { type: "image/jpeg" });
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            title: `${shortDate(targetDate)} 지역 불편 현황`,
            text: `${shortDate(targetDate)} 천안 지역 불편 제보 현황 | reform-chungnam.kr`,
            files: [file],
          });
        } else {
          await navigator.clipboard.writeText("https://reform-chungnam.kr/proposals/daily-stats");
          alert("링크가 복사됐습니다!");
        }
      }, "image/jpeg", 0.95);
    } catch (err) {
      console.error("Share failed:", err);
    }
  }, [slideIds, currentSlide, targetDate, captureSlide]);

  let slideIndex = 0;

  // Scaled height for the viewport clip area
  const viewH = Math.round(SLIDE_H * scale);

  return (
    <div className="rounded-3xl overflow-hidden border border-gray-200 shadow-lg bg-white">
      {/* Outer measure wrapper */}
      <div ref={outerRef} className="w-full overflow-hidden" style={{ height: viewH }}>
        {/* Scale transform container */}
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            width: SLIDE_W,
            height: SLIDE_H,
          }}
        >
          {/* Scrollable carousel — at full 540px per slide */}
          <div
            ref={carouselRef}
            className="flex"
            style={{
              width: SLIDE_W,
              height: SLIDE_H,
              overflowX: "scroll",
              scrollSnapType: "x mandatory",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
            onScroll={handleScroll}
          >
            {/* Slide 1: Cover */}
            <div style={{ scrollSnapAlign: "start", flexShrink: 0 }}>
              <SlideCover
                id={slideIds[slideIndex++]}
                data={data}
                total={slideCount}
                targetDate={targetDate}
                dayOffset={dayOffset}
              />
            </div>
            {/* Slide 2: Top Reports */}
            {hasTopReports && (
              <div style={{ scrollSnapAlign: "start", flexShrink: 0 }}>
                <SlideTopReports id={slideIds[slideIndex++]} data={data} total={slideCount} />
              </div>
            )}
            {/* Slide 3: City breakdown */}
            {hasCityMap && (
              <div style={{ scrollSnapAlign: "start", flexShrink: 0 }}>
                <SlideCityMap id={slideIds[slideIndex++]} data={data} total={slideCount} />
              </div>
            )}
            {/* Slide 4: Popular */}
            {hasPopular && (
              <div style={{ scrollSnapAlign: "start", flexShrink: 0 }}>
                <SlidePopular id={slideIds[slideIndex++]} data={data} total={slideCount} />
              </div>
            )}
            {/* Slide 5: CTA */}
            <div style={{ scrollSnapAlign: "start", flexShrink: 0 }}>
              <SlideCTA id={slideIds[slideIndex++]} total={slideCount} />
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
        {/* Download current slide */}
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

        {/* Download all */}
        <button
          onClick={downloadAll}
          disabled={downloading}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-colors disabled:opacity-50"
        >
          {downloading ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              저장 중{downloadProgress > 0 ? ` ${downloadProgress}%` : ""}
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1v8M4 6l3 3 3-3M2 11h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              전체 다운로드 ({slideCount}장)
            </>
          )}
        </button>

        {/* Share */}
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
