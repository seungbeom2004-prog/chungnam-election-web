"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { SlideCTA } from "./CardNewsCarousel";

// ── Types ──────────────────────────────────────────────────────────────────────
interface HotIssue {
  id: string;
  title: string;
  category: string | null;
  city: string | null;
  dong: string | null;
  reportCount: number;
  weekReports: number;
}
interface CityItem { city: string; total: number; reports: number; proposals: number }
export interface WeeklyStats {
  weekStart: string;
  weekEnd: string;
  newReports: number;
  newProposals: number;
  totalPosts: number;
  totalViews: number;
  hotIssues: HotIssue[];
  cityBreakdown: CityItem[];
  dongBreakdown: { dong: string; count: number }[];
  prevWeekReports: number;
  prevWeekProposals: number;
}
interface Props {
  data: WeeklyStats;
  weekOffset: number;
  targetMonday: Date;
  targetSunday: Date;
}

// ── Constants ──────────────────────────────────────────────────────────────────
const SLIDE_W = 540;
const SLIDE_H = 675;

const C = {
  orange:    "#f97316",
  orange600: "#ea580c",
  red500:    "#ef4444",
  amber400:  "#fbbf24",
  amber500:  "#f59e0b",
  gray950:   "#030712",
  gray900:   "#111827",
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function weekLabel(monday: Date) {
  const year  = monday.getFullYear();
  const month = monday.getMonth() + 1;
  const weekNum = Math.ceil(monday.getDate() / 7);
  return `${year}년 ${month}월 ${weekNum}주`;
}
function dateRange(start: Date, end: Date) {
  const fmt = (d: Date) => `${d.getMonth()+1}/${d.getDate()}(${["일","월","화","수","목","금","토"][d.getDay()]})`;
  return `${fmt(start)} ~ ${fmt(end)}`;
}
function truncate(str: string, n: number) { return str.length > n ? str.slice(0, n) + "…" : str; }
function trendStr(current: number, prev: number) {
  const diff = current - prev;
  if (diff === 0 || prev === 0) return null;
  return diff > 0 ? `▲ ${diff} 증가` : `▼ ${Math.abs(diff)} 감소`;
}

// ── Slide wrapper ─────────────────────────────────────────────────────────────
function Slide({ id, children, bg }: { id: string; children: React.ReactNode; bg: React.CSSProperties }) {
  return (
    <div id={id} className="relative overflow-hidden select-none"
      style={{ width: SLIDE_W, height: SLIDE_H, flexShrink: 0, ...bg }}>
      {children}
    </div>
  );
}

function TopBar({ dark = true }: { dark?: boolean }) {
  const textColor = dark ? "rgba(255,255,255,0.95)" : "#111827";
  const subColor  = dark ? "rgba(255,255,255,0.65)" : "#374151";
  return (
    <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-7 pt-5 z-10">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/reform-party-logo.png" alt="개혁신당" width={96} height={37} crossOrigin="anonymous"
        style={{ filter: dark ? "brightness(0) invert(1)" : "none", display: "block" }} />
      <div className="text-right leading-tight">
        <p style={{ color: textColor, fontSize: 17, fontWeight: 900, lineHeight: 1.2 }}>4 손승범</p>
        <p style={{ color: subColor, fontSize: 10, fontWeight: 600, lineHeight: 1.4 }}>문성동 봉명동 성정1동 성정2동</p>
        <p style={{ color: subColor, fontSize: 10, fontWeight: 600, lineHeight: 1.4 }}>천안시의원 후보</p>
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

// ── Slide 1: Weekly Cover ─────────────────────────────────────────────────────
function SlideCover({ id, data, total, monday, sunday, offset }: {
  id: string; data: WeeklyStats; total: number; monday: Date; sunday: Date; offset: number;
}) {
  return (
    <Slide id={id} bg={{ background: `linear-gradient(145deg, #1d4ed8, #2563eb, #7c3aed)` }}>
      <TopBar dark />
      <Counter current={1} total={total} />
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 36px", paddingTop: 64 }}>
        <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 }}>
          WEEKLY REPORT
        </p>
        <p style={{ color: "white", fontSize: 22, fontWeight: 900, lineHeight: 1.3, marginBottom: 4 }}>{weekLabel(monday)}</p>
        <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 13, marginBottom: 20 }}>{dateRange(monday, sunday)}</p>

        {/* Big number */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 12, marginBottom: 28 }}>
          <span style={{ color: "white", fontSize: 110, fontWeight: 900, lineHeight: 1 }}>{data.totalPosts}</span>
          <div style={{ marginBottom: 16 }}>
            <p style={{ color: "white", fontSize: 26, fontWeight: 900 }}>건</p>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 600 }}>
              {offset === 0 ? "이번 주" : `${Math.abs(offset)}주 전`} 총 활동
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: 16 }}>
          <div style={{ background: "rgba(255,255,255,0.18)", borderRadius: 16, padding: "12px 20px" }}>
            <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 11, fontWeight: 600, marginBottom: 2 }}>📢 불편 제보</p>
            <p style={{ color: "white", fontSize: 32, fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>{data.newReports}</p>
            {trendStr(data.newReports, data.prevWeekReports) && (
              <p style={{ color: data.newReports >= data.prevWeekReports ? "#86efac" : "#93c5fd", fontSize: 10, fontWeight: 700, marginTop: 2 }}>
                {trendStr(data.newReports, data.prevWeekReports)}
              </p>
            )}
          </div>
          <div style={{ background: "rgba(255,255,255,0.18)", borderRadius: 16, padding: "12px 20px" }}>
            <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 11, fontWeight: 600, marginBottom: 2 }}>💡 공약 제안</p>
            <p style={{ color: "white", fontSize: 32, fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>{data.newProposals}</p>
            {trendStr(data.newProposals, data.prevWeekProposals) && (
              <p style={{ color: data.newProposals >= data.prevWeekProposals ? "#86efac" : "#93c5fd", fontSize: 10, fontWeight: 700, marginTop: 2 }}>
                {trendStr(data.newProposals, data.prevWeekProposals)}
              </p>
            )}
          </div>
        </div>
      </div>
    </Slide>
  );
}

