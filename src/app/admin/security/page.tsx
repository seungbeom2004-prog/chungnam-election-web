"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui";
import Card from "@/components/ui/Card";

interface SecurityEvent {
  id: string;
  type: string;
  ip: string;
  path: string;
  userAgent: string | null;
  details: string | null;
  createdAt: string;
}

interface PatchRecord {
  date: string;
  severity: "critical" | "high" | "medium" | "low";
  file: string;
  description: string;
}

interface SecurityData {
  events: SecurityEvent[];
  stats: {
    totalEvents: number;
    byType: Record<string, number>;
    topIps: Array<{ ip: string; count: number }>;
  };
  config: {
    rateLimits: Record<string, string>;
    protections: Record<string, string | boolean>;
    blockedPatterns: {
      userAgents: string[];
      paths: string[];
    };
    patches: PatchRecord[];
  };
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  rate_limit: "속도 제한",
  bot_blocked: "봇 차단",
  auth_failure: "인증 실패",
  auth_brute_force: "무차별 대입 공격",
  suspicious_path: "의심 경로",
  payload_blocked: "페이로드 차단",
  unauthorized_access: "미승인 접근",
  suspicious: "의심 활동",
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  rate_limit: "bg-yellow-100 text-yellow-800",
  bot_blocked: "bg-red-100 text-red-800",
  auth_failure: "bg-orange-100 text-orange-800",
  auth_brute_force: "bg-red-200 text-red-900",
  suspicious_path: "bg-purple-100 text-purple-800",
  payload_blocked: "bg-pink-100 text-pink-800",
  unauthorized_access: "bg-orange-100 text-orange-800",
  suspicious: "bg-gray-100 text-gray-800",
};

const SEVERITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  critical: { bg: "bg-red-100",    text: "text-red-800",    label: "🔴 Critical" },
  high:     { bg: "bg-orange-100", text: "text-orange-800", label: "🟠 High" },
  medium:   { bg: "bg-yellow-100", text: "text-yellow-800", label: "🟡 Medium" },
  low:      { bg: "bg-blue-100",   text: "text-blue-800",   label: "🔵 Low" },
};

const PROTECTION_LABELS: Record<string, string> = {
  csp: "CSP (Content Security Policy)",
  xFrameOptions: "X-Frame-Options (클릭재킹 방지)",
  noSniff: "X-Content-Type-Options: nosniff",
  hsts: "HSTS (Strict Transport Security)",
  botDetection: "봇/스캐너 User-Agent 차단",
  bruteForceProtection: "무차별 대입 차단 (10회 → 15분 차단)",
  payloadSizeLimit: "요청 크기 제한",
  suspiciousPathBlocking: "의심 경로 차단 (.env, wp-admin 등)",
  inputValidation: "입력값 검증",
  passwordHashing: "비밀번호 해싱",
  sessionStrategy: "세션 전략",
  captchaSecret: "CAPTCHA 시크릿",
  aiEndpointAuth: "AI 엔드포인트 인증",
  necApiKey: "NEC API 키 보관",
  backupPathTraversal: "백업 파일명 검증",
  adminSecretFailClosed: "관리자 시크릿 fail-closed",
};

// Checklist items that are always shown regardless of API data
const STATIC_CHECKLIST = [
  { done: true,  text: "CSP (Content Security Policy) 활성화" },
  { done: true,  text: "HSTS (HTTP Strict Transport Security)" },
  { done: true,  text: "X-Frame-Options 헤더 (클릭재킹 방지)" },
  { done: true,  text: "bcrypt 비밀번호 해싱 (cost: 12)" },
  { done: true,  text: "JWT 세션 토큰 (30분 만료)" },
  { done: true,  text: "Zod 입력값 스키마 검증" },
  { done: true,  text: "전역 rate limit — 200 req/min/IP" },
  { done: true,  text: "AI 엔드포인트 — 8 req/min + admin 전용" },
  { done: true,  text: "무차별 대입 차단 (10회 실패 → 15분 ban)" },
  { done: true,  text: "봇/스캐너 User-Agent 자동 차단" },
  { done: true,  text: "의심 경로 차단 (wp-admin, .env 등)" },
  { done: true,  text: "10 MB 초과 요청 차단" },
  { done: true,  text: "CAPTCHA 시크릿 env var 전용 (하드코딩 제거)" },
  { done: true,  text: "NEC API 키 env var 전용 (소스코드 노출 제거)" },
  { done: true,  text: "백업 파일명 정규식 whitelist (path traversal 차단)" },
  { done: true,  text: "관리자 시크릿 미설정 시 fail-closed 처리" },
  { done: false, text: "macOS 방화벽 활성화 (스텔스 모드 권장)" },
  { done: false, text: "NEC API 키 재발급 (기존 키 소스 노출 이력)" },
];

