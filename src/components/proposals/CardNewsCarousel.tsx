"use client";

import { useRef, useState, useCallback, useEffect, useMemo } from "react";

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
  mode?: "daily" | "weekly";
  onModeChange?: (m: "daily" | "weekly") => void;
}

// ── Constants ──────────────────────────────────────────────────────────────────
const SLIDE_W = 540;
const SLIDE_H = 675;

const C = {
  brand:    "#FF7210",
  brand2:   "#ff4d00",
  brand3:   "#e63000",
  amber400: "#fbbf24",
  amber500: "#f59e0b",
  gray950:  "#030712",
  gray900:  "#111827",
  gray800:  "#1f2937",
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
  const s = str.replace(/[\r\n\t]+/g, " ").trim();
  return s.length > n ? s.slice(0, n) + "…" : s;
}

// ── Slide wrapper ─────────────────────────────────────────────────────────────
const SLIDE_FONT = '"Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

function Slide({ id, children, bg }: { id: string; children: React.ReactNode; bg: React.CSSProperties }) {
  return (
    <div
      id={id}
      className="relative overflow-hidden select-none"
      style={{ width: SLIDE_W, height: SLIDE_H, flexShrink: 0, fontFamily: SLIDE_FONT, ...bg }}
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
    <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-7 pt-12 z-10">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/reform-party-logo.png"
        alt="개혁신당"
        width={96}
        height={37}
        style={{ filter: dark ? "brightness(0) invert(1)" : "none", display: "block" }}
      />
      <div className="text-right leading-tight" style={{ flexShrink: 0 }}>
        <p style={{ color: textColor, fontSize: 26, fontWeight: 900, lineHeight: 1.1, whiteSpace: "nowrap" }}>4&nbsp;&nbsp;손승범</p>
        <p style={{ color: subColor, fontSize: 11, fontWeight: 600, lineHeight: 1.5 }}>📍 천안시</p>
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
function SlideCover({ id, totalReports, totalProposals, totalPosts, total, targetDate, dayOffset, filterCity, filterType }: {
  id: string;
  totalReports: number;
  totalProposals: number;
  totalPosts: number;
  total: number;
  targetDate: Date;
  dayOffset: number;
  filterCity: string | null;
  filterType: "all" | "report" | "proposal";
}) {
  const location = filterCity ?? "충청남도";
  const typeStr = filterType === "report" ? "불편제보" : filterType === "proposal" ? "공약제안" : "불편제보·공약제안";
  const count = filterType === "report" ? totalReports : filterType === "proposal" ? totalProposals : totalPosts;

  return (
    <Slide id={id} bg={{ background: `linear-gradient(145deg, ${C.brand}, ${C.brand2}, ${C.brand3})` }}>
      <TopBar dark />
      <Counter current={1} total={total} />

      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column", justifyContent: "space-between",
        padding: "110px 36px 32px",
      }}>
        {/* ① 날짜 */}
        <div>
          <p style={{ color: "rgba(255,255,255,0.62)", fontSize: 13, fontWeight: 600, marginBottom: 5, letterSpacing: 0.3 }}>
            {shortDate(targetDate)}
          </p>
          <p style={{ color: "white", fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>
            {dayOffset === 0 ? "오늘" : dayOffset === -1 ? "어제" : `${Math.abs(dayOffset)}일 전`}
          </p>
        </div>

        {/* ② 빅 헤드라인 */}
        <div>
          <p style={{ color: "white", fontSize: 100, fontWeight: 900, lineHeight: 0.95, letterSpacing: -3 }}>
            {location}
          </p>
          <p style={{ color: "rgba(255,255,255,0.92)", fontSize: 50, fontWeight: 900, lineHeight: 1.05, letterSpacing: -1, marginTop: 8, whiteSpace: "nowrap", overflow: "hidden" }}>
            {typeStr}
          </p>
          <p style={{ color: "white", fontSize: 100, fontWeight: 900, lineHeight: 0.95, letterSpacing: -3, marginTop: 10, fontVariantNumeric: "tabular-nums" }}>
            {count}개
          </p>
        </div>

        {/* ③ 하단 출처 */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.22)", paddingTop: 14 }}>
          <p style={{ color: "rgba(255,255,255,0.82)", fontSize: 11, lineHeight: 1.65 }}>
            성정1동 성정2동 봉명동 문성동 천안시의원 후보자 손승범 | 개혁신당
          </p>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, marginTop: 2 }}>
            reform-chungnam.kr
          </p>
        </div>
      </div>
    </Slide>
  );
}

