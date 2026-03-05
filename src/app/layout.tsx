import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import AuthProvider from "@/components/layout/AuthProvider";

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
        <AuthProvider>
          <Navbar />
          <main>{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
