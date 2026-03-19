import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import {
  NavbarConditional,
  FooterConditional,
  MobileBottomNavConditional,
  MobileContentSpacer,
  MainContentWrapper,
} from "@/components/layout/NavbarConditional";
import AuthProvider from "@/components/layout/AuthProvider";
import DisclaimerModal from "@/components/layout/DisclaimerModal";
import PageTracker from "@/components/layout/PageTracker";
import { ThemeProvider } from "@/contexts/ThemeContext";

export const metadata: Metadata = {
  title: "개혁 충남 | 우리 동네 변화 플랫폼",
  description:
    "2026 충남 지방선거 개혁신당 후보자들의 공약을 지도에서 투명하게 확인하세요. 우리 동네에 어떤 변화가 올지 직접 살펴보고 공약을 제안하세요.",
  keywords: ["개혁신당", "충남", "공약", "지방선거", "2026", "충청남도", "후보자", "공약지도"],
  openGraph: {
    url: "https://www.reform-chungnam.kr",
    title: "개혁 충남 | 우리 동네 변화 플랫폼",
    description: "2026 충남 지방선거 후보자들의 공약을 지도에서 투명하게 확인하세요.",
    type: "website",
    locale: "ko_KR",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "개혁 충남 | 우리 동네 공약 지도",
      },
    ],
  },
  alternates: {
    canonical: "https://www.reform-chungnam.kr",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="antialiased">
        {/* Naver Maps SDK — loaded via next/script beforeInteractive so it's
            available in <head> BEFORE React hydration. No crossOrigin attribute
            (Naver CDN doesn't send CORS headers → crossOrigin="anonymous" causes
            Chrome incognito to block the script entirely). */}
        <Script
          src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID}`}
          strategy="beforeInteractive"
        />
        {/* Kakao SDK — loaded lazily, initialized in KakaoShareButton */}
        <Script
          src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js"
          integrity="sha384-TiCUE00h649CAMonG018J1YatRfAZjHFy9z7gQQb//LBYBFVnFqQMzFDToVRNvWm"
          crossOrigin="anonymous"
          strategy="lazyOnload"
        />
        <AuthProvider>
          <ThemeProvider>
            {/* Skip-to-main-content for keyboard / screen-reader users (WCAG 2.4.1) */}
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-lg focus:text-sm focus:font-semibold"
            >
              본문으로 건너뛰기
            </a>
            <DisclaimerModal />
            <PageTracker />
            {/* Desktop left rail (fixed) on non-map pages */}
            <NavbarConditional />
            {/* Main content area — offset by 80px on desktop for non-map pages */}
            <MainContentWrapper>
              <main id="main-content" tabIndex={-1}>
                {children}
              </main>
              <FooterConditional />
              <MobileContentSpacer />
            </MainContentWrapper>
            <MobileBottomNavConditional />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