// ── Slide 2: Hot Issues ───────────────────────────────────────────────────────
function SlideHotIssues({ id, data, total }: { id: string; data: WeeklyStats; total: number }) {
  const top = data.hotIssues.slice(0, 3);
  return (
    <Slide id={id} bg={{ backgroundColor: C.gray950 }}>
      <TopBar dark />
      <Counter current={2} total={total} />
      <div style={{ position: "absolute", inset: 0, padding: "0 28px", paddingTop: 60, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ marginBottom: 20 }}>
          <p style={{ color: "#f87171", fontSize: 10, fontWeight: 900, letterSpacing: 3, textTransform: "uppercase", marginBottom: 4 }}>HOT ISSUES</p>
          <p style={{ color: "white", fontSize: 26, fontWeight: 900, lineHeight: 1.2 }}>이번 주 핫이슈</p>
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 13 }}>제보가 집중된 지역 이슈</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {top.map((issue, idx) => {
            const rank = ["🥇","🥈","🥉"][idx];
            const count = issue.weekReports || issue.reportCount;
            const location = [issue.city, issue.dong].filter(Boolean).join(" ");
            return (
              <div key={issue.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, background: "rgba(255,255,255,0.06)", borderRadius: 16, padding: "14px 16px", border: "1px solid rgba(255,255,255,0.09)" }}>
                <span style={{ fontSize: 24, flexShrink: 0, marginTop: 2 }}>{rank}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {issue.category && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 999, background: "rgba(239,68,68,0.22)", color: "#fca5a5", display: "inline-block", marginBottom: 4 }}>
                      {issue.category}
                    </span>
                  )}
                  <p style={{ color: "white", fontWeight: 700, fontSize: 14, lineHeight: 1.4 }}>{truncate(issue.title, 26)}</p>
                  {location && <p style={{ color: "rgba(249,115,22,0.75)", fontSize: 11, marginTop: 2 }}>📍 {location}</p>}
                </div>
                <div style={{ flexShrink: 0, textAlign: "right" }}>
                  <p style={{ color: C.orange, fontSize: 20, fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>{count}</p>
                  <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 10 }}>건 제보</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Slide>
  );
}

// ── Slide 3: City Breakdown ───────────────────────────────────────────────────
function SlideCityMap({ id, data, total }: { id: string; data: WeeklyStats; total: number }) {
  const cities = data.cityBreakdown.slice(0, 5);
  const maxVal = cities[0]?.total ?? 1;
  return (
    <Slide id={id} bg={{ backgroundColor: C.gray950 }}>
      <TopBar dark />
      <Counter current={3} total={total} />
      <div style={{ position: "absolute", inset: 0, padding: "0 28px", paddingTop: 60, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ marginBottom: 20 }}>
          <p style={{ color: C.orange, fontSize: 10, fontWeight: 900, letterSpacing: 3, textTransform: "uppercase", marginBottom: 4 }}>AREA BREAKDOWN</p>
          <p style={{ color: "white", fontSize: 26, fontWeight: 900, lineHeight: 1.2 }}>시별 현황</p>
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 13 }}>제보/제안이 많은 시 TOP {cities.length}</p>
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
          {[["불편제보", C.orange], ["공약제안", C.amber400]].map(([label, color]) => (
            <span key={label} style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.45)", fontSize: 11 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: color as string, flexShrink: 0, display: "inline-block" }} />{label}
            </span>
          ))}
        </div>
      </div>
    </Slide>
  );
}

// ── Arrow ─────────────────────────────────────────────────────────────────────
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