// ── Slide 1.5: Stats Infographic ──────────────────────────────────────────────
function SlideStats({ id, totalReports, totalProposals, cityBreakdown, total, slideNum }: {
  id: string;
  totalReports: number;
  totalProposals: number;
  cityBreakdown: CityBreakdown[];
  total: number;
  slideNum: number;
}) {
  const topCities = cityBreakdown.slice(0, 3);
  const maxVal = topCities[0]?.total ?? 1;
  return (
    <Slide id={id} bg={{ background: `linear-gradient(160deg, #1a0800 0%, ${C.gray950} 50%, #0a0a14 100%)` }}>
      <TopBar dark />
      <Counter current={slideNum} total={total} />
      <div style={{ position: "absolute", inset: 0, padding: "60px 28px 32px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <p style={{ color: C.brand, fontSize: 10, fontWeight: 900, letterSpacing: 3, textTransform: "uppercase" as const, marginBottom: 16 }}>STATS OVERVIEW</p>
        {/* Big stat cards */}
        <div style={{ display: "flex", gap: 14, marginBottom: 28 }}>
          <div style={{ flex: 1, background: "rgba(255,114,16,0.18)", borderRadius: 24, padding: "24px 20px", border: "1px solid rgba(255,114,16,0.3)" }}>
            <p style={{ fontSize: 26, marginBottom: 10 }}>📢</p>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>불편 제보</p>
            <p style={{ color: "white", fontSize: 72, fontWeight: 900, lineHeight: 0.85, fontVariantNumeric: "tabular-nums" }}>{totalReports}</p>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, fontWeight: 600, marginTop: 10 }}>건 접수</p>
          </div>
          <div style={{ flex: 1, background: "rgba(251,191,36,0.15)", borderRadius: 24, padding: "24px 20px", border: "1px solid rgba(251,191,36,0.25)" }}>
            <p style={{ fontSize: 26, marginBottom: 10 }}>💡</p>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>공약 제안</p>
            <p style={{ color: "white", fontSize: 72, fontWeight: 900, lineHeight: 0.85, fontVariantNumeric: "tabular-nums" }}>{totalProposals}</p>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, fontWeight: 600, marginTop: 10 }}>건 제안</p>
          </div>
        </div>
        {/* Top cities mini chart */}
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

// ── Slide 2: Top Reports ──────────────────────────────────────────────────────
function SlideTopReports({ id, posts, totalReports, total, slideNum }: {
  id: string;
  posts: DailyPost[];
  totalReports: number;
  total: number;
  slideNum: number;
}) {
  const top = posts.slice(0, 3);
  return (
    <Slide id={id} bg={{ backgroundColor: C.gray950 }}>
      <TopBar dark />
      <Counter current={slideNum} total={total} />
      <div style={{ position: "absolute", inset: 0, padding: "0 28px", paddingTop: 60, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ marginBottom: 20 }}>
          <p style={{ color: C.brand, fontSize: 10, fontWeight: 900, letterSpacing: 3, textTransform: "uppercase", marginBottom: 4 }}>TODAY&apos;S REPORT</p>
          <p style={{ color: "white", fontSize: 26, fontWeight: 900, lineHeight: 1.2 }}>오늘의 불편 제보</p>
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 13 }}>총 {totalReports}건 접수됨</p>
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
        {totalReports > 3 && (
          <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 11, textAlign: "center", marginTop: 14 }}>외 {totalReports - 3}건 더 →</p>
        )}
      </div>
    </Slide>
  );
}

