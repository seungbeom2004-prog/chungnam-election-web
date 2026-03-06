import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// ── In-edge rate limiter ─────────────────────────────────────
const rateStore = new Map<string, { count: number; resetAt: number }>();

function edgeRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const rec = rateStore.get(key);
  if (rateStore.size > 5000) {
    for (const [k, v] of rateStore) {
      if (now > v.resetAt) rateStore.delete(k);
    }
  }
  if (!rec || now > rec.resetAt) {
    rateStore.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (rec.count >= max) return false;
  rec.count++;
  return true;
}

// ── IP-based brute-force tracking ────────────────────────────
// Track consecutive failed auth attempts per IP
const authFailures = new Map<string, { count: number; blockedUntil: number }>();

function checkAuthBan(ip: string): boolean {
  const rec = authFailures.get(ip);
  if (!rec) return false;
  if (Date.now() > rec.blockedUntil) {
    authFailures.delete(ip);
    return false;
  }
  return true; // IP is still banned
}

// ── Security event in-memory log (last 500 events) ──────────
interface SecurityEvent {
  type: string;
  ip: string;
  path: string;
  userAgent: string | null;
  details: string;
  timestamp: number;
}
const securityLog: SecurityEvent[] = [];
const MAX_LOG = 500;

function logSecurity(event: Omit<SecurityEvent, "timestamp">) {
  securityLog.push({ ...event, timestamp: Date.now() });
  if (securityLog.length > MAX_LOG) securityLog.shift();
}

// Export for the security report API
export function getSecurityLog(): SecurityEvent[] {
  return [...securityLog];
}

export function getSecurityStats() {
  const now = Date.now();
  const last24h = securityLog.filter((e) => now - e.timestamp < 86_400_000);
  const last1h = last24h.filter((e) => now - e.timestamp < 3_600_000);

  const byType: Record<string, number> = {};
  for (const e of last24h) {
    byType[e.type] = (byType[e.type] || 0) + 1;
  }

  const byIp: Record<string, number> = {};
  for (const e of last24h) {
    byIp[e.ip] = (byIp[e.ip] || 0) + 1;
  }

  // Top 10 offending IPs
  const topIps = Object.entries(byIp)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([ip, count]) => ({ ip, count }));

  return {
    total24h: last24h.length,
    total1h: last1h.length,
    byType,
    topIps,
    activeRateLimits: rateStore.size,
    bannedIps: authFailures.size,
  };
}

// ── Known bad bot / scanner patterns ─────────────────────────
const BAD_UA_PATTERNS = [
  /sqlmap/i,
  /nikto/i,
  /nessus/i,
  /masscan/i,
  /zgrab/i,
  /python-requests\/[01]\./i,
  /go-http-client\/1\./i,
  /curl\/[0-6]\./i,
  /dirbuster/i,
  /gobuster/i,
  /wfuzz/i,
  /hydra/i,
  /nmap/i,
  /wpscan/i,
  /joomla/i,
  /drupal/i,
  /wordpress/i,
  /wp-login/i,
  /\bbot\b.*scraper/i,
  /scrapy/i,
];

function isSuspiciousUserAgent(ua: string | null): boolean {
  if (!ua) return false;
  return BAD_UA_PATTERNS.some((p) => p.test(ua));
}

// ── Suspicious path patterns (common attack vectors) ─────────
const SUSPICIOUS_PATHS = [
  /\.env$/i,
  /wp-admin/i,
  /wp-login/i,
  /wp-content/i,
  /wp-includes/i,
  /xmlrpc\.php/i,
  /\.git\//i,
  /\.svn\//i,
  /\.htaccess/i,
  /phpmyadmin/i,
  /\.sql$/i,
  /\.bak$/i,
  /\.backup$/i,
  /etc\/passwd/i,
  /\/\.well-known\/.*\.(php|asp|jsp)/i,
  /\/(cgi-bin|admin|administrator|manager)/i,
];

function isSuspiciousPath(path: string): boolean {
  return SUSPICIOUS_PATHS.some((p) => p.test(path));
}

// ── Rate limits ──────────────────────────────────────────────
const PUBLIC_API_RATE_LIMITS: Record<string, { max: number; windowMs: number }> = {
  "/api/pledges":         { max: 60,  windowMs: 60_000 },
  "/api/candidates":      { max: 60,  windowMs: 60_000 },
  "/api/districts":       { max: 60,  windowMs: 60_000 },
  "/api/categories":      { max: 60,  windowMs: 60_000 },
  "/api/register":        { max: 5,   windowMs: 3_600_000 },
  "/api/auth":            { max: 20,  windowMs: 60_000 },
  "/api/upload":          { max: 10,  windowMs: 60_000 },
  "/api/nec":             { max: 30,  windowMs: 60_000 },
  "/api/map-settings":    { max: 60,  windowMs: 60_000 },
  "/api/health":          { max: 30,  windowMs: 60_000 },
};

