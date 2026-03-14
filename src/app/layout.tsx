import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import AuthProvider from "@/components/layout/AuthProvider";
import DisclaimerModal from "@/components/layout/DisclaimerModal";
import { ThemeProvider } from "@/contexts/ThemeContext";

export const metadata: Metadata = {
  title: "개혁 충남 | 우리 동네 공약 지도",
  description:
    "충남 후보자들의 공약을 지도에서 확인하세요. 우리 동네에 어떤 변화가 올지 직접 살펴보세요.",
  openGraph: {
    title: "개혁 충남 | 우리 동네 공약 지도",
    description: "충남 후보자들의 공약을 지도에서 확인하세요.",
    type: "website",
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
            <Navbar />
            <main id="main-content">{children}</main>
            <Footer />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