// ── Main ──────────────────────────────────────────────────────────────────────
export default function WeeklyCardNewsCarousel({ data, weekOffset, targetMonday, targetSunday }: Props) {
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

  const hasHotIssues = data.hotIssues.length > 0;
  const hasCityMap   = data.cityBreakdown.length > 0;
  const slideCount   = 2 + (hasHotIssues ? 1 : 0) + (hasCityMap ? 1 : 0);
  const slideIds     = ["w-slide-1","w-slide-2","w-slide-3","w-slide-4","w-slide-5"].slice(0, slideCount);

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
    const { domToJpeg } = await import("modern-screenshot");
    const el = document.getElementById(id);
    if (!el) throw new Error("Slide not found: " + id);
    const clone = el.cloneNode(true) as HTMLElement;
    Object.assign(clone.style, { position: "fixed", top: "-99999px", left: "0px", width: `${SLIDE_W}px`, height: `${SLIDE_H}px`, transform: "none", zIndex: "-1" });
    clone.id = `${id}-cap`;
    document.body.appendChild(clone);
    try {
      return await domToJpeg(clone, { scale: 2, quality: 0.95, width: SLIDE_W, height: SLIDE_H });
    } finally {
      document.body.removeChild(clone);
    }
  }, []);

  const wLabel = weekLabel(targetMonday);
  const dateStr = `${targetMonday.getFullYear()}${String(targetMonday.getMonth()+1).padStart(2,"0")}${String(targetMonday.getDate()).padStart(2,"0")}`;

  const downloadAll = useCallback(async () => {
    setDownloading(true); setDownloadProgress(0);
    try {
      for (let i = 0; i < slideIds.length; i++) {
        setDownloadProgress(Math.round(((i+0.5)/slideIds.length)*100));
        const dataUrl = await captureSlide(slideIds[i]);
        const a = document.createElement("a");
        a.download = `reform-chungnam-weekly-${dateStr}-${String(i+1).padStart(2,"0")}.jpg`;
        a.href = dataUrl; a.click();
        await new Promise(r => setTimeout(r, 400));
        setDownloadProgress(Math.round(((i+1)/slideIds.length)*100));
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
      a.download = `reform-chungnam-weekly-${dateStr}-${String(currentSlide+1).padStart(2,"0")}.jpg`;
      a.href = dataUrl; a.click();
    } catch(err) { console.error(err); alert("이미지 저장 실패"); } finally { setDownloading(false); }
  }, [slideIds, currentSlide, dateStr, captureSlide]);

  const shareCurrent = useCallback(async () => {
    try {
      const dataUrl = await captureSlide(slideIds[currentSlide]);
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `reform-weekly-${currentSlide+1}.jpg`, { type: "image/jpeg" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: `${wLabel} 주간 현황`, text: `${wLabel} 충남 지역 현황 | reform-chungnam.kr`, files: [file] });
      } else {
        await navigator.clipboard.writeText("https://reform-chungnam.kr/issues/stats");
        alert("링크가 복사됐습니다!");
      }
    } catch(err) { console.error(err); }
  }, [slideIds, currentSlide, wLabel, captureSlide]);

  const viewH = Math.round(SLIDE_H * scale);
  let si = 0;

  return (
    <div className="rounded-3xl overflow-hidden border border-gray-200 shadow-lg bg-white">
      <div ref={outerRef} className="w-full relative" style={{ height: viewH }}>
        {currentSlide > 0 && <ArrowBtn direction="left" onClick={() => goTo(currentSlide - 1)} />}
        {currentSlide < slideCount - 1 && <ArrowBtn direction="right" onClick={() => goTo(currentSlide + 1)} />}
        <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: SLIDE_W, height: SLIDE_H }}>
          <div ref={carouselRef}
            style={{ display: "flex", width: SLIDE_W, height: SLIDE_H, overflowX: "scroll", scrollSnapType: "x mandatory", scrollbarWidth: "none" }}
            onScroll={handleScroll}
          >
            <div style={{ scrollSnapAlign: "start", flexShrink: 0 }}>
              <SlideCover id={slideIds[si++]} data={data} total={slideCount} monday={targetMonday} sunday={targetSunday} offset={weekOffset} />
            </div>
            {hasHotIssues && (
              <div style={{ scrollSnapAlign: "start", flexShrink: 0 }}>
                <SlideHotIssues id={slideIds[si++]} data={data} total={slideCount} />
              </div>
            )}
            {hasCityMap && (
              <div style={{ scrollSnapAlign: "start", flexShrink: 0 }}>
                <SlideCityMap id={slideIds[si++]} data={data} total={slideCount} />
              </div>
            )}
            <div style={{ scrollSnapAlign: "start", flexShrink: 0 }}>
              <SlideCTA id={slideIds[si++]} current={slideCount} total={slideCount} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-1.5 py-3 bg-gray-50 border-t border-gray-100">
        {Array.from({ length: slideCount }).map((_, i) => (
          <button key={i} onClick={() => goTo(i)}
            className={`rounded-full transition-all ${i === currentSlide ? "w-5 h-2 bg-blue-600" : "w-2 h-2 bg-gray-300"}`} />
        ))}
      </div>

      <div className="px-5 pb-5 pt-3 flex gap-2">
        <button onClick={downloadCurrent} disabled={downloading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-colors disabled:opacity-50">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v8M4 6l3 3 3-3M2 11h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          이 슬라이드
        </button>
        <button onClick={downloadAll} disabled={downloading}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors disabled:opacity-50">
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
