import type { Metadata } from "next";
import ProposalBoardClient from "./ProposalBoardClient";

export const metadata: Metadata = {
  title: "공약 제안 게시판 | 개혁 충남",
  description: "후보자에게 공약을 제안하세요.",
};

async function fetchCandidates() {
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const res = await fetch(`${base}/api/candidates?limit=100`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data ?? []) as { id: string; name: string; district: string }[];
  } catch {
    return [];
  }
}

async function fetchDistricts() {
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const res = await fetch(`${base}/api/districts`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data ?? []) as { name: string }[];
  } catch {
    return [];
  }
}

export default async function ProposalsPage() {
  const [candidates, districts] = await Promise.all([
    fetchCandidates(),
    fetchDistricts(),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-screen-md mx-auto px-4 py-8">
        {/* Header */}
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
