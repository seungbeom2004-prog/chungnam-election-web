import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import ProposalBoardClient from "./ProposalBoardClient";

export const metadata: Metadata = {
  title: "공약 제안 게시판 | 개혁 충남",
  description: "후보자에게 공약을 제안하세요.",
};

export default async function ProposalsPage() {
  // Fetch all verified candidates directly from DB (avoids HTTP round-trip issues in production)
  const { data: candidatesRaw } = await supabase
    .from("Candidate")
    .select("id, name, district")
    .eq("verified", true)
    .eq("role", "candidate")
    .order("name", { ascending: true })
    .limit(500);

  const candidates = (candidatesRaw ?? []) as { id: string; name: string; district: string }[];

  // Deduplicate district names from candidates
  const districtSet = new Set<string>();
  candidates.forEach((c) => { if (c.district) districtSet.add(c.district); });
  const districts = Array.from(districtSet).sort().map((name) => ({ name }));

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-screen-md mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">공약 제안 게시판</h1>
          <p className="text-sm text-muted leading-relaxed">
            후보자에게 직접 공약을 제안하고 의견을 나눠보세요. 좋은 제안은 후보자가 채택할 수 있습니다.
          </p>
        </div>

        <ProposalBoardClient candidates={candidates} districts={districts} />
      </div>
    </div>
  );
}
