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

    // Security configuration summary
    const securityConfig = {
      rateLimits: {
        globalPerMinute: 200,
        pledgesPerMinute: 60,
        candidatesPerMinute: 60,
        registrationsPerHour: 5,
        authPerMinute: 20,
        uploadsPerMinute: 10,
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
    // Only accept from internal calls (middleware or server actions)
    const adminSecret = request.headers.get("x-admin-secret");
    if (adminSecret !== process.env.ADMIN_SECRET) {
      // Also check admin session
      if (!(await isAdmin(request))) {
        return apiError("권한이 없습니다", 403);
      }
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
