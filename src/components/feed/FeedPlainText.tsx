"use client";

import { useEffect, useState, useMemo, useRef } from "react";

interface FeedPost {
  id: string;
  title: string;
  content: string;
  authorName: string;
  postType: string | null;
  status: string;
  adminStatus: string | null;
  city: string | null;
  dong: string | null;
  dongLabel: string | null;
  locationLabel: string | null;
  isCityCenterOnly: boolean;
  legalDong: string | null;
  admDong: string | null;
  latitude: number | null;
  longitude: number | null;
  candidateId: string | null;
  parentId: string | null;
  issueId: string | null;
  issue: { id: string; title: string; category: string | null; emoji: string | null } | null;
  createdAt: string;
  responses: Array<{
    candidateName: string;
    status: string;
    content: string;
    officialResponse: string | null;
    pledgeId: string | null;
    createdAt: string;
  }>;
  linkedPledges: Array<{ id: string; title: string }>;
}

interface Facets {
  cities: string[];
  admDongs: string[];
  legalDongs: string[];
  rawDongs: string[];
  admDongsByCity: Record<string, string[]>;
  legalDongsByCity: Record<string, string[]>;
  issues: Array<{ id: string; title: string; category: string | null; emoji: string | null }>;
}

type DongType = "adm" | "legal";

// ─── Client-side reverse geocoding via Naver Maps SDK ─────────────────────
// SDK is loaded in app/layout.tsx with submodules=geocoder.
// Returns "행정동 (법정동)" formatted label, or just one name if they match.
//
// We avoid declaring a global `naver` type here because other files already do
// (LocationPickerMap.tsx etc.) — instead we cast the window inline.

interface NaverGeocoderShape {
  maps: {
    LatLng: new (lat: number, lng: number) => unknown;
    Service?: {
      reverseGeocode: (req: { coords: unknown; orders: string }, cb: (status: unknown, response: unknown) => void) => void;
      OrderType: { LEGAL_CODE: string; ADM_CODE: string };
      Status: { OK: unknown };
    };
  };
}

function getNaver(): NaverGeocoderShape | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { naver?: NaverGeocoderShape };
  return w.naver ?? null;
}

function clientReverseGeocode(lat: number, lng: number): Promise<string | null> {
  return new Promise((resolve) => {
    const naver = getNaver();
    if (!naver?.maps?.Service) {
      resolve(null);
      return;
    }
    const latlng = new naver.maps.LatLng(lat, lng);
    const orders = `${naver.maps.Service.OrderType.LEGAL_CODE},${naver.maps.Service.OrderType.ADM_CODE}`;
    let done = false;
    const timer = setTimeout(() => { if (!done) { done = true; resolve(null); } }, 6000);
    try {
      naver.maps.Service.reverseGeocode({ coords: latlng, orders }, (status, response) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        try {
          if (status !== naver.maps.Service!.Status.OK) { resolve(null); return; }
          type Region = { area3?: { name?: string } };
          type Result = { name?: string; region?: Region };
          const r = response as { v2?: { results?: Result[] } };
          const results = r?.v2?.results ?? [];
          const legal = results.find((x) => x.name === "legalcode")?.region?.area3?.name?.trim() || null;
          const adm   = results.find((x) => x.name === "admcode")?.region?.area3?.name?.trim()   || null;
          if (!legal && !adm) { resolve(null); return; }
          if (adm && legal) resolve(adm === legal ? adm : `${adm} (${legal})`);
          else resolve(adm ?? legal);
        } catch {
          resolve(null);
        }
      });
    } catch {
      done = true;
      clearTimeout(timer);
      resolve(null);
    }
  });
}

async function waitForNaverSdk(maxMs = 8000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const naver = getNaver();
    if (naver?.maps?.Service) return true;
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}

type Filter = "all" | "민원" | "제안";