// Global rate limit: max 200 requests per IP per minute across ALL endpoints
const GLOBAL_RATE_LIMIT = { max: 200, windowMs: 60_000 };

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const ua = request.headers.get("user-agent");

  // ── 1. Block suspicious paths (WordPress, .env, etc.) ──────
  if (isSuspiciousPath(pathname)) {
    logSecurity({
      type: "suspicious_path",
      ip,
      path: pathname,
      userAgent: ua,
      details: `Blocked suspicious path: ${pathname}`,
    });
    return new NextResponse("Not Found", { status: 404 });
  }

  // ── 2. Block known bad scanners ────────────────────────────
  if (isSuspiciousUserAgent(ua)) {
    logSecurity({
      type: "bot_blocked",
      ip,
      path: pathname,
      userAgent: ua,
      details: `Blocked bot UA: ${ua?.slice(0, 100)}`,
    });
    return new NextResponse("Forbidden", { status: 403 });
  }

  // ── 3. Check IP ban (brute-force protection) ───────────────
  if (checkAuthBan(ip)) {
    return new NextResponse("Too Many Requests", { status: 429 });
  }

  // ── 4. Block oversized request bodies ──────────────────────
  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > 10 * 1024 * 1024) {
    logSecurity({
      type: "payload_blocked",
      ip,
      path: pathname,
      userAgent: ua,
      details: `Oversized payload: ${contentLength} bytes`,
    });
    return new NextResponse("Payload Too Large", { status: 413 });
  }

  // ── 5. Global rate limit ───────────────────────────────────
  if (!edgeRateLimit(`global:${ip}`, GLOBAL_RATE_LIMIT.max, GLOBAL_RATE_LIMIT.windowMs)) {
    logSecurity({
      type: "rate_limit",
      ip,
      path: pathname,
      userAgent: ua,
      details: `Global rate limit exceeded (${GLOBAL_RATE_LIMIT.max}/min)`,
    });
    return new NextResponse("Too Many Requests", {
      status: 429,
      headers: { "Retry-After": "60" },
    });
  }

  // ── 6. Per-endpoint rate limiting ──────────────────────────
  for (const [prefix, limit] of Object.entries(PUBLIC_API_RATE_LIMITS)) {
    if (pathname.startsWith(prefix)) {
      const key = `rl:${prefix}:${ip}`;
      if (!edgeRateLimit(key, limit.max, limit.windowMs)) {
        logSecurity({
          type: "rate_limit",
          ip,
          path: pathname,
          userAgent: ua,
          details: `Rate limit on ${prefix}: ${limit.max}/${limit.windowMs / 1000}s`,
        });
        return new NextResponse("Too Many Requests", {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(limit.windowMs / 1000)),
            "X-RateLimit-Limit": String(limit.max),
          },
        });
      }
      break;
    }
  }

  // ── 7. Track auth failures (brute-force detection) ─────────
  // If this is an auth request and it's a POST, we track it
  if (pathname.startsWith("/api/auth") && request.method === "POST") {
    // After 10 failed auth attempts in a row, ban the IP for 15 minutes
    const failKey = `authfail:${ip}`;
    if (!edgeRateLimit(failKey, 10, 900_000)) {
      authFailures.set(ip, { count: 10, blockedUntil: Date.now() + 900_000 });
      logSecurity({
        type: "auth_brute_force",
        ip,
        path: pathname,
        userAgent: ua,
        details: "IP banned for 15 min after 10 failed auth attempts",
      });
      return new NextResponse("Too Many Requests", { status: 429 });
    }
  }

  // ── 8. Auth-protected routes ───────────────────────────────
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (pathname.startsWith("/admin")) {
    if (!token) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", request.url);
      return NextResponse.redirect(loginUrl);
    }
    if (token.role !== "admin") {
      logSecurity({
        type: "unauthorized_access",
        ip,
        path: pathname,
        userAgent: ua,
        details: `Non-admin tried to access admin route`,
      });
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/dashboard")) {
    if (!token) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", request.url);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // ── 9. Add security headers to responses ───────────────────
  const response = NextResponse.next();
  // Prevent clickjacking on API responses
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/api/:path*",
    // Also match suspicious paths that scanners probe
    "/.env",
    "/wp-admin/:path*",
    "/wp-login.php",
    "/xmlrpc.php",
    "/.git/:path*",
  ],
};
