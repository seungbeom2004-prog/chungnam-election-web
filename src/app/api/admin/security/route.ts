import { NextRequest } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { apiSuccess, apiError } from "@/lib/api-utils";

// Import security stats from middleware
// Note: In edge runtime the middleware runs in a separate context,
// so we maintain a parallel in-memory log here for the API.
// For persistent logging, we also query the SecurityLog table.
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";

export async function GET(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return apiError("관리자 권한이 필요합니다", 403);
    }

    // Query recent security events from DB (if table exists)
    let recentEvents: Array<{
      id: string;
      type: string;
      ip: string;
      path: string;
      userAgent: string | null;
      details: string | null;
      createdAt: string;
    }> = [];

    const { data: dbEvents } = await supabase
      .from("SecurityLog")
      .select("id, type, ip, path, userAgent, details, createdAt")
      .order("createdAt", { ascending: false })
      .limit(100);

    if (dbEvents) {
      recentEvents = dbEvents;
    }

    // Get event type counts
    const typeCounts: Record<string, number> = {};
    for (const e of recentEvents) {
      typeCounts[e.type] = (typeCounts[e.type] || 0) + 1;
    }

    // Get top IPs
    const ipCounts: Record<string, number> = {};
    for (const e of recentEvents) {
      ipCounts[e.ip] = (ipCounts[e.ip] || 0) + 1;
    }
    const topIps = Object.entries(ipCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([ip, count]) => ({ ip, count }));

    // Security configuration summary (mirrors middleware.ts PUBLIC_API_RATE_LIMITS)
    const securityConfig = {
      rateLimits: {
        "전체 (글로벌)": "200 req/min",
        "인증 (/api/auth)": "20 req/min",
        "업로드 (/api/upload)": "10 req/min",
        "회원가입 (/api/register)": "5 req/hour",
        "AI 엔드포인트 (/api/ai)": "8 req/min",
        "제안·민원 (/api/proposals)": "30 req/min",
        "공약 제안 (/api/pledge-proposals)": "30 req/min",
        "reCAPTCHA (/api/recaptcha)": "20 req/min",
        "페이지 추적 (/api/track)": "60 req/min",
        "공약 (/api/pledges)": "60 req/min",
        "후보 (/api/candidates)": "60 req/min",
        "NEC API (/api/nec)": "30 req/min",
      },
      protections: {
        csp: true,
        xFrameOptions: true,
        noSniff: true,
        hsts: true,
        botDetection: true,
        bruteForceProtection: true,
        payloadSizeLimit: "10 MB",
        suspiciousPathBlocking: true,
        inputValidation: "Zod schema validation",
        passwordHashing: "bcryptjs (cost: 12)",
        sessionStrategy: "JWT (30-min expiry)",
        captchaSecret: "env var (no hardcoded fallback)",
        aiEndpointAuth: "admin session required",
        necApiKey: "env var only (no hardcoded fallback)",
        backupPathTraversal: "regex whitelist",
        adminSecretFailClosed: true,
        slowlorisConnectionFlood: "40 req/5s → 5분 자동 차단 + Connection: close",
        slowlorisConnectionClose: "모든 429 응답에 Connection: close 헤더",
        slowlorisCustomServer: "server.ts — headersTimeout 10s / requestTimeout 30s / keepAlive 5s / maxConn 500",
      },
      blockedPatterns: {
        userAgents: [
          "sqlmap", "nikto", "nessus", "masscan", "zgrab",
          "dirbuster", "gobuster", "wfuzz", "hydra", "nmap",
          "wpscan", "scrapy",
        ],
        paths: [
          ".env", "wp-admin", "wp-login", "xmlrpc.php",
          ".git/", "phpmyadmin", "*.sql", "*.bak",
          "etc/passwd", "cgi-bin",
        ],
      },
      patches: [
        {
          date: "2026-04-20",
          severity: "critical",
          file: "api/captcha/route.ts",
          description: "하드코딩된 CAPTCHA fallback 시크릿 제거 — 프로덕션 fail-closed 처리",
        },
        {
          date: "2026-04-20",
          severity: "critical",
          file: "api/admin/nec-sync/route.ts",
          description: "소스코드에 노출된 NEC API 키 하드코딩 제거 — env var 전용으로 변경",
        },
        {
          date: "2026-04-20",
          severity: "critical",
          file: "api/admin/backup/route.ts",
          description: "백업 파일명 path traversal 방어 강화 — 정규식 whitelist 적용",
        },
        {
          date: "2026-04-20",
          severity: "critical",
          file: "api/admin/security/route.ts",
          description: "ADMIN_SECRET 미설정 시 x-admin-secret 헤더 인증 fail-closed 처리",
        },
        {
          date: "2026-04-20",
          severity: "high",
          file: "api/ai/summarize-issue/route.ts",
          description: "Gemini AI 호출 엔드포인트에 관리자 세션 인증 추가",
        },
        {
          date: "2026-04-20",
          severity: "high",
          file: "api/ai/suggest-new-issues/route.ts",
          description: "Gemini AI 호출 엔드포인트에 관리자 세션 인증 추가",
        },
        {
          date: "2026-04-20",
          severity: "high",
          file: "middleware.ts",
          description: "/api/ai (8/min), /api/proposals (30/min), /api/recaptcha (20/min), /api/track (60/min) rate limit 신규 추가",
        },
        {
          date: "2026-04-20",
          severity: "high",
          file: "middleware.ts",
          description: "Slowloris 방어: 5초 내 40회 초과 요청 IP → 5분 자동 차단 + Connection: close 헤더, 모든 429 응답에 Connection: close 추가",
        },
        {
          date: "2026-04-20",
          severity: "high",
          file: "server.ts",
          description: "커스텀 Node.js 서버 추가 (VPS/로컬용): headersTimeout 10s, requestTimeout 30s, keepAliveTimeout 5s, maxConnections 500",
        },
      ],
    };

    return apiSuccess({
      events: recentEvents,
      stats: {
        totalEvents: recentEvents.length,
        byType: typeCounts,
        topIps,
      },
      config: securityConfig,
    });
  } catch (error) {
    console.error("[GET /api/admin/security]", error);
    return apiError("보안 리포트를 불러올 수 없습니다", 500);
  }
}

