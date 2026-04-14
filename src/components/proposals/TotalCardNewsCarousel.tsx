"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { SlideCTA } from "./CardNewsCarousel";

// ── Types ──────────────────────────────────────────────────────────────────────
export interface CumulativeStats {
  totalReports: number;
  totalProposals: number;
  totalPosts: number;
  totalIssues: number;
  resolvedIssues: number;
  issuesByStatus: {
    reviewing: number;
    planned: number;
    complaint_resolved: number;
    adopted: number;
  };
  cityBreakdown: { city: string; reports: number; proposals: number; total: number }[];
}

interface Props {
  data: CumulativeStats;
  mode?: "daily" | "weekly" | "total";
  onModeChange?: (m: "daily" | "weekly" | "total") => void;
}

// ── Constants ──────────────────────────────────────────────────────────────────
const SLIDE_W = 540;
const SLIDE_H = 675;
const SLIDE_FONT = '"Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

const C = {
  brand:    "#FF7210",
  brand2:   "#ff4d00",
  brand3:   "#e63000",
  gray950:  "#030712",
};

// ── Shared primitives (same as other carousels) ───────────────────────────────
function Slide({ id, children, bg }: { id: string; children: React.ReactNode; bg: React.CSSProperties }) {
  return (
    <div id={id} className="relative overflow-hidden select-none"
      style={{ width: SLIDE_W, height: SLIDE_H, flexShrink: 0, fontFamily: SLIDE_FONT, ...bg }}>
      {children}
    </div>
  );
}

function TopBar({ dark = true }: { dark?: boolean }) {
  const textColor = dark ? "rgba(255,255,255,0.95)" : "#111827";
  const subColor  = dark ? "rgba(255,255,255,0.65)" : "#374151";
  return (
    <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-7 pt-12 z-10">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/reform-party-logo.png" alt="개혁신당" width={96} height={37}
        style={{ filter: dark ? "brightness(0) invert(1)" : "none", display: "block" }} />
      <div className="text-right leading-tight" style={{ flexShrink: 0 }}>
        <p style={{ color: textColor, fontSize: 26, fontWeight: 900, lineHeight: 1.1, whiteSpace: "nowrap" }}>4&nbsp;&nbsp;손승범</p>
        <p style={{ color: subColor, fontSize: 11, fontWeight: 600, lineHeight: 1.5 }}>📍 천안시</p>
      </div>
    </div>
  );
}

function Counter({ current, total, dark = true }: { current: number; total: number; dark?: boolean }) {
  return (
    <div style={{ position: "absolute", top: 28, left: "50%", transform: "translateX(-50%)", fontSize: 11, fontWeight: 700,
      color: dark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.35)", fontVariantNumeric: "tabular-nums" }}>
      {String(current).padStart(2,"0")}/{String(total).padStart(2,"0")}
    </div>
  );
}

function ArrowBtn({ direction, onClick }: { direction: "left" | "right"; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      position: "absolute", top: "50%", transform: "translateY(-50%)",
      [direction]: 10, zIndex: 20, width: 36, height: 36, borderRadius: "50%",
      background: "rgba(0,0,0,0.45)", border: "none", cursor: "pointer",
      display: "flex", alignItems: "center", justifyContent: "center",
      backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
    }}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        {direction === "left"
          ? <path d="M10 3L5 8l5 5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          : <path d="M6 3l5 5-5 5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        }
      </svg>
    </button>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      flexShrink: 0, padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600,
      border: active ? "none" : "1px solid #d1d5db",
      background: active ? C.brand : "white",
      color: active ? "white" : "#374151",
      cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s",
    }}>
      {label}
    </button>
  );
}

