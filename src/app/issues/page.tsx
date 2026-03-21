"use client";

import { useState, useEffect } from "react";
import IssueCard from "@/components/issues/IssueCard";

interface Issue {
  id: string;
  title: string;
  summary: string | null;
  category: string | null;
  dong: string | null;
  city: string | null;
  reportCount: number;
  status: string;
  adminStatus: string | null;
  createdAt: string;
}

const CITY_FILTERS = [
  "전체",
  "천안시",
  "공주시",
  "보령시",
  "아산시",
  "서산시",
  "논산시",
  "계룡시",
  "당진시",
  "금산군",
  "부여군",
  "서천군",
  "청양군",
  "홍성군",
  "예산군",
  "태안군",
];

export default function IssuesPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState("전체");

  useEffect(() => {
    async function fetchIssues() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedCity !== "전체") {
          params.set("city", selectedCity);
        }
        params.set("limit", "100");
        const res = await fetch(`/api/issues?${params.toString()}`);
        if (res.ok) {
          const json = await res.json();
          setIssues(json.data ?? []);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    fetchIssues();
  }, [selectedCity]);

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
          충남 지역 이슈
        </h1>
        <p className="text-muted text-sm sm:text-base">
          시민들이 제보한 지역 이슈를 확인하세요
        </p>
      </div>

      {/* City filter tabs */}
      <div className="mb-6 overflow-x-auto">
        <div className="flex gap-2 pb-2 min-w-max">
          {CITY_FILTERS.map((city) => (
            <button
              key={city}
              onClick={() => setSelectedCity(city)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCity === city
                  ? "bg-primary text-white"
                  : "bg-surface text-muted border border-border hover:bg-primary-light hover:text-primary"
              }`}
            >
              {city}
            </button>
          ))}
        </div>
      </div>

      {/* Issues grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : issues.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted text-lg">등록된 이슈가 없습니다</p>
          <p className="text-muted text-sm mt-1">
            {selectedCity !== "전체"
              ? `${selectedCity} 지역에 등록된 이슈가 아직 없습니다.`
              : "아직 등록된 이슈가 없습니다."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {issues.map((issue) => (
            <IssueCard key={issue.id} issue={issue} />
          ))}
        </div>
      )}
    </>
  );
}
