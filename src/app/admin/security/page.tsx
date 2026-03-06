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

interface SecurityData {
  events: SecurityEvent[];
  stats: {
    totalEvents: number;
    byType: Record<string, number>;
    topIps: Array<{ ip: string; count: number }>;
  };
  config: {
    rateLimits: Record<string, number>;
    protections: Record<string, string | boolean>;
    blockedPatterns: {
      userAgents: string[];
      paths: string[];
    };
  };
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  rate_limit: "속도 제한",
  bot_blocked: "봇 차단",
  auth_failure: "인증 실패",
  auth_brute_force: "무차별 대입 공격",
  suspicious_path: "의심스러운 경로",
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

export default function SecurityPage() {
  const [data, setData] = useState<SecurityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">보안 리포트</h1>
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
          <p className="text-2xl font-bold text-red-600">{data.stats.byType["bot_blocked"] || 0}</p>
        </Card>
        <Card>
          <p className="text-xs text-muted mb-1">속도 제한</p>
          <p className="text-2xl font-bold text-yellow-600">{data.stats.byType["rate_limit"] || 0}</p>
        </Card>
        <Card>
          <p className="text-xs text-muted mb-1">의심 경로</p>
          <p className="text-2xl font-bold text-purple-600">{data.stats.byType["suspicious_path"] || 0}</p>
        </Card>
      </div>

      {/* Top Offending IPs */}
      {data.stats.topIps.length > 0 && (
        <Card>
          <h2 className="text-sm font-semibold text-foreground mb-3">
            상위 의심 IP
          </h2>
          <div className="space-y-1.5">
            {data.stats.topIps.map((item) => (
              <div key={item.ip} className="flex items-center justify-between text-sm">
                <code className="text-xs bg-background px-2 py-0.5 rounded font-mono">
                  {item.ip}
                </code>
                <span className="text-muted text-xs">{item.count}건</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Security Configuration */}
      <Card>
        <h2 className="text-sm font-semibold text-foreground mb-3">보안 설정</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-muted mb-2">속도 제한 (Rate Limits)</p>
            <div className="space-y-1">
              {Object.entries(data.config.rateLimits).map(([key, val]) => (
                <div key={key} className="flex justify-between text-xs">
                  <span className="text-foreground">{key}</span>
                  <span className="text-muted font-mono">{val}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-muted mb-2">보호 기능</p>
            <div className="space-y-1">
              {Object.entries(data.config.protections).map(([key, val]) => (
                <div key={key} className="flex justify-between text-xs gap-2">
                  <span className="text-foreground">{key}</span>
                  <span className={`font-mono shrink-0 ${val === true ? "text-green-600" : "text-muted"}`}>
                    {val === true ? "ON" : val === false ? "OFF" : String(val)}
                  </span>
                </div>
              ))}
            </div>
          </div>
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

      {/* Recent Events */}
      <Card>
        <h2 className="text-sm font-semibold text-foreground mb-3">
          최근 보안 이벤트 ({data.events.length})
        </h2>
        {data.events.length === 0 ? (
          <p className="text-sm text-muted text-center py-6">
            기록된 보안 이벤트가 없습니다. (정상적인 상태입니다)
          </p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {data.events.map((event) => (
              <div
                key={event.id}
                className="flex items-start gap-3 px-3 py-2.5 border border-border rounded-lg text-xs"
              >
                <span
                  className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    EVENT_TYPE_COLORS[event.type] || "bg-gray-100 text-gray-700"
                  }`}
                >
                  {EVENT_TYPE_LABELS[event.type] || event.type}
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

      {/* Security Recommendations */}
      <Card>
        <h2 className="text-sm font-semibold text-foreground mb-3">보안 권장 사항</h2>
        <div className="space-y-2">
          {[
            { status: true, text: "CSP (Content Security Policy) 활성화" },
            { status: true, text: "HSTS (HTTP Strict Transport Security) 활성화" },
            { status: true, text: "X-Frame-Options 헤더 (클릭재킹 방지)" },
            { status: true, text: "비밀번호 bcrypt 해싱 (cost: 12)" },
            { status: true, text: "JWT 세션 (30분 만료)" },
            { status: true, text: "입력값 Zod 스키마 검증" },
            { status: true, text: "API 속도 제한 (IP 기반)" },
            { status: true, text: "전역 속도 제한 (200 req/min)" },
            { status: true, text: "무차별 대입 차단 (10회 실패 → 15분 차단)" },
            { status: true, text: "봇/스캐너 User-Agent 차단" },
            { status: true, text: "의심 경로 차단 (wp-admin, .env 등)" },
            { status: true, text: "페이로드 크기 제한 (10 MB)" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className={`shrink-0 ${item.status ? "text-green-600" : "text-red-500"}`}>
                {item.status ? "✓" : "✗"}
              </span>
              <span className="text-foreground">{item.text}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
