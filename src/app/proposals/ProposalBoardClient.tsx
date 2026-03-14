"use client";

import { useState } from "react";
import ProposalList from "@/components/proposals/ProposalList";

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

  // Filter candidate dropdown by selected city
  const filteredCandidates = selectedCity
    ? candidates.filter((c) => c.district === selectedCity || c.district.startsWith(selectedCity))
    : candidates;

  const hasFilter = selectedCity || selectedCandidateId;

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs font-medium text-muted mb-1.5">시군구 필터</label>
          <select
            value={selectedCity}
            onChange={(e) => {
              setSelectedCity(e.target.value);
              // Clear candidate if they're no longer in the new district
              if (e.target.value) {
                const stillValid = candidates.some(
                  (c) =>
                    c.id === selectedCandidateId &&
                    (c.district === e.target.value || c.district.startsWith(e.target.value))
                );
                if (!stillValid) setSelectedCandidateId("");
              }
            }}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
          >
            <option value="">전체 지역</option>
            {districts.map((d) => (
              <option key={d.name} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs font-medium text-muted mb-1.5">후보자 필터</label>
          <select
            value={selectedCandidateId}
            onChange={(e) => setSelectedCandidateId(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
          >
            <option value="">전체 후보자</option>
            {filteredCandidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.district})
              </option>
            ))}
          </select>
        </div>

        {hasFilter && (
          <div className="flex items-end">
            <button
              onClick={() => {
                setSelectedCity("");
                setSelectedCandidateId("");
              }}
              className="px-3 py-2 text-sm text-muted hover:text-foreground border border-border rounded-lg hover:bg-background transition-colors"
            >
              초기화
            </button>
          </div>
        )}
      </div>

      <ProposalList
        candidateId={selectedCandidateId || undefined}
        city={selectedCity || undefined}
        showForm={true}
      />
    </div>
  );
}
