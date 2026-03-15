"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import ProposalList from "@/components/proposals/ProposalList";
import { useTheme } from "@/contexts/ThemeContext";

const ProposalRanking = dynamic(() => import("@/components/proposals/ProposalRanking"), { ssr: false });

interface CandidateOption {
  id: string;
  name: string;
  district: string;
}

interface DistrictOption {
  name: string;
}

interface Props {
  candidates: CandidateOption[];
  districts: DistrictOption[];
}

export default function ProposalBoardClient({ candidates, districts }: Props) {
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>("");
  const [rankingRefreshKey, setRankingRefreshKey] = useState(0);
  const { isCute } = useTheme();

  const filteredCandidates = selectedCity
    ? candidates.filter((c) => c.district === selectedCity || c.district.startsWith(selectedCity))
    : candidates;

  const hasFilter = !!(selectedCity || selectedCandidateId);

  return (
    <div>
      {/* Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          {isCute && <span className="mr-2">🌼</span>}공약 제안 게시판
        </h1>
        <p className="text-sm text-muted leading-relaxed">
          후보자에게 직접 공약을 제안하고 의견을 나눠보세요. 좋아요를 많이 받은 제안은 후보자가 채택할 수 있습니다.
        </p>
      </div>

      {/* Layout: mobile = stack (filters/form first), desktop = 2-col (list left, ranking right) */}
      <div className="flex flex-col lg:flex-row lg:gap-6 gap-6">
        {/* ── Left / Main column ─────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-5">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[140px]">
              <label htmlFor="filter-city" className="block text-xs font-medium text-muted mb-1.5">시군구</label>
              <select
                id="filter-city"
                value={selectedCity}
                onChange={(e) => {
                  setSelectedCity(e.target.value);
                  if (e.target.value) {
                    const valid = candidates.some(
                      (c) =>
                        c.id === selectedCandidateId &&
                        (c.district === e.target.value || c.district.startsWith(e.target.value))
                    );
                    if (!valid) setSelectedCandidateId("");
                  }
                }}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              >
                <option value="">전체 지역</option>
                {districts.map((d) => (
                  <option key={d.name} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>

            <div className="flex-1 min-w-[140px]">
              <label htmlFor="filter-candidate" className="block text-xs font-medium text-muted mb-1.5">후보자</label>
              <select
                id="filter-candidate"
                value={selectedCandidateId}
                onChange={(e) => setSelectedCandidateId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              >
                <option value="">모두에게 제안 (전체)</option>
                {filteredCandidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.district})
                  </option>
                ))}
              </select>
            </div>

            <div className={`flex items-end ${hasFilter ? "" : "invisible pointer-events-none"}`}>
              <button
                onClick={() => { setSelectedCity(""); setSelectedCandidateId(""); }}
                className="px-3 py-2 text-sm text-muted hover:text-foreground border border-border rounded-lg hover:bg-background transition-colors"
              >
                초기화
              </button>
            </div>
          </div>

          {/* Proposal list + form */}
          <ProposalList
            candidateId={selectedCandidateId || undefined}
            city={selectedCity || undefined}
            showForm
            onRankingRefresh={() => setRankingRefreshKey(k => k + 1)}
          />
        </div>

        {/* ── Right / Ranking sidebar ─────────────────────────────── */}
        {/* Mobile: shown after main column (flex-col order) */}
        <div className="lg:w-72 xl:w-80 shrink-0">
          <div className="lg:sticky lg:top-20">
            <ProposalRanking refreshKey={rankingRefreshKey} />
          </div>
        </div>
      </div>
    </div>
  );
}