/**
 * AI-friendly plain-text rendering of all 불편제보 / 공약제안 posts.
 *
 * Designed so AI agents (Claude in Chrome, etc.) can scrape and digest the data.
 * - Each post is a standalone block, separated by `---`
 * - All metadata is on labeled lines ("제목:", "위치:", "처리단계:" 등)
 * - 행정동/법정동 표시: 같으면 단일 이름, 다르면 "행정동 (법정동)"
 * - Candidate responses are listed in order with stage labels preserved
 */
export default function FeedPlainText({ adminMode = false }: { adminMode?: boolean }) {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [facets, setFacets] = useState<Facets>({
    cities: [], admDongs: [], legalDongs: [], rawDongs: [],
    admDongsByCity: {}, legalDongsByCity: {}, issues: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  // Set 대신 string[] 사용 — useEffect deps의 reference equality 무한 루프 방지
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [selectedDongs, setSelectedDongs] = useState<string[]>([]);
  const [dongType, setDongType] = useState<DongType>("adm");
  const [issueFilter, setIssueFilter] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [enrichingDongs, setEnrichingDongs] = useState(false);
  const dongCacheRef = useRef<Map<string, string | null>>(new Map());

  // 정렬된 join key — useEffect deps를 string으로 안정화 (Set/array reference 변화로 인한 무한 루프 방지)
  const citiesKey = useMemo(() => selectedCities.slice().sort().join("|"), [selectedCities]);
  const dongsKey  = useMemo(() => selectedDongs.slice().sort().join("|"),  [selectedDongs]);

  // 행정동/법정동 선택 가능한 후보 — 시군구 미선택 시 빈 배열 (선택 강제)
  const dongOptions = useMemo(() => {
    if (selectedCities.length === 0) return [] as string[];
    const map = dongType === "adm" ? facets.admDongsByCity : facets.legalDongsByCity;
    const out = new Set<string>();
    for (const c of selectedCities) {
      for (const d of map[c] ?? []) out.add(d);
    }
    return Array.from(out).sort((a, b) => a.localeCompare(b, "ko"));
  }, [selectedCities, dongType, facets.admDongsByCity, facets.legalDongsByCity]);

  // 토글이나 시군구 변경으로 더 이상 유효하지 않은 동 선택 정리
  useEffect(() => {
    setSelectedDongs((prev) => {
      if (prev.length === 0) return prev;
      const allowed = new Set(dongOptions);
      const next = prev.filter((d) => allowed.has(d));
      // content 동일하면 prev 그대로 — 새 reference 만들지 않아 fetch loop 방지
      if (next.length === prev.length) return prev;
      return next;
    });
  }, [dongOptions]);

  useEffect(() => {
    const params = new URLSearchParams({ limit: "200" });
    if (filter !== "all") params.set("postType", filter);
    if (selectedCities.length > 0) params.set("city", selectedCities.join(","));
    if (selectedDongs.length > 0) {
      params.set("dong", selectedDongs.join(","));
      params.set("dongType", dongType);
    }
    if (issueFilter) params.set("issueId", issueFilter);
    let cancelled = false;
    setLoading(true);
    fetch(`/api/feed?${params}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j.success) {
          setPosts(j.data ?? []);
          if (j.facets) setFacets(j.facets);
        } else {
          setError(j.error ?? "불러오기에 실패했습니다");
        }
      })
      .catch(() => { if (!cancelled) setError("네트워크 오류"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // string deps만 사용 — array reference 변화로 인한 무한 루프 차단
  }, [filter, citiesKey, dongsKey, dongType, issueFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleCity = (c: string) => setSelectedCities((s) => s.includes(c) ? s.filter((x) => x !== c) : [...s, c]);
  const toggleDong = (d: string) => setSelectedDongs((s)  => s.includes(d) ? s.filter((x) => x !== d) : [...s, d]);
  const clearAll = () => { setSelectedCities([]); setSelectedDongs([]); setIssueFilter(""); };

  const hasAnyFilter = selectedCities.length > 0 || selectedDongs.length > 0 || !!issueFilter;

  // Fallback client-side enrichment for posts that still don't have a dong (very old posts pre-backfill).
  useEffect(() => {
    if (posts.length === 0) return;
    let cancelled = false;
    (async () => {
      const sdkReady = await waitForNaverSdk();
      if (!sdkReady || cancelled) return;
      const targets = posts.filter((p) =>
        !p.dongLabel && p.latitude != null && p.longitude != null
      );
      if (targets.length === 0) return;
      setEnrichingDongs(true);
      const uniq = new Map<string, { lat: number; lng: number }>();
      for (const p of targets) {
        const key = `${p.latitude!.toFixed(5)},${p.longitude!.toFixed(5)}`;
        if (!uniq.has(key)) uniq.set(key, { lat: p.latitude!, lng: p.longitude! });
      }
      for (const [key, { lat, lng }] of uniq) {
        if (cancelled) break;
        if (dongCacheRef.current.has(key)) continue;
        const label = await clientReverseGeocode(lat, lng);
        dongCacheRef.current.set(key, label);
        setPosts((prev) => prev.map((p) => {
          if (p.dongLabel) return p;
          if (p.latitude == null || p.longitude == null) return p;
          const k = `${p.latitude.toFixed(5)},${p.longitude.toFixed(5)}`;
          if (k === key && label) return { ...p, dongLabel: label };
          return p;
        }));
        await new Promise((r) => setTimeout(r, 80));
      }
      if (!cancelled) setEnrichingDongs(false);
    })();
    return () => { cancelled = true; };
  }, [posts.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const plainText = useMemo(() => buildPlainText(posts), [posts]);

  const handleCopy = () => {
    navigator.clipboard
      .writeText(plainText)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {});
  };

  return (
    <div className="max-w-screen-xl">
      <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">📜 AI 친화 게시글 피드</h1>
          <p className="text-xs text-muted mt-1 leading-relaxed max-w-prose">
            모든 불편제보·공약제안과 후보자 답변·연결 공약을 한 줄글로 정리합니다.
            Claude in Chrome 같은 AI 에이전트가 페이지 전체를 읽어 데이터를 정리할 수 있는 형식입니다.
            읍면동은 <strong>행정동 (법정동)</strong> 형식으로 표시되며, 두 명칭이 같으면 단일 이름만 표시됩니다.
            {adminMode && <span className="block mt-1 text-blue-700">관리자 모드: 모든 후보자 게시글 표시</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1 bg-surface border border-border rounded-lg p-0.5">
            {(["all", "민원", "제안"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  filter === f ? "bg-primary text-white" : "text-muted hover:text-foreground"
                }`}
              >
                {f === "all" ? "전체" : f === "민원" ? "📢 불편제보" : "💡 공약제안"}
              </button>
            ))}
          </div>
          <select
            value={issueFilter}
            onChange={(e) => setIssueFilter(e.target.value)}
            className="px-2 py-1.5 text-xs border border-border rounded-lg bg-surface text-foreground"
            aria-label="이슈 필터"
          >
            <option value="">이슈 전체</option>
            {facets.issues.map((i) => <option key={i.id} value={i.id}>{i.emoji ? i.emoji + " " : ""}{i.title}</option>)}
          </select>
          {hasAnyFilter && (
            <button onClick={clearAll} className="text-[10px] text-muted hover:text-foreground border border-border px-2 py-1 rounded">
              필터 전체 해제
            </button>
          )}
          <button
            onClick={handleCopy}
            className="text-xs font-bold bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors"
          >
            {copied ? "✓ 복사됨" : "📋 전체 텍스트 복사"}
          </button>
        </div>
      </div>

      {/* ── 위치 필터 패널: 시군구 + 행정동/법정동 토글 + 다중선택 chip ─── */}
      <div className="bg-surface border border-border rounded-xl p-4 mb-4 space-y-3">
        {/* 시군구 (다중선택) */}
        {facets.cities.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold text-muted mb-1.5">📍 시군구 ({selectedCities.length}/{facets.cities.length})</p>
            <div className="flex flex-wrap gap-1">
              {facets.cities.map((c) => {
                const sel = selectedCities.includes(c);
                return (
                  <button
                    key={c}
                    onClick={() => toggleCity(c)}
                    className={`px-2 py-0.5 text-[11px] rounded-full border transition-colors ${
                      sel ? "bg-primary text-white border-primary" : "bg-background text-muted border-border hover:border-primary/40"
                    }`}
                  >
                    {sel ? "✓ " : ""}{c}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 동 토글 + 다중선택 chip — 시군구 선택 후에만 표시 */}
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <p className="text-[11px] font-semibold text-muted">읍·면·동 ({selectedDongs.length}/{dongOptions.length})</p>
            <div className="flex gap-0.5 bg-background border border-border rounded p-0.5">
              <button
                onClick={() => setDongType("adm")}
                className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
                  dongType === "adm" ? "bg-primary text-white" : "text-muted hover:text-foreground"
                }`}
                title="행정동 — 주민센터 단위 (예: 봉명1동, 봉명2동)"
              >
                🏛️ 행정동
              </button>
              <button
                onClick={() => setDongType("legal")}
                className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
                  dongType === "legal" ? "bg-primary text-white" : "text-muted hover:text-foreground"
                }`}
                title="법정동 — 법적 주소 단위 (예: 봉명동)"
              >
                📜 법정동
              </button>
            </div>
            {selectedDongs.length > 0 && (
              <button onClick={() => setSelectedDongs([])} className="text-[10px] text-muted hover:text-foreground underline">
                선택 해제
              </button>
            )}
          </div>
          {selectedCities.length === 0 ? (
            <p className="text-[11px] text-muted bg-background/60 border border-dashed border-border rounded-lg px-3 py-2">
              👆 위에서 시군구를 먼저 선택하면 해당 지역의 {dongType === "adm" ? "행정동" : "법정동"}만 표시됩니다.
            </p>
          ) : dongOptions.length === 0 ? (
            <p className="text-[10px] text-muted">선택한 시군구에 등록된 {dongType === "adm" ? "행정동" : "법정동"} 데이터가 없습니다.</p>
          ) : (
            <div className="flex flex-wrap gap-1 max-h-40 overflow-y-auto pr-1">
              {dongOptions.map((d) => {
                const sel = selectedDongs.includes(d);
                return (
                  <button
                    key={d}
                    onClick={() => toggleDong(d)}
                    className={`px-2 py-0.5 text-[11px] rounded-full border transition-colors ${
                      sel ? "bg-emerald-600 text-white border-emerald-600" : "bg-background text-muted border-border hover:border-emerald-400"
                    }`}
                  >
                    {sel ? "✓ " : ""}{d}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-muted text-sm">불러오는 중...</p>
      ) : error ? (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      ) : posts.length === 0 ? (
        <p className="text-muted text-sm">표시할 게시글이 없습니다.</p>
      ) : (
        <article
          // The whole feed is a single semantic article so AI scrapers can grab it as one block.
          aria-label="ai-friendly-feed-plain-text"
          data-ai-feed="true"
          className="bg-surface border border-border rounded-xl p-5 font-mono text-[13px] leading-relaxed text-foreground whitespace-pre-wrap break-words"
          style={{ maxHeight: "calc(100vh - 220px)", overflowY: "auto" }}
        >
          {plainText}
        </article>
      )}

      <p className="mt-3 text-[10px] text-muted">
        총 {posts.length}건 {enrichingDongs && <span className="text-primary">· 행정동/법정동 정보 채우는 중…</span>} — AI 에이전트는 <code>article[data-ai-feed=&quot;true&quot;]</code> 안의 텍스트를 읽으면 됩니다.
      </p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────

function buildPlainText(posts: FeedPost[]): string {
  if (posts.length === 0) return "(없음)";
  const header = [
    `# 불편제보·공약제안 통합 피드`,
    `# 생성: ${new Date().toLocaleString("ko-KR")}`,
    `# 총 ${posts.length}건`,
    `# 형식: 게시글당 하나의 블록, ---로 구분`,
    `# 위치 표기: city + 행정동 (법정동) — 행정동·법정동이 동일하면 한 이름만`,
    ``,
  ].join("\n");

  const blocks = posts.map((p, idx) => formatPost(p, idx + 1));
  return header + "\n" + blocks.join("\n---\n\n");
}

function formatPost(p: FeedPost, n: number): string {
  const type = p.postType === "민원" ? "불편제보" : p.postType === "제안" ? "공약제안" : "기타";
  // 시군구청 좌표만 찍힌 경우 "OO시 전체"로, 그 외엔 city + dong
  const location = p.locationLabel
    ?? (p.isCityCenterOnly && p.city ? `${p.city} 전체` : null)
    ?? [p.city, p.dongLabel || p.dong].filter(Boolean).join(" ")
    ?? "(위치 미지정)";
  const statusLabel = humanStatus(p.status);
  const adminStatusLabel = humanAdminStatus(p.adminStatus);
  const date = formatDate(p.createdAt);

  const lines: string[] = [
    `[${n}] ${type} | ${location}`,
    `제목: ${p.title || "(제목 없음)"}`,
    `작성자: ${p.authorName}${p.candidateId ? " (후보자)" : ""}`,
    `작성일: ${date}`,
    `게시글 상태: ${statusLabel}`,
  ];
  if (adminStatusLabel) lines.push(`처리단계: ${adminStatusLabel}`);
  if (p.issue) {
    const cat = p.issue.category ? ` / ${p.issue.category}` : "";
    lines.push(`소속 이슈: ${p.issue.emoji ? p.issue.emoji + " " : ""}${p.issue.title}${cat} (id: ${p.issue.id})`);
  } else {
    lines.push(`소속 이슈: 없음`);
  }
  if (p.parentId) lines.push(`연결된 부모 게시글: ${p.parentId}`);
  if (p.latitude != null && p.longitude != null) {
    lines.push(`좌표: ${p.latitude.toFixed(6)}, ${p.longitude.toFixed(6)}`);
  }

  // Body
  lines.push(``, `[내용]`, p.content.trim() || "(빈 본문)", ``);

  // Responses
  if (p.responses.length > 0) {
    lines.push(`[후보자 답변 — 단계별 ${p.responses.length}개]`);
    for (const r of p.responses) {
      lines.push(`  • [${r.status}] ${r.candidateName} (${formatDate(r.createdAt)})`);
      const indented = r.content.trim().split("\n").map((l) => `      ${l}`).join("\n");
      lines.push(indented);
      if (r.officialResponse) {
        lines.push(`      🏛️ 관공서 공식 답변:`);
        const off = r.officialResponse.trim().split("\n").map((l) => `        ${l}`).join("\n");
        lines.push(off);
      }
      if (r.pledgeId) lines.push(`      → 연결 공약 ID: ${r.pledgeId}`);
    }
    lines.push(``);
  } else {
    lines.push(`[후보자 답변] 없음`, ``);
  }

  // Linked pledges
  if (p.linkedPledges.length > 0) {
    lines.push(`[연결된 정식 공약]`);
    for (const pl of p.linkedPledges) {
      lines.push(`  • ${pl.title} (id: ${pl.id})`);
    }
  } else {
    lines.push(`[연결된 정식 공약] 없음`);
  }

  return lines.join("\n");
}

function humanStatus(s: string): string {
  switch (s) {
    case "pending":  return "검토 중";
    case "accepted": return "채택됨";
    case "hidden":   return "숨김 (게시판 비표시 / 카운트 포함)";
    case "deleted":  return "삭제됨";
    default:         return s;
  }
}

function humanAdminStatus(s: string | null): string | null {
  if (!s) return null;
  switch (s) {
    case "planned":              return "공약 제안 (관리자 표시)";
    case "complaint_received":   return "민원 접수";
    case "complaint_resolved":   return "민원 해결";
    case "complaint_failed":     return "민원 실패";
    case "adopted":              return "공약 반영 완료";
    case "rejected":             return "반영 불가";
    case "reported":             return "신고 접수";
    default:                     return s;
  }
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}