// ── Slide 3: City Breakdown ───────────────────────────────────────────────────
function SlideCityMap({ id, cityBreakdown, total, slideNum }: {
  id: string;
  cityBreakdown: CityBreakdown[];
  total: number;
  slideNum: number;
}) {
  const cities = cityBreakdown.slice(0, 5);
  const maxVal = cities[0]?.total ?? 1;
  return (
    <Slide id={id} bg={{ backgroundColor: C.gray950 }}>
      <TopBar dark />
      <Counter current={slideNum} total={total} />
      <div style={{ position: "absolute", inset: 0, padding: "0 28px", paddingTop: 60, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ marginBottom: 20 }}>
          <p style={{ color: C.brand, fontSize: 10, fontWeight: 900, letterSpacing: 3, textTransform: "uppercase", marginBottom: 4 }}>AREA BREAKDOWN</p>
          <p style={{ color: "white", fontSize: 26, fontWeight: 900, lineHeight: 1.2 }}>지역별 현황</p>
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 13 }}>제보/제안이 많은 지역 TOP {cities.length}</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {cities.map((item, idx) => {
            const pct = maxVal > 0 ? (item.total / maxVal) * 100 : 0;
            const reportPct = item.total > 0 ? (item.reports / item.total) * 100 : 0;
            return (
              <div key={item.city} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ color: C.brand, fontWeight: 900, fontSize: 13, width: 18, textAlign: "right", flexShrink: 0 }}>{idx + 1}</span>
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
          <span style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.45)", fontSize: 11 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: C.brand, flexShrink: 0, display: "inline-block" }} />불편제보
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
function DailyPostTile({ post, idx, fullWidth }: { post: DailyPost; idx: number; fullWidth?: boolean }) {
  const title = post.title ? truncate(post.title, fullWidth ? 34 : 22) : null;
  const body = truncate(post.content ?? "", fullWidth ? 70 : 42);
  const loc = [post.city, post.dong].filter(Boolean).join(" ");
  const rankLabel = ["1위","2위","3위"][idx] ?? `${idx+1}위`;
  const rankEmoji = ["🥇","🥈","🥉"][idx] ?? "🏅";
  const TILE_BG = "rgba(8, 42, 74, 0.88)";
  const TILE_BORDER = "1px solid rgba(255,255,255,0.12)";
  return (
    <div style={{
      background: TILE_BG,
      borderRadius: 20,
      border: TILE_BORDER,
      padding: fullWidth ? "18px 20px" : "14px 16px",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      flex: 1,
      minHeight: 0,
    }}>
      {/* rank + type + likes row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ fontSize: fullWidth ? 18 : 15, lineHeight: 1 }}>{rankEmoji}</span>
          <span style={{ color: "white", fontSize: fullWidth ? 15 : 12, fontWeight: 900, letterSpacing: -0.5 }}>{rankLabel}</span>
          <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 999,
            background: post.postType === "민원" ? "rgba(239,68,68,0.35)" : "rgba(251,191,36,0.30)",
            color: post.postType === "민원" ? "#fca5a5" : "#fde68a" }}>
            {post.postType === "민원" ? "📢 불편제보" : "💡 공약제안"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 3, background: "rgba(239,68,68,0.22)", borderRadius: 20, padding: "3px 7px" }}>
          <span style={{ fontSize: 10 }}>❤️</span>
          <span style={{ color: "#fca5a5", fontWeight: 900, fontSize: 11, fontVariantNumeric: "tabular-nums" }}>{post.likeCount}</span>
        </div>
      </div>
      {/* title */}
      {title && <p style={{ color: "white", fontWeight: 800, fontSize: fullWidth ? 15 : 12, lineHeight: 1.3, marginBottom: 5 }}>{title}</p>}
      {/* body */}
      <p style={{ color: "rgba(255,255,255,0.62)", fontSize: fullWidth ? 12 : 10, lineHeight: 1.5, flex: 1, overflow: "hidden" }}>{body}</p>
      {/* location */}
      {loc && <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, marginTop: 6, fontWeight: 600 }}>📍 {loc}</p>}
    </div>
  );
}

function SlidePopular({ id, topLikedPosts, total, slideNum, isWeekly = false }: {
  id: string;
  topLikedPosts: DailyPost[];
  total: number;
  slideNum: number;
  isWeekly?: boolean;
}) {
  const posts = topLikedPosts.slice(0, 3);

  return (
    <Slide id={id} bg={{ background: `linear-gradient(145deg, ${C.brand}, ${C.brand2}, ${C.brand3})` }}>
      <TopBar dark />
      <Counter current={slideNum} total={total} />
      <div style={{
        position: "absolute", inset: 0,
        padding: "78px 20px 20px",
        display: "flex", flexDirection: "column",
        gap: 0,
      }}>
        {/* Header */}
        <div style={{ marginBottom: 14 }}>
          <p style={{ color: "rgba(255,255,255,0.62)", fontSize: 12, fontWeight: 600, marginBottom: 3 }}>
            {isWeekly ? "이번 주" : "오늘"}
          </p>
          <p style={{ color: "white", fontSize: 24, fontWeight: 900, letterSpacing: -0.5 }}>
            {isWeekly ? "이번주 인기글" : "오늘의 인기글"}
          </p>
        </div>
        {/* 1위 full-width tile */}
        {posts[0] && (
          <div style={{ height: 220, display: "flex", marginBottom: 12 }}>
            <DailyPostTile post={posts[0]} idx={0} fullWidth />
          </div>
        )}
        {/* 2위/3위 side by side */}
        {posts.length > 1 && (
          <div style={{ display: "flex", gap: 12, flex: 1, minHeight: 0 }}>
            {posts[1] && <DailyPostTile post={posts[1]} idx={1} />}
            {posts[2] && <DailyPostTile post={posts[2]} idx={2} />}
            {posts.length < 3 && <div style={{ flex: 1 }} />}
          </div>
        )}
        {/* bottom */}
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, textAlign: "center", marginTop: 10 }}>
          reform-chungnam.kr
        </p>
      </div>
    </Slide>
  );
}

