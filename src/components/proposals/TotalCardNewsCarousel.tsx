"use client";

import { useRef, useState, useCallback, useEffect, useMemo } from "react";
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

// ── Constants (identical to WeeklyCardNewsCarousel) ───────────────────────────
const SLIDE_W = 540;
const SLIDE_H = 675;
const SLIDE_FONT = '"Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const C = {
  brand:    "#FF7210",
  brand2:   "#ff4d00",
  brand3:   "#e63000",
  amber400: "#fbbf24",
  amber500: "#f59e0b",
  gray950:  "#030712",
};

function truncate(str: string, n: number) {
  const s = str.replace(/[\r\n\t]+/g, " ").trim();
  return s.length > n ? s.slice(0, n) + "…" : s;
}

// ── Shared primitives (exact copy from WeeklyCardNewsCarousel) ─────────────────
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

// ── Slide 1: Total Cover (same layout as SlideCover) ─────────────────────────
function SlideTotalCover({ id, total, filterCity, filterPostType, filteredCount }: {
  id: string; total: number;
  filterCity: string | null; filterPostType: string | null; filteredCount: number;
}) {
  const line1 = filterCity ?? "충청남도";
  const line2 = filterPostType === "불편제보" ? "불편제보"
    : filterPostType === "공약제안" ? "공약제안"
    : "불편제보·공약제안";
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
            서비스 시작(2026년 3월) 이후 전체
          </p>
          <p style={{ color: "white", fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>
            누적 현황
          </p>
        </div>
        <div>
          <p style={{ color: "white", fontSize: 100, fontWeight: 900, lineHeight: 0.95, letterSpacing: -3 }}>
            {line1}
          </p>
          <p style={{ color: "rgba(255,255,255,0.92)", fontSize: 50, fontWeight: 900, lineHeight: 1.05, letterSpacing: -1, marginTop: 8, whiteSpace: "nowrap", overflow: "hidden" }}>
            {line2}
          </p>
          <p style={{ color: "white", fontSize: 100, fontWeight: 900, lineHeight: 0.95, letterSpacing: -3, marginTop: 10, fontVariantNumeric: "tabular-nums" }}>
            {filteredCount}개
          </p>
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

// ── Slide 2: Total Stats Infographic (same layout as SlideWeeklyStats) ────────
function SlideTotalStats({ id, data, cityBreakdown, total, slideNum, filterPostType }: {
  id: string; data: CumulativeStats;
  cityBreakdown: CumulativeStats["cityBreakdown"];
  total: number; slideNum: number;
  filterPostType: string | null;
}) {
  const reports   = filterPostType === "공약제안" ? 0 : data.totalReports;
  const proposals = filterPostType === "불편제보" ? 0 : data.totalProposals;
  const topCities = cityBreakdown.slice(0, 3);
  const maxVal    = topCities[0]?.total ?? 1;
  return (
    <Slide id={id} bg={{ background: `linear-gradient(160deg, #1a0800 0%, ${C.gray950} 50%, #0a0a14 100%)` }}>
      <TopBar dark />
      <Counter current={slideNum} total={total} />
      <div style={{ position: "absolute", inset: 0, padding: "60px 28px 32px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <p style={{ color: C.brand, fontSize: 10, fontWeight: 900, letterSpacing: 3, textTransform: "uppercase" as const, marginBottom: 16 }}>TOTAL OVERVIEW</p>
        {/* Big stat cards — same layout as SlideWeeklyStats */}
        <div style={{ display: "flex", gap: 14, marginBottom: 24 }}>
          <div style={{ flex: 1, background: "rgba(255,114,16,0.18)", borderRadius: 24, padding: "22px 18px", border: "1px solid rgba(255,114,16,0.3)" }}>
            <p style={{ fontSize: 24, marginBottom: 8 }}>📢</p>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>불편 제보</p>
            <p style={{ color: "white", fontSize: 68, fontWeight: 900, lineHeight: 0.85, fontVariantNumeric: "tabular-nums" }}>{reports}</p>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, fontWeight: 600, marginTop: 8 }}>건 누적</p>
          </div>
          <div style={{ flex: 1, background: "rgba(251,191,36,0.15)", borderRadius: 24, padding: "22px 18px", border: "1px solid rgba(251,191,36,0.25)" }}>
            <p style={{ fontSize: 24, marginBottom: 8 }}>💡</p>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>공약 제안</p>
            <p style={{ color: "white", fontSize: 68, fontWeight: 900, lineHeight: 0.85, fontVariantNumeric: "tabular-nums" }}>{proposals}</p>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, fontWeight: 600, marginTop: 8 }}>건 누적</p>
          </div>
        </div>
        {/* Top cities mini chart — same layout as SlideWeeklyStats */}
        {topCities.length > 0 && (
          <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 18, padding: "18px 18px" }}>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: 700, letterSpacing: 2, marginBottom: 12, textTransform: "uppercase" as const }}>TOP AREA</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {topCities.map((item, i) => {
                const pct = maxVal > 0 ? (item.total / maxVal) * 100 : 0;
                return (
                  <div key={item.city} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ color: C.brand, fontSize: 12, fontWeight: 900, width: 16, textAlign: "right" as const, flexShrink: 0 }}>{i + 1}</span>
                    <span style={{ color: "white", fontSize: 13, fontWeight: 700, width: 54, flexShrink: 0 }}>{item.city}</span>
                    <div style={{ flex: 1, height: 22, background: "rgba(255,255,255,0.08)", borderRadius: 999, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(to right, ${C.brand}, ${C.brand3})`, borderRadius: 999 }} />
                    </div>
                    <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, fontWeight: 700, width: 24, textAlign: "right" as const, flexShrink: 0 }}>{item.total}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Slide>
  );
}

// ── Slide 3: City Breakdown (exact same as SlideCityMap in WeeklyCarousel) ────
function SlideTotalCity({ id, cityBreakdown, total, slideNum }: {
  id: string;
  cityBreakdown: CumulativeStats["cityBreakdown"];
  total: number; slideNum: number;
}) {
  const cities = cityBreakdown.slice(0, 5);
  const maxVal = cities[0]?.total ?? 1;
  return (
    <Slide id={id} bg={{ backgroundColor: C.gray950 }}>
      <TopBar dark />
      <Counter current={slideNum} total={total} />
      <div style={{ position: "absolute", inset: 0, padding: "0 28px", paddingTop: 60, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ marginBottom: 20 }}>
          <p style={{ color: C.brand, fontSize: 10, fontWeight: 900, letterSpacing: 3, textTransform: "uppercase" as const, marginBottom: 4 }}>AREA BREAKDOWN</p>
          <p style={{ color: "white", fontSize: 26, fontWeight: 900, lineHeight: 1.2 }}>시별 현황</p>
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 13 }}>제보/제안이 많은 시 TOP {cities.length}</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {cities.map((item, idx) => {
            const pct = maxVal > 0 ? (item.total / maxVal) * 100 : 0;
            const reportPct = item.total > 0 ? (item.reports / item.total) * 100 : 0;
            return (
              <div key={item.city} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ color: C.brand, fontWeight: 900, fontSize: 13, width: 18, textAlign: "right" as const, flexShrink: 0 }}>{idx + 1}</span>
                <span style={{ color: "white", fontWeight: 700, fontSize: 13, width: 56, flexShrink: 0 }}>{item.city}</span>
                <div style={{ flex: 1, position: "relative", height: 26, background: "rgba(255,255,255,0.1)", borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, overflow: "hidden" }}>
                    <div style={{ display: "flex", height: "100%" }}>
                      <div style={{ width: `${reportPct}%`, background: `linear-gradient(to right, ${C.brand}, ${C.brand3})` }} />
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
          {([["불편제보", C.brand], ["공약제안", C.amber400]] as [string, string][]).map(([label, color]) => (
            <span key={label} style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.45)", fontSize: 11 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0, display: "inline-block" }} />{label}
            </span>
          ))}
        </div>
      </div>
    </Slide>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function TotalCardNewsCarousel({ data, mode = "total", onModeChange }: Props) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [downloading, setDownloading]   = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [scale, setScale]               = useState(1);
  const [filterCity, setFilterCity]     = useState<string | null>(null);
  const [filterPostType, setFilterPostType] = useState<string | null>(null);
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

  // Filtered data
  const filtered = useMemo(() => {
    const breakdown = filterCity
      ? data.cityBreakdown.filter(c => c.city === filterCity)
      : data.cityBreakdown;

    const cityTotal = filterCity
      ? (data.cityBreakdown.find(c => c.city === filterCity)?.total ?? 0)
      : null;
    const cityReports = filterCity
      ? (data.cityBreakdown.find(c => c.city === filterCity)?.reports ?? 0)
      : null;
    const cityProposals = filterCity
      ? (data.cityBreakdown.find(c => c.city === filterCity)?.proposals ?? 0)
      : null;

    const reports   = cityReports   ?? data.totalReports;
    const proposals = cityProposals ?? data.totalProposals;

    const filteredCount =
      filterPostType === "불편제보" ? reports
      : filterPostType === "공약제안" ? proposals
      : (cityTotal ?? data.totalPosts);

    return { breakdown, filteredCount, reports, proposals };
  }, [data, filterCity, filterPostType]);

  const cityOptions = useMemo(() => data.cityBreakdown.map(c => c.city), [data.cityBreakdown]);

  const hasCityBreakdown = filtered.breakdown.length > 0;
  const slideCount = 2 + (hasCityBreakdown ? 1 : 0) + 1; // cover + stats + [city] + cta
  const slideIds   = ["t-slide-1","t-slide-2","t-slide-3","t-slide-4"].slice(0, slideCount);

  const goTo = useCallback((idx: number) => {
    setCurrentSlide(idx);
    const c = carouselRef.current;
    if (c) c.scrollTo({ left: idx * SLIDE_W, behavior: "smooth" });
  }, []);

  useEffect(() => { goTo(0); }, [filterCity, filterPostType, goTo]);

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
        const res = await fetch(src); const blob = await res.blob();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const fr = new FileReader(); fr.onloadend = () => resolve(fr.result as string);
          fr.onerror = reject; fr.readAsDataURL(blob);
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
    } catch (err) { console.error(err); alert("이미지 저장 실패: " + (err instanceof Error ? err.message : "")); }
    finally { setDownloading(false); setDownloadProgress(0); }
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
      {/* ── Filter chips (identical structure to WeeklyCardNewsCarousel) ── */}
      <div style={{ padding: "12px 16px 8px", background: "white", borderBottom: "1px solid #f3f4f6" }}>
        {/* 기간 */}
        {onModeChange && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", flexShrink: 0, width: 40 }}>기간</span>
            <div style={{ display: "flex", gap: 6 }}>
              <FilterChip label="📊 주간" active={mode === "weekly"} onClick={() => onModeChange("weekly")} />
              <FilterChip label="📅 일간" active={mode === "daily"}  onClick={() => onModeChange("daily")} />
              <FilterChip label="📈 전체" active={mode === "total"}  onClick={() => onModeChange("total")} />
            </div>
          </div>
        )}
        {/* 시군구 */}
        {cityOptions.length >= 1 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", flexShrink: 0, width: 40 }}>시군구</span>
            <div style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none" }}>
              <FilterChip label="전체" active={filterCity === null} onClick={() => setFilterCity(null)} />
              {cityOptions.map(city => (
                <FilterChip key={city} label={city} active={filterCity === city}
                  onClick={() => setFilterCity(filterCity === city ? null : city)} />
              ))}
            </div>
          </div>
        )}
        {/* 유형 */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", flexShrink: 0, width: 40 }}>유형</span>
          <div style={{ display: "flex", gap: 6 }}>
            <FilterChip label="전체"      active={filterPostType === null}      onClick={() => setFilterPostType(null)} />
            <FilterChip label="🚨 불편제보" active={filterPostType === "불편제보"} onClick={() => setFilterPostType(filterPostType === "불편제보" ? null : "불편제보")} />
            <FilterChip label="💡 공약제안" active={filterPostType === "공약제안"} onClick={() => setFilterPostType(filterPostType === "공약제안" ? null : "공약제안")} />
          </div>
        </div>
      </div>

      {/* ── Slide viewport ── */}
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
              <SlideTotalCover
                id={slideIds[si++]} total={slideCount}
                filterCity={filterCity} filterPostType={filterPostType}
                filteredCount={filtered.filteredCount}
              />
            </div>
            {/* Slide 2: Stats infographic */}
            <div style={{ scrollSnapAlign: "start", flexShrink: 0 }}>
              <SlideTotalStats
                id={slideIds[si++]} data={data}
                cityBreakdown={filtered.breakdown}
                total={slideCount} slideNum={si}
                filterPostType={filterPostType}
              />
            </div>
            {/* Slide 3: City breakdown */}
            {hasCityBreakdown && (
              <div style={{ scrollSnapAlign: "start", flexShrink: 0 }}>
                <SlideTotalCity id={slideIds[si++]} cityBreakdown={filtered.breakdown} total={slideCount} slideNum={si} />
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

      {/* Download / share bar (identical to WeeklyCardNewsCarousel) */}
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
