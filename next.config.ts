import type { NextConfig } from "next";

const SECURITY_HEADERS = [
  // Prevents click-jacking
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Prevents MIME-type sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Relaxed referrer — Naver Maps validates domain by referrer;
  // strict-origin-when-cross-origin breaks Chrome incognito
  { key: "Referrer-Policy", value: "no-referrer-when-downgrade" },
  // Disable browser features not used by this app
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  // Force HTTPS for 2 years
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Content-Security-Policy: allow self + Naver Maps + Supabase
  // 'unsafe-eval' is REQUIRED — the Naver Maps SDK uses eval() / new Function() internally.
  // Naver Maps loads sub-resources from many domains (pstatic.net, naver.com, naver.net,
  // navercorp.com) — we use broad wildcards to avoid breakage in Chrome incognito.
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://oapi.map.naver.com https://*.naver.com https://*.naver.net https://*.pstatic.net https://*.navercorp.com",
      "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://*.pstatic.net",
      "font-src 'self' https://cdn.jsdelivr.net https://*.pstatic.net",
      "img-src 'self' data: blob: https: http:",
      "connect-src 'self' https://*.supabase.co https://*.naver.com https://*.naver.net https://*.pstatic.net https://*.navercorp.com http://*.naver.net",
      "worker-src 'self' blob:",
      "frame-src 'none'",
    ].join("; "),
  },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  // supercluster is CJS-only; tell Next.js to transpile it for client bundles
  transpilePackages: ["supercluster"],

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
    unoptimized: false,
  },

  // Attach security headers to every response
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: SECURITY_HEADERS,
      },
    ];
  },

  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