// ── Slide CTA (last) — light background ───────────────────────────────────────
export function SlideCTA({ id, current, total }: { id: string; current: number; total: number }) {
  return (
    <Slide id={id} bg={{ backgroundColor: "#fff7ed" }}>
      {/* Decorative top orange strip */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 8, background: `linear-gradient(to right, ${C.brand}, ${C.brand3})` }} />

      <TopBar dark={false} />
      <Counter current={current} total={total} dark={false} />

      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 32px", textAlign: "center" }}>
        <p style={{ color: C.brand, fontSize: 11, fontWeight: 900, letterSpacing: 3, textTransform: "uppercase", marginBottom: 12 }}>YOUR TURN</p>

        <p style={{ color: "#111827", fontSize: 30, fontWeight: 900, lineHeight: 1.3, marginBottom: 8, whiteSpace: "pre-line" }}>
          {"당신 집 앞\n불편을 제보하세요"}
        </p>
        <p style={{ color: "#6b7280", fontSize: 14, lineHeight: 1.7, marginBottom: 32, whiteSpace: "pre-line" }}>
          {"함께 기록하면 정치인은 움직입니다\n로그인 없이도 바로 제보할 수 있어요"}
        </p>

        {/* URL box */}
        <div style={{ width: "100%", background: `linear-gradient(135deg, ${C.brand}, ${C.brand2})`, borderRadius: 18, padding: "16px 28px", marginBottom: 14 }}>
          <p style={{ color: "white", fontSize: 22, fontWeight: 900, letterSpacing: -0.5 }}>reform-chungnam.kr</p>
        </div>

        {/* Profile hint */}
        <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, background: "rgba(0,0,0,0.05)", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 14, padding: "12px 20px" }}>
          <span style={{ fontSize: 18 }}>👆</span>
          <p style={{ color: "#374151", fontSize: 13, fontWeight: 600 }}>프로필 링크에서도 바로 접속 가능</p>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 24, textAlign: "center" }}>
          <p style={{ color: "#6b7280", fontSize: 11, fontWeight: 600 }}>
            개혁신당 문성동 봉명동 성정1동 성정2동 천안시의원 후보
          </p>
          <p style={{ color: "#111827", fontSize: 20, fontWeight: 900, marginTop: 4 }}>손승범</p>
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

