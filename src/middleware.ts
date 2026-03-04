import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// ── In-edge rate limiter ─────────────────────────────────────
// Simple in-memory counter; resets on cold-starts (acceptable for edge burst protection).
const rateStore = new Map<string, { count: number; resetAt: number }>();

function edgeRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const rec = rateStore.get(key);
  if (rateStore.size > 2000) {
    // Prune expired entries to prevent unbounded growth
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

// Known bad bot / scanner user-agent patterns
const BAD_UA_PATTERNS = [
  /sqlmap/i,
  /nikto/i,
  /nessus/i,
  /masscan/i,
  /zgrab/i,
  /python-requests\/[01]\./i, // very old Python scrapers
  /go-http-client\/1\./i,
  /curl\/[0-6]\./i,
];

function isSuspiciousUserAgent(ua: string | null): boolean {
  if (!ua) return false;
  return BAD_UA_PATTERNS.some((p) => p.test(ua));
}

// API routes that are open to the public (no auth required, but rate-limited)
const PUBLIC_API_RATE_LIMITS: Record<string, { max: number; windowMs: number }> = {
  "/api/pledges":         { max: 60,  windowMs: 60_000 },   // 60 req / min
  "/api/candidates":      { max: 60,  windowMs: 60_000 },
  "/api/districts":       { max: 60,  windowMs: 60_000 },
  "/api/categories":      { max: 60,  windowMs: 60_000 },
  "/api/register":        { max: 5,   windowMs: 3_600_000 }, // 5 reg / hour
  "/api/auth":            { max: 20,  windowMs: 60_000 },   // 20 auth / min
  "/api/upload":          { max: 10,  windowMs: 60_000 },   // 10 uploads / min
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const ua = request.headers.get("user-agent");

  // ── 1. Block known bad scanners ───────────────────────────
  if (isSuspiciousUserAgent(ua)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // ── 2. Block oversized request bodies on mutation endpoints ──
  const contentLength = request.headers.get("content-length");
  if (
    contentLength &&
    parseInt(contentLength, 10) > 10 * 1024 * 1024 // 10 MB
  ) {
    return new NextResponse("Payload Too Large", { status: 413 });
  }

  // ── 3. API rate limiting ───────────────────────────────────
  for (const [prefix, limit] of Object.entries(PUBLIC_API_RATE_LIMITS)) {
    if (pathname.startsWith(prefix)) {
      const key = `rl:${prefix}:${ip}`;
      if (!edgeRateLimit(key, limit.max, limit.windowMs)) {
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

  // ── 4. Auth-protected routes ──────────────────────────────
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

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Auth-gated pages
    "/dashboard/:path*",
    "/admin/:path*",
    // All API routes (for rate limiting & bot blocking)
    "/api/:path*",
  ],
};