// ── Slide 1: Total Cover ──────────────────────────────────────────────────────
function SlideTotalCover({ id, total, totalCount }: { id: string; total: number; totalCount: number }) {
  return (
    <Slide id={id} bg={{ background: `linear-gradient(145deg, ${C.brand}, ${C.brand2}, ${C.brand3})` }}>
      <TopBar dark />
      <Counter current={1} total={total} />
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column", justifyContent: "space-between",
        padding: "110px 36px 32px",
      }}>
        <div>
          <p style={{ color: "rgba(255,255,255,0.62)", fontSize: 13, fontWeight: 600, marginBottom: 5 }}>
            서비스 시작(2026년 3월) 이후
          </p>
          <p style={{ color: "white", fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>
            전체 누적 현황
          </p>
        </div>
        <div>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
            총 제보·제안
          </p>
          <p style={{ color: "white", fontSize: 110, fontWeight: 900, lineHeight: 0.85, letterSpacing: -4, fontVariantNumeric: "tabular-nums" }}>
            {totalCount}
          </p>
          <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 32, fontWeight: 900, marginTop: 8 }}>개</p>
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.22)", paddingTop: 14 }}>
          <p style={{ color: "rgba(255,255,255,0.82)", fontSize: 11, lineHeight: 1.65 }}>
            성정1동 성정2동 봉명동 문성동 천안시의원 후보자 손승범 | 개혁신당
          </p>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, marginTop: 2 }}>reform-chungnam.kr</p>
        </div>
      </div>
    </Slide>
  );
}

// ── Slide 2: Reports vs Proposals + Issue Status ──────────────────────────────
function SlideTotalStats({ id, data, slideNum, total }: {
  id: string; data: CumulativeStats; slideNum: number; total: number;
}) {
  const { issuesByStatus } = data;
  const totalIssues = data.totalIssues || 1;
  const stages = [
    { label: "검토중",   value: issuesByStatus.reviewing,         color: "#3b82f6", emoji: "🔍" },
    { label: "공약 제안", value: issuesByStatus.planned,           color: C.brand,   emoji: "📋" },
    { label: "민원 해결", value: issuesByStatus.complaint_resolved, color: "#a855f7", emoji: "🏛️" },
    { label: "공약 반영", value: issuesByStatus.adopted,           color: "#22c55e",  emoji: "✅" },
  ];

  return (
    <Slide id={id} bg={{ background: `linear-gradient(160deg, #1a0800 0%, ${C.gray950} 50%, #0a0a14 100%)` }}>
      <TopBar dark />
      <Counter current={slideNum} total={total} />
      <div style={{ position: "absolute", inset: 0, padding: "60px 28px 28px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 18 }}>
        <p style={{ color: C.brand, fontSize: 10, fontWeight: 900, letterSpacing: 3, textTransform: "uppercase" as const }}>CUMULATIVE OVERVIEW</p>

        {/* Big 2-col numbers */}
        <div style={{ display: "flex", gap: 14 }}>
          <div style={{ flex: 1, background: "rgba(255,114,16,0.18)", borderRadius: 24, padding: "18px 16px", border: "1px solid rgba(255,114,16,0.3)" }}>
            <p style={{ fontSize: 22, marginBottom: 6 }}>📢</p>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 700, marginBottom: 2 }}>불편 제보</p>
            <p style={{ color: "white", fontSize: 60, fontWeight: 900, lineHeight: 0.85, fontVariantNumeric: "tabular-nums" }}>{data.totalReports}</p>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 600, marginTop: 6 }}>건 누적</p>
          </div>
          <div style={{ flex: 1, background: "rgba(251,191,36,0.15)", borderRadius: 24, padding: "18px 16px", border: "1px solid rgba(251,191,36,0.25)" }}>
            <p style={{ fontSize: 22, marginBottom: 6 }}>💡</p>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 700, marginBottom: 2 }}>공약 제안</p>
            <p style={{ color: "white", fontSize: 60, fontWeight: 900, lineHeight: 0.85, fontVariantNumeric: "tabular-nums" }}>{data.totalProposals}</p>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 600, marginTop: 6 }}>건 누적</p>
          </div>
        </div>

        {/* Issue stage breakdown */}
        <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 18, padding: "16px 18px" }}>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: 700, letterSpacing: 2, marginBottom: 12, textTransform: "uppercase" as const }}>ISSUE STATUS</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {stages.map(s => {
              const pct = totalIssues > 0 ? Math.round((s.value / totalIssues) * 100) : 0;
              return (
                <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>{s.emoji}</span>
                  <span style={{ color: "white", fontSize: 12, fontWeight: 700, width: 64, flexShrink: 0 }}>{s.label}</span>
                  <div style={{ flex: 1, height: 18, background: "rgba(255,255,255,0.08)", borderRadius: 999, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: s.color, borderRadius: 999 }} />
                  </div>
                  <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, fontWeight: 700, width: 28, textAlign: "right" as const, flexShrink: 0 }}>{s.value}</span>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.1)", display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, fontWeight: 600 }}>해결된 이슈</span>
            <span style={{ color: "#86efac", fontSize: 12, fontWeight: 800 }}>{data.resolvedIssues} / {data.totalIssues}건</span>
          </div>
        </div>
      </div>
    </Slide>
  );
}

