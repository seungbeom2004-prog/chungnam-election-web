import KeywordAnalyticsClient from "./KeywordAnalyticsClient";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "키워드 데이터 분석 | 개혁 충남",
  description: "주민 제보·제안에서 가장 많이 언급된 키워드 트렌드",
  alternates: { canonical: "https://www.reform-chungnam.kr/proposals/keywords" },
};

export default function KeywordAnalyticsPage() {
  return <KeywordAnalyticsClient />;
}