export default function SecurityPage() {
  const [data, setData] = useState<SecurityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"events" | "config" | "patches">("events");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/security");
      const json = await res.json();
      if (json.data) setData(json.data);
      else setError("보안 데이터를 불러올 수 없습니다");
    } catch {
      setError("보안 데이터를 불러올 수 없습니다");
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-red-500">{error}</p>
        <Button size="sm" className="mt-4" onClick={fetchData}>다시 시도</Button>
      </div>
    );
  }

  if (!data) return null;

  const patches = data.config.patches ?? [];
  const criticalCount = patches.filter(p => p.severity === "critical").length;
  const highCount     = patches.filter(p => p.severity === "high").length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">보안 리포트</h1>
          <p className="text-xs text-muted mt-0.5">마지막 패치: 2026-04-20 · Critical {criticalCount}건, High {highCount}건 조치 완료</p>
        </div>
        <Button size="sm" onClick={fetchData}>새로고침</Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <p className="text-xs text-muted mb-1">총 보안 이벤트</p>
          <p className="text-2xl font-bold text-foreground">{data.stats.totalEvents}</p>
        </Card>
        <Card>
          <p className="text-xs text-muted mb-1">봇 차단</p>
          <p className="text-2xl font-bold text-red-600">{data.stats.byType["bot_blocked"] ?? 0}</p>
        </Card>
        <Card>
          <p className="text-xs text-muted mb-1">속도 제한</p>
          <p className="text-2xl font-bold text-yellow-600">{data.stats.byType["rate_limit"] ?? 0}</p>
        </Card>
        <Card>
          <p className="text-xs text-muted mb-1">의심 경로</p>
          <p className="text-2xl font-bold text-purple-600">{data.stats.byType["suspicious_path"] ?? 0}</p>
        </Card>
      </div>

      {/* macOS Firewall Alert */}
      <div className="flex gap-3 px-4 py-3 bg-orange-50 border border-orange-200 rounded-xl text-xs">
        <span className="text-lg shrink-0">⚠️</span>
        <div className="space-y-1">
          <p className="font-semibold text-orange-800">macOS 방화벽 비활성화 상태</p>
          <p className="text-orange-700">
            서버 머신의 OS 방화벽이 꺼져 있습니다. 포트 3389(RDP/UDP) 등 불필요한 포트가 외부에 노출될 수 있습니다.
          </p>
          <p className="text-orange-700 font-mono mt-1">
            터미널에서 실행 →{" "}
            <code className="bg-orange-100 px-1 rounded">
              sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate on --setstealthmode on
            </code>
          </p>
          <p className="text-orange-600 mt-1">
            또는 <strong>시스템 설정 → 네트워크 → 방화벽</strong>에서 활성화
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(["events", "config", "patches"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {tab === "events"  && `이벤트 로그 (${data.events.length})`}
            {tab === "config"  && "보안 설정"}
            {tab === "patches" && `패치 내역 (${patches.length})`}
          </button>
        ))}
      </div>

      {/* ── Tab: Events ── */}
      {activeTab === "events" && (
        <div className="space-y-4">
          {/* Top IPs */}
          {data.stats.topIps.length > 0 && (
            <Card>
              <h2 className="text-sm font-semibold text-foreground mb-3">상위 의심 IP</h2>
              <div className="space-y-1.5">
                {data.stats.topIps.map((item) => (
                  <div key={item.ip} className="flex items-center justify-between text-sm">
                    <code className="text-xs bg-background px-2 py-0.5 rounded font-mono">{item.ip}</code>
                    <span className="text-muted text-xs">{item.count}건</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Event list */}
          <Card>
            <h2 className="text-sm font-semibold text-foreground mb-3">
              최근 보안 이벤트
            </h2>
            {data.events.length === 0 ? (
              <p className="text-sm text-muted text-center py-6">
                기록된 보안 이벤트가 없습니다. (정상적인 상태입니다)
              </p>
            ) : (
              <div className="space-y-2 max-h-[480px] overflow-y-auto">
                {data.events.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 px-3 py-2.5 border border-border rounded-lg text-xs"
                  >
                    <span
                      className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        EVENT_TYPE_COLORS[event.type] ?? "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {EVENT_TYPE_LABELS[event.type] ?? event.type}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <code className="text-muted font-mono">{event.ip}</code>
                        <span className="text-muted truncate">{event.path}</span>
                      </div>
                      {event.details && (
                        <p className="text-muted mt-0.5 truncate">{event.details}</p>
                      )}
                    </div>
                    <span className="text-muted shrink-0">
                      {new Date(event.createdAt).toLocaleString("ko-KR", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── Tab: Config ── */}
      {activeTab === "config" && (
        <div className="space-y-4">

          {/* Checklist */}
          <Card>
            <h2 className="text-sm font-semibold text-foreground mb-3">보안 체크리스트</h2>
            <div className="space-y-2">
              {STATIC_CHECKLIST.map((item, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <span className={`shrink-0 mt-0.5 font-bold ${item.done ? "text-green-600" : "text-red-500"}`}>
                    {item.done ? "✓" : "✗"}
                  </span>
                  <span className={item.done ? "text-foreground" : "text-red-700 font-medium"}>{item.text}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Rate Limits */}
          <Card>
            <h2 className="text-sm font-semibold text-foreground mb-3">Rate Limit 설정 (IP 기반)</h2>
            <div className="divide-y divide-border">
              {Object.entries(data.config.rateLimits).map(([key, val]) => (
                <div key={key} className="flex items-center justify-between py-1.5 text-xs">
                  <span className="text-foreground">{key}</span>
                  <span className="font-mono text-primary bg-primary/5 px-2 py-0.5 rounded">{val}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Protections */}
          <Card>
            <h2 className="text-sm font-semibold text-foreground mb-3">보호 기능</h2>
            <div className="divide-y divide-border">
              {Object.entries(data.config.protections).map(([key, val]) => (
                <div key={key} className="flex items-center justify-between py-1.5 text-xs gap-3">
                  <span className="text-foreground">{PROTECTION_LABELS[key] ?? key}</span>
                  <span className={`font-mono shrink-0 ${
                    val === true  ? "text-green-600" :
                    val === false ? "text-red-500" :
                    "text-muted"
                  }`}>
                    {val === true ? "ON" : val === false ? "OFF" : String(val)}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Blocked Patterns */}
          <Card>
            <h2 className="text-sm font-semibold text-foreground mb-3">차단 패턴</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-muted mb-2">차단 User-Agent</p>
                <div className="flex flex-wrap gap-1">
                  {data.config.blockedPatterns.userAgents.map((ua) => (
                    <span key={ua} className="px-2 py-0.5 bg-red-50 text-red-700 text-[10px] rounded-full font-mono">
                      {ua}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted mb-2">차단 경로</p>
                <div className="flex flex-wrap gap-1">
                  {data.config.blockedPatterns.paths.map((p) => (
                    <span key={p} className="px-2 py-0.5 bg-purple-50 text-purple-700 text-[10px] rounded-full font-mono">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── Tab: Patches ── */}
      {activeTab === "patches" && (
        <div className="space-y-4">
          {/* Summary counts */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(["critical", "high", "medium", "low"] as const).map((sev) => {
              const count = patches.filter(p => p.severity === sev).length;
              const s = SEVERITY_STYLES[sev];
              return (
                <Card key={sev}>
                  <p className="text-xs text-muted mb-1">{s.label} 패치</p>
                  <p className={`text-2xl font-bold ${s.text}`}>{count}</p>
                </Card>
              );
            })}
          </div>

          {/* Patch list */}
          <Card>
            <h2 className="text-sm font-semibold text-foreground mb-3">패치 적용 내역</h2>
            <div className="space-y-3">
              {patches.map((patch, i) => {
                const s = SEVERITY_STYLES[patch.severity] ?? SEVERITY_STYLES.low;
                return (
                  <div
                    key={i}
                    className="flex items-start gap-3 px-3 py-3 border border-border rounded-xl text-xs"
                  >
                    <span className={`shrink-0 mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${s.bg} ${s.text}`}>
                      {s.label}
                    </span>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <p className="text-foreground font-medium leading-snug">{patch.description}</p>
                      <code className="text-muted font-mono text-[10px]">{patch.file}</code>
                    </div>
                    <span className="text-muted shrink-0 font-mono text-[10px]">{patch.date}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Remaining actions */}
          <Card>
            <h2 className="text-sm font-semibold text-foreground mb-1">미조치 항목</h2>
            <p className="text-xs text-muted mb-3">코드 외 시스템/환경변수 레벨에서 직접 처리가 필요합니다</p>
            <div className="space-y-3">
              <div className="flex gap-3 px-3 py-3 bg-red-50 border border-red-200 rounded-xl text-xs">
                <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 text-orange-800 h-fit">🟠 High</span>
                <div className="space-y-1">
                  <p className="font-semibold text-red-800">NEC API 키 재발급 필요</p>
                  <p className="text-red-700">소스코드에 노출된 이력이 있으므로 기존 키는 폐기하고 공공데이터포털(data.go.kr)에서 재발급 후 <code className="bg-red-100 px-1 rounded">NEC_API_KEY</code> 환경변수를 교체하세요.</p>
                </div>
              </div>
              <div className="flex gap-3 px-3 py-3 bg-orange-50 border border-orange-200 rounded-xl text-xs">
                <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 text-orange-800 h-fit">🟠 High</span>
                <div className="space-y-1">
                  <p className="font-semibold text-orange-800">macOS 방화벽 활성화 (포트 3389 UDP 노출 차단)</p>
                  <p className="text-orange-700">터미널에서 직접 실행하세요:</p>
                  <code className="block bg-gray-800 text-green-300 px-3 py-2 rounded-lg font-mono text-[10px] mt-1 leading-relaxed whitespace-pre">{`sudo /usr/libexec/ApplicationFirewall/socketfilterfw \\
  --setglobalstate on --setstealthmode on`}</code>
                  <p className="text-orange-600 mt-1">또는 <strong>시스템 설정 → 네트워크 → 방화벽 → 켬 + 스텔스 모드 활성화</strong></p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