// ── Slide 3: City Breakdown ───────────────────────────────────────────────────
function SlideTotalCity({ id, cityBreakdown, slideNum, total }: {
  id: string;
  cityBreakdown: CumulativeStats["cityBreakdown"];
  slideNum: number;
  total: number;
}) {
  const top = cityBreakdown.slice(0, 6);
  const maxVal = top[0]?.total ?? 1;

  return (
    <Slide id={id} bg={{ backgroundColor: C.gray950 }}>
      <TopBar dark />
      <Counter current={slideNum} total={total} />
      <div style={{ position: "absolute", inset: 0, padding: "0 28px", paddingTop: 60, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <p style={{ color: C.brand, fontSize: 10, fontWeight: 900, letterSpacing: 3, textTransform: "uppercase" as const, marginBottom: 6 }}>AREA BREAKDOWN</p>
        <p style={{ color: "white", fontSize: 28, fontWeight: 900, lineHeight: 1.2, marginBottom: 24 }}>
          지역별<br />누적 현황
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {top.map((item, i) => {
            const pct = maxVal > 0 ? (item.total / maxVal) * 100 : 0;
            return (
              <div key={item.city}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ color: C.brand, fontSize: 13, fontWeight: 900, width: 20, textAlign: "right" as const }}>{i + 1}</span>
                    <span style={{ color: "white", fontSize: 15, fontWeight: 700 }}>{item.city}</span>
                  </div>
                  <div style={{ display: "flex", gap: 12 }}>
                    <span style={{ color: "rgba(255,114,16,0.9)", fontSize: 11, fontWeight: 700 }}>🚨{item.reports}</span>
                    <span style={{ color: "rgba(251,191,36,0.9)", fontSize: 11, fontWeight: 700 }}>💡{item.proposals}</span>
                    <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, fontWeight: 800 }}>계{item.total}</span>
                  </div>
                </div>
                <div style={{ marginLeft: 30, height: 8, background: "rgba(255,255,255,0.08)", borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(to right, ${C.brand}, ${C.brand3})`, borderRadius: 999 }} />
                </div>
              </div>
            );
          })}
        </div>
        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, textAlign: "center", marginTop: 18 }}>
          reform-chungnam.kr
        </p>
      </div>
    </Slide>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function TotalCardNewsCarousel({ data, mode = "total", onModeChange }: Props) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [downloading, setDownloading]   = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [scale, setScale] = useState(1);
  const carouselRef = useRef<HTMLDivElement>(null);
  const outerRef    = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const update = () => { const w = el.clientWidth; setScale(w > 0 ? Math.min(w / SLIDE_W, 1) : 1); };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const hasCityBreakdown = data.cityBreakdown.length > 0;
  const slideCount = 3 + (hasCityBreakdown ? 1 : 0); // cover + stats + [city] + cta
  const slideIds   = ["t-slide-1","t-slide-2","t-slide-3","t-slide-4"].slice(0, slideCount);

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

  const captureSlide = useCallback(async (id: string): Promise<string> => {
    const el = document.getElementById(id);
    if (!el) throw new Error("Slide not found: " + id);
    const { domToCanvas } = await import("modern-screenshot");
    const clone = el.cloneNode(true) as HTMLElement;
    clone.id = id + "-snap";
    await Promise.all(Array.from(clone.querySelectorAll("img")).map(async (img) => {
      const src = (img as HTMLImageElement).src;
      if (!src || src.startsWith("data:")) return;
      try {
        const res = await fetch(src);
        const blob = await res.blob();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const fr = new FileReader();
          fr.onloadend = () => resolve(fr.result as string);
          fr.onerror = reject;
          fr.readAsDataURL(blob);
        });
        (img as HTMLImageElement).src = dataUrl;
      } catch { (img as HTMLImageElement).removeAttribute("src"); }
    }));
    Object.assign(clone.style, {
      position: "fixed", top: "0px", left: "0px",
      width: `${SLIDE_W}px`, height: `${SLIDE_H}px`,
      transform: "none", zIndex: "99999",
      overflow: "hidden", margin: "0", borderRadius: "0", boxShadow: "none",
      pointerEvents: "none",
    });
    document.body.appendChild(clone);
    await document.fonts.ready;
    const slideText = el.textContent ?? "";
    await Promise.allSettled([
      document.fonts.load(`900 14px "Pretendard Variable"`, slideText),
      document.fonts.load(`700 14px "Pretendard Variable"`, slideText),
      document.fonts.load(`400 14px "Pretendard Variable"`, slideText),
    ]);
    await new Promise<void>(r => { requestAnimationFrame(() => { requestAnimationFrame(() => r()); }); });
    try {
      const canvas = await Promise.race([
        domToCanvas(clone, { scale: 2, width: SLIDE_W, height: SLIDE_H }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 30000)),
      ]);
      return canvas.toDataURL("image/jpeg", 0.95);
    } finally { clone.remove(); }
  }, []);

  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");

  const downloadAll = useCallback(async () => {
    setDownloading(true); setDownloadProgress(0);
    try {
      for (let i = 0; i < slideIds.length; i++) {
        setCurrentSlide(i);
        carouselRef.current?.scrollTo({ left: i * SLIDE_W, behavior: "instant" as ScrollBehavior });
        await new Promise(r => setTimeout(r, 400));
        setDownloadProgress(Math.round(((i + 0.5) / slideIds.length) * 100));
        const dataUrl = await captureSlide(slideIds[i]);
        const a = document.createElement("a");
        a.download = `reform-chungnam-total-${dateStr}-${String(i + 1).padStart(2, "0")}.jpg`;
        a.href = dataUrl; a.click();
        await new Promise(r => setTimeout(r, 400));
        setDownloadProgress(Math.round(((i + 1) / slideIds.length) * 100));
      }
    } catch (err) {
      console.error(err); alert("이미지 저장 실패: " + (err instanceof Error ? err.message : ""));
    } finally { setDownloading(false); setDownloadProgress(0); }
  }, [slideIds, dateStr, captureSlide]);

  const downloadCurrent = useCallback(async () => {
    setDownloading(true);
    try {
      const dataUrl = await captureSlide(slideIds[currentSlide]);
      const a = document.createElement("a");
      a.download = `reform-chungnam-total-${dateStr}-${String(currentSlide + 1).padStart(2, "0")}.jpg`;
      a.href = dataUrl; a.click();
    } catch (err) { console.error(err); alert("이미지 저장 실패"); }
    finally { setDownloading(false); }
  }, [slideIds, currentSlide, dateStr, captureSlide]);

  const shareCurrent = useCallback(async () => {
    try {
      const dataUrl = await captureSlide(slideIds[currentSlide]);
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `reform-total-${currentSlide + 1}.jpg`, { type: "image/jpeg" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: "전체 누적 현황", text: "개혁신당 충남 전체 누적 현황 | reform-chungnam.kr", files: [file] });
      } else {
        await navigator.clipboard.writeText("https://reform-chungnam.kr/issues/stats");
        alert("링크가 복사됐습니다!");
      }
    } catch (err) { console.error(err); }
  }, [slideIds, currentSlide, captureSlide]);

  const viewH = Math.round(SLIDE_H * scale);
  let si = 0;

  return (
    <div style={{ maxWidth: SLIDE_W, fontFamily: SLIDE_FONT }} className="mx-auto rounded-3xl overflow-hidden border border-gray-200 shadow-lg bg-white">
      {/* Filter chips */}
      <div style={{ padding: "12px 16px 8px", background: "white", borderBottom: "1px solid #f3f4f6" }}>
        {onModeChange && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", flexShrink: 0, width: 40 }}>기간</span>
            <div style={{ display: "flex", gap: 6 }}>
              <FilterChip label="📊 주간" active={mode === "weekly"} onClick={() => onModeChange("weekly")} />
              <FilterChip label="📅 일간" active={mode === "daily"}  onClick={() => onModeChange("daily")} />
              <FilterChip label="📈 전체" active={mode === "total"}  onClick={() => onModeChange("total")} />
            </div>
          </div>
        )}
      </div>

      {/* Slide viewport */}
      <div ref={outerRef} className="w-full relative" style={{ height: viewH }}>
        {currentSlide > 0 && <ArrowBtn direction="left"  onClick={() => goTo(currentSlide - 1)} />}
        {currentSlide < slideCount - 1 && <ArrowBtn direction="right" onClick={() => goTo(currentSlide + 1)} />}
        <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: SLIDE_W, height: SLIDE_H }}>
          <div ref={carouselRef}
            style={{ display: "flex", width: SLIDE_W, height: SLIDE_H, overflowX: "scroll", scrollSnapType: "x mandatory", scrollbarWidth: "none" }}
            onScroll={handleScroll}
          >
            {/* Slide 1: Cover */}
            <div style={{ scrollSnapAlign: "start", flexShrink: 0 }}>
              <SlideTotalCover id={slideIds[si++]} total={slideCount} totalCount={data.totalPosts} />
            </div>
            {/* Slide 2: Stats */}
            <div style={{ scrollSnapAlign: "start", flexShrink: 0 }}>
              <SlideTotalStats id={slideIds[si++]} data={data} slideNum={si} total={slideCount} />
            </div>
            {/* Slide 3: City (optional) */}
            {hasCityBreakdown && (
              <div style={{ scrollSnapAlign: "start", flexShrink: 0 }}>
                <SlideTotalCity id={slideIds[si++]} cityBreakdown={data.cityBreakdown} slideNum={si} total={slideCount} />
              </div>
            )}
            {/* Slide CTA */}
            <div style={{ scrollSnapAlign: "start", flexShrink: 0 }}>
              <SlideCTA id={slideIds[si++]} current={slideCount} total={slideCount} />
            </div>
          </div>
        </div>
      </div>

      {/* Dot indicator */}
      <div className="flex justify-center gap-1.5 py-3 bg-gray-50 border-t border-gray-100">
        {Array.from({ length: slideCount }).map((_, i) => (
          <button key={i} onClick={() => goTo(i)}
            className={`rounded-full transition-all ${i === currentSlide ? "w-5 h-2 bg-orange-500" : "w-2 h-2 bg-gray-300"}`} />
        ))}
      </div>

      {/* Download / share bar */}
      <div className="px-5 pb-5 pt-3 flex gap-2">
        <button onClick={downloadCurrent} disabled={downloading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-colors disabled:opacity-50">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v8M4 6l3 3 3-3M2 11h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          이 슬라이드
        </button>
        <button onClick={downloadAll} disabled={downloading}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-colors disabled:opacity-50">
          {downloading
            ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />저장 중{downloadProgress > 0 ? ` ${downloadProgress}%` : ""}</>
            : <><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v8M4 6l3 3 3-3M2 11h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>전체 다운로드 ({slideCount}장)</>
          }
        </button>
        <button onClick={shareCurrent} disabled={downloading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-colors disabled:opacity-50">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="11" cy="2.5" r="1.5" stroke="currentColor" strokeWidth="1.3" /><circle cx="11" cy="11.5" r="1.5" stroke="currentColor" strokeWidth="1.3" /><circle cx="3" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.3" /><path d="M4.3 6.2L9.7 3.3M4.3 7.8l5.4 2.9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
          공유
        </button>
      </div>
    </div>
  );
}
