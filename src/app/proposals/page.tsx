import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import ProposalBoardClient from "./ProposalBoardClient";

export const metadata: Metadata = {
  title: "불편 제보 & 공약 제안 | 개혁 충남",
  description: "우리 동네 불편을 제보하거나 후보자에게 공약을 제안하세요.",
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
      <div className="max-w-screen-xl mx-auto px-4 py-8">
        <ProposalBoardClient candidates={candidates} districts={districts} />
      </div>
    </div>
  );
}
