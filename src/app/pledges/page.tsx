import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "공약 목록 | 개혁 충남",
  description: "충남 지역 개혁신당 후보자들의 공약을 확인하세요.",
};

interface Category {
  id: string;
  name: string;
  emoji: string | null;
  color: string;
  iconImage: string | null;
}

interface CandidateInfo {
  id: string;
  name: string;
  district: string;
  profileImage: string | null;
}

interface PledgeRow {
  id: string;
  title: string;
  description: string;
  budget: string | null;
  address: string | null;
  youtubeUrl: string | null;
  pledgeType: "map" | "bylaws";
  createdAt: string;
  candidateId: string;
  category: Category | null;
  candidate: CandidateInfo | null;
}

interface GroupedCandidate {
  candidate: CandidateInfo;
  pledges: PledgeRow[];
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + "…" : text;
}

export default async function PledgesPage() {
  // Fetch eligible candidate IDs
  const { data: eligible } = await supabase
    .from("Candidate")
    .select("id, name, district, profileImage")
    .eq("verified", true)
    .eq("role", "candidate")
    .eq("caucusStatus", "공천 확정")
    .in("candidateStatus", ["예비후보자", "후보자"])
    .order("createdAt", { ascending: true });

  const eligibleCandidates = eligible ?? [];
  const eligibleIds = eligibleCandidates.map((c: CandidateInfo) => c.id);

  // Fetch all visible pledges for eligible candidates
  const { data: pledgesRaw } = eligibleIds.length > 0
    ? await supabase
        .from("Pledge")
        .select(
          "id, title, description, budget, address, youtubeUrl, pledgeType, createdAt, candidateId, category:Category!categoryId(id, name, emoji, color, iconImage)"
        )
        .in("candidateId", eligibleIds)
        .eq("visible", true)
        .order("createdAt", { ascending: false })
        .limit(500)
    : { data: [] };

  const pledges = (pledgesRaw ?? []) as PledgeRow[];

  // Build a lookup map for candidate info
  const candidateMap: Record<string, CandidateInfo> = {};
  eligibleCandidates.forEach((c: CandidateInfo) => {
    candidateMap[c.id] = c;
  });

  // Group pledges by candidate, preserving candidate order
  const grouped: GroupedCandidate[] = [];
  const seen = new Set<string>();

  // Preserve candidate signup order
  for (const c of eligibleCandidates) {
    const candidatePledges = pledges.filter((p) => p.candidateId === c.id);
    if (candidatePledges.length > 0 && !seen.has(c.id)) {
      seen.add(c.id);
      grouped.push({ candidate: c, pledges: candidatePledges });
    }
  }

  const totalPledges = pledges.length;
  const totalCandidates = grouped.length;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-screen-lg mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-1">공약 목록</h1>
          <p className="text-sm text-muted">
            공천 확정 후보자{" "}
            <span className="font-semibold text-foreground">{totalCandidates}명</span>의 공약{" "}
            <span className="font-semibold text-foreground">{totalPledges}건</span>을 확인할 수 있습니다.
          </p>
        </div>

        {grouped.length === 0 ? (
          <div className="text-center py-16 text-muted">
            <p className="text-sm">등록된 공약이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-10">
            {grouped.map(({ candidate, pledges: cPledges }) => (
              <section key={candidate.id}>
                {/* Candidate header */}
                <Link
                  href={`/candidates/${candidate.id}`}
                  className="flex items-center gap-3 mb-4 group"
                >
                  <div className="w-10 h-10 rounded-full bg-primary-light overflow-hidden shrink-0 flex items-center justify-center">
                    {candidate.profileImage ? (
                      <Image
                        src={candidate.profileImage}
                        alt={candidate.name}
                        width={40}
                        height={40}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-primary font-bold text-base">
                        {candidate.name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {candidate.name}
                      </span>
                      <span className="text-xs text-muted bg-background px-2 py-0.5 rounded-full border border-border">
                        {candidate.district}
                      </span>
                    </div>
                    <p className="text-xs text-muted mt-0.5">
                      공약 {cPledges.length}건
                    </p>
                  </div>
                  <svg
                    className="ml-auto w-4 h-4 text-muted group-hover:text-primary transition-colors shrink-0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>

                {/* Pledge cards grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {cPledges.map((pledge) => (
                    <Link
                      key={pledge.id}
                      href={`/candidates/${candidate.id}`}
                      className="flex flex-col gap-2 p-4 bg-surface border border-border rounded-xl hover:border-primary/30 hover:bg-primary/5 transition-colors"
                    >
                      {/* Top row: category + type badge + youtube indicator */}
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        {pledge.category ? (
                          <span
                            className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: pledge.category.color + "20",
                              color: pledge.category.color,
                            }}
                          >
                            {pledge.category.emoji && (
                              <span>{pledge.category.emoji}</span>
                            )}
                            {pledge.category.name}
                          </span>
                        ) : null}

                        <span
                          className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                            pledge.pledgeType === "bylaws"
                              ? "border-blue-200 text-blue-600 bg-blue-50"
                              : "border-green-200 text-green-600 bg-green-50"
                          }`}
                        >
                          {pledge.pledgeType === "bylaws" ? "조례" : "지역 공약"}
                        </span>

                        {pledge.youtubeUrl && (
                          <span
                            className="ml-auto shrink-0 flex items-center gap-1 text-xs text-red-500"
                            title="YouTube 영상 있음"
                          >
                            <svg
                              className="w-3.5 h-3.5"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                            </svg>
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="font-semibold text-foreground text-sm leading-snug line-clamp-2 break-keep">
                        {pledge.title}
                      </h3>

                      {/* Description */}
                      <p className="text-xs text-muted line-clamp-3 leading-relaxed flex-1">
                        {truncate(pledge.description, 120)}
                      </p>

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-1 border-t border-border/50">
                        {pledge.budget ? (
                          <span className="text-xs font-medium text-primary">
                            {pledge.budget}
                          </span>
                        ) : pledge.address ? (
                          <span className="text-xs text-muted truncate max-w-[70%]">
                            {pledge.address}
                          </span>
                        ) : (
                          <span />
                        )}
                        <time className="text-xs text-muted shrink-0">
                          {new Date(pledge.createdAt).toLocaleDateString("ko-KR")}
                        </time>
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Link to full profile */}
                <div className="mt-3 text-right">
                  <Link
                    href={`/candidates/${candidate.id}`}
                    className="text-xs text-primary hover:underline"
                  >
                    {candidate.name} 후보자 전체 공약 보기 →
                  </Link>
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
