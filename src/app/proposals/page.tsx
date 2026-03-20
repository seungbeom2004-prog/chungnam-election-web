import type { Metadata } from "next";
import { Suspense } from "react";
import { supabase } from "@/lib/supabase";
import ProposalBoardClient from "./ProposalBoardClient";

const BASE_URL = "https://www.reform-chungnam.kr";

export const metadata: Metadata = {
  title: "불편 제보 & 공약 제안 | 개혁 충남",
  description: "우리 동네 불편을 제보하거나 후보자에게 공약을 제안하세요.",
  alternates: { canonical: `${BASE_URL}/proposals` },
  openGraph: {
    url: `${BASE_URL}/proposals`,
    title: "불편 제보 & 공약 제안 | 개혁 충남",
    description: "우리 동네 불편을 제보하거나 후보자에게 공약을 제안하세요.",
    type: "website",
    locale: "ko_KR",
    images: [{ url: `${BASE_URL}/og-image.png`, width: 1200, height: 630, alt: "개혁 충남 제보/제안" }],
  },
};

export default async function ProposalsPage() {
  // Fetch all verified candidates directly from DB (avoids HTTP round-trip issues in production)
  const { data: candidatesRaw } = await supabase
    .from("Candidate")
    .select("id, name, district")
    .eq("verified", true)
    .eq("role", "candidate")
    // 공천 확정 + 예비후보자/후보자 상태인 경우만 공개 노출
    .eq("caucusStatus", "공천 확정")
    .in("candidateStatus", ["예비후보자", "후보자"])
    .order("name", { ascending: true })
    .limit(500);

  const candidates = (candidatesRaw ?? []) as { id: string; name: string; district: string }[];

  // Deduplicate district names from candidates
  const districtSet = new Set<string>();
  candidates.forEach((c) => { if (c.district) districtSet.add(c.district); });
  const districts = Array.from(districtSet).sort().map((name) => ({ name }));

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-screen-xl mx-auto px-4 py-8">
        <Suspense fallback={<div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
          <ProposalBoardClient candidates={candidates} districts={districts} />
        </Suspense>
      </div>
    </div>
  );
}