/**
 * POST /api/admin/security
 * Log a security event to the database.
 * Called from middleware or server-side code.
 */
export async function POST(request: NextRequest) {
  try {
    // Only accept from internal calls (middleware or server actions).
    // x-admin-secret is only valid when ADMIN_SECRET env var is set AND matches.
    // If env var is unset we fail closed — never trust an empty/null secret.
    const adminSecret = request.headers.get("x-admin-secret");
    const envSecret = process.env.ADMIN_SECRET;
    const headerAuthOk = !!envSecret && adminSecret === envSecret;
    if (!headerAuthOk && !(await isAdmin(request))) {
      return apiError("권한이 없습니다", 403);
    }

    const body = await request.json();
    const { type, ip, path, userAgent, details } = body;

    if (!type || !ip || !path) {
      return apiError("type, ip, path는 필수입니다", 400);
    }

    const { error } = await supabase.from("SecurityLog").insert({
      type: String(type).slice(0, 50),
      ip: String(ip).slice(0, 45),
      path: String(path).slice(0, 500),
      userAgent: userAgent ? String(userAgent).slice(0, 500) : null,
      details: details ? String(details).slice(0, 1000) : null,
    });

    if (error) {
      console.error("[POST /api/admin/security]", error);
      return apiError("로그 저장에 실패했습니다", 500);
    }

    return apiSuccess({ logged: true });
  } catch (error) {
    console.error("[POST /api/admin/security]", error);
    return apiError("로그 저장에 실패했습니다", 500);
  }
}