// ── Filter Chip ───────────────────────────────────────────────────────────────
function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        flexShrink: 0,
        padding: "4px 12px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        border: active ? "none" : "1px solid #d1d5db",
        background: active ? C.brand : "white",
        color: active ? "white" : "#374151",
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "all 0.15s",
      }}
    >
      {label}
    </button>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function CardNewsCarousel({ data, dayOffset, targetDate, mode = "daily", onModeChange }: Props) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [scale, setScale] = useState(1);
  const [filterCity, setFilterCity] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<"all" | "report" | "proposal">("all");
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

  // Filtered data
  const filtered = useMemo(() => {
    const allPosts = [...data.reports, ...data.proposals];

    const filteredReports = data.reports.filter(p => {
      if (filterCity && p.city !== filterCity) return false;
      return true;
    });
    const filteredProposals = data.proposals.filter(p => {
      if (filterCity && p.city !== filterCity) return false;
      return true;
    });

    const visiblePosts = filterType === "report"
      ? filteredReports
      : filterType === "proposal"
        ? filteredProposals
        : [...filteredReports, ...filteredProposals];

    const totalReports = filteredReports.length;
    const totalProposals = filteredProposals.length;
    const totalPosts = filterType === "report"
      ? totalReports
      : filterType === "proposal"
        ? totalProposals
        : totalReports + totalProposals;

    // Recompute city breakdown from filtered posts
    const cityMap: Record<string, { reports: number; proposals: number }> = {};
    const postsForCity = [...filteredReports, ...filteredProposals];
    for (const p of postsForCity) {
      const city = p.city ?? "기타";
      if (!cityMap[city]) cityMap[city] = { reports: 0, proposals: 0 };
      if (data.reports.includes(p)) cityMap[city].reports++;
      else cityMap[city].proposals++;
    }
    const cityBreakdown: CityBreakdown[] = Object.entries(cityMap)
      .map(([city, c]) => ({ city, reports: c.reports, proposals: c.proposals, total: c.reports + c.proposals }))
      .sort((a, b) => b.total - a.total);

    const topLikedPosts = [...data.topLikedPosts]
      .filter(p => {
        if (filterCity && p.city !== filterCity) return false;
        if (filterType === "report" && !["불편제보", "민원"].includes(p.postType)) return false;
        if (filterType === "proposal" && !["공약제안", "제안", "공약"].includes(p.postType)) return false;
        return p.likeCount > 0;
      })
      .sort((a, b) => b.likeCount - a.likeCount)
      .slice(0, 3);

    // For SlideTopReports use filtered reports
    const reportsForSlide = filterType === "proposal" ? [] : filteredReports;

    void allPosts;
    void visiblePosts;

    return { filteredReports: reportsForSlide, filteredProposals, totalReports, totalProposals, totalPosts, cityBreakdown, topLikedPosts };
  }, [data, filterCity, filterType]);

  // Cities for filter chips
  const cityOptions = useMemo(() => {
    return data.cityBreakdown.map(c => c.city);
  }, [data.cityBreakdown]);

  // Build slide list
  const hasTopReports = filtered.filteredReports.length > 0 && filterType !== "proposal";
  const hasCityMap    = filtered.cityBreakdown.length > 0;
  const hasPopular    = filtered.topLikedPosts.length > 0;
  // +1 for SlideStats (always shown)
  const slideCount    = 3 + (hasTopReports ? 1 : 0) + (hasCityMap ? 1 : 0) + (hasPopular ? 1 : 0);
  const slideIds      = ["card-slide-1","card-slide-2","card-slide-3","card-slide-4","card-slide-5","card-slide-6"].slice(0, slideCount);

  const goTo = useCallback((idx: number) => {
    setCurrentSlide(idx);
    const c = carouselRef.current;
    if (c) c.scrollTo({ left: idx * SLIDE_W, behavior: "smooth" });
  }, []);

  // Reset to slide 0 when filters change
  useEffect(() => {
    goTo(0);
  }, [filterCity, filterType, goTo]);

  const handleScroll = useCallback(() => {
    const c = carouselRef.current;
    if (!c) return;
    const idx = Math.round(c.scrollLeft / SLIDE_W);
    if (idx !== currentSlide) setCurrentSlide(idx);
  }, [currentSlide]);

  // ── Capture ───────────────────────────────────────────────────────────────
  const captureSlide = useCallback(async (id: string): Promise<string> => {
    const el = document.getElementById(id);
    if (!el) throw new Error("Slide not found: " + id);
    const { domToCanvas } = await import("modern-screenshot");

    const clone = el.cloneNode(true) as HTMLElement;
    clone.id = id + "-snap";

    // Pre-fetch all images as data URLs so modern-screenshot doesn't hang on fetching
    await Promise.all(Array.from(clone.querySelectorAll("img")).map(async (img) => {
      const src = (img as HTMLImageElement).src; // absolute URL
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
      } catch {
        (img as HTMLImageElement).removeAttribute("src");
      }
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
    // Use slide's actual text so every character's font slice loads.
    // Pretendard dynamic-subset skips slices for off-screen slides.
    const slideText = el.textContent ?? '';
    await Promise.allSettled([
      document.fonts.load(`900 14px "Pretendard Variable"`, slideText),
      document.fonts.load(`800 14px "Pretendard Variable"`, slideText),
      document.fonts.load(`700 14px "Pretendard Variable"`, slideText),
      document.fonts.load(`600 14px "Pretendard Variable"`, slideText),
      document.fonts.load(`400 14px "Pretendard Variable"`, slideText),
    ]);
    await new Promise<void>(r => { requestAnimationFrame(() => { requestAnimationFrame(() => r()); }); });
    try {
      const canvas = await Promise.race([
        domToCanvas(clone, { scale: 2, width: SLIDE_W, height: SLIDE_H }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Capture timeout")), 15000)),
      ]);
      return canvas.toDataURL("image/jpeg", 0.95);
    } finally {
      clone.remove();
    }
  }, []);

  const dateStr = `${targetDate.getFullYear()}${String(targetDate.getMonth()+1).padStart(2,"0")}${String(targetDate.getDate()).padStart(2,"0")}`;

  const downloadAll = useCallback(async () => {
    setDownloading(true);
    setDownloadProgress(0);
    try {
      for (let i = 0; i < slideIds.length; i++) {
        // Navigate to slide first so browser renders it and loads font slices
        goTo(i);
        await new Promise(r => setTimeout(r, 200));
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
  }, [slideIds, dateStr, captureSlide, goTo]);

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
    <div style={{ maxWidth: SLIDE_W, fontFamily: SLIDE_FONT }} className="mx-auto rounded-3xl overflow-hidden border border-gray-200 shadow-lg bg-white">
      {/* Filter chips — above slide viewport */}
      <div style={{ padding: "12px 16px 8px", background: "white", borderBottom: "1px solid #f3f4f6" }}>
        {/* Period filter */}
        {onModeChange && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", flexShrink: 0, width: 40 }}>기간</span>
            <div style={{ display: "flex", gap: 6 }}>
              <FilterChip label="📊 주간" active={mode === "weekly"} onClick={() => onModeChange("weekly")} />
              <FilterChip label="📅 일간" active={mode === "daily"} onClick={() => onModeChange("daily")} />
            </div>
          </div>
        )}
        {/* City filter */}
        {cityOptions.length >= 2 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", flexShrink: 0, width: 40 }}>시군구</span>
            <div style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none" }}>
              <FilterChip label="전체" active={filterCity === null} onClick={() => setFilterCity(null)} />
              {cityOptions.map(city => (
                <FilterChip key={city} label={city} active={filterCity === city} onClick={() => setFilterCity(filterCity === city ? null : city)} />
              ))}
            </div>
          </div>
        )}
        {/* Type filter */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", flexShrink: 0, width: 40 }}>유형</span>
          <div style={{ display: "flex", gap: 6 }}>
            <FilterChip label="전체" active={filterType === "all"} onClick={() => setFilterType("all")} />
            <FilterChip label="📢 불편제보" active={filterType === "report"} onClick={() => setFilterType(filterType === "report" ? "all" : "report")} />
            <FilterChip label="💡 공약제안" active={filterType === "proposal"} onClick={() => setFilterType(filterType === "proposal" ? "all" : "proposal")} />
          </div>
        </div>
      </div>

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
            {/* Slide 1: Cover */}
            <div style={{ scrollSnapAlign: "start", flexShrink: 0 }}>
              <SlideCover
                id={slideIds[si++]}
                totalReports={filtered.totalReports}
                totalProposals={filtered.totalProposals}
                totalPosts={filtered.totalPosts}
                total={slideCount}
                targetDate={targetDate}
                dayOffset={dayOffset}
                filterCity={filterCity}
                filterType={filterType}
              />
            </div>
            {/* Slide 2: Stats Infographic */}
            <div style={{ scrollSnapAlign: "start", flexShrink: 0 }}>
              <SlideStats
                id={slideIds[si++]}
                totalReports={filtered.totalReports}
                totalProposals={filtered.totalProposals}
                cityBreakdown={filtered.cityBreakdown}
                total={slideCount}
                slideNum={si}
              />
            </div>
            {/* Slide 3: Top Reports */}
            {hasTopReports && (
              <div style={{ scrollSnapAlign: "start", flexShrink: 0 }}>
                <SlideTopReports
                  id={slideIds[si++]}
                  posts={filtered.filteredReports}
                  totalReports={filtered.totalReports}
                  total={slideCount}
                  slideNum={si}
                />
              </div>
            )}
            {/* Slide 3: City Map */}
            {hasCityMap && (
              <div style={{ scrollSnapAlign: "start", flexShrink: 0 }}>
                <SlideCityMap
                  id={slideIds[si++]}
                  cityBreakdown={filtered.cityBreakdown}
                  total={slideCount}
                  slideNum={si}
                />
              </div>
            )}
            {/* Slide 4: Popular */}
            {hasPopular && (
              <div style={{ scrollSnapAlign: "start", flexShrink: 0 }}>
                <SlidePopular
                  id={slideIds[si++]}
                  topLikedPosts={filtered.topLikedPosts}
                  total={slideCount}
                  slideNum={si}
                  isWeekly={false}
                />
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
