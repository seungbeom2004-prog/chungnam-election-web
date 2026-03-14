"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Card from "@/components/ui/Card";
import type { Pledge, Category } from "@/types";

interface Candidate {
  id: string;
  name: string;
  district: string;
  profileImage: string | null;
  slogan: string | null;
  candidateStatus: string;
}

interface OtherPledgesTabProps {
  currentCandidateId: string;
}

type ViewMode = "byCandidate" | "byCategory" | "byCity";

export default function OtherPledgesTab({ currentCandidateId }: OtherPledgesTabProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("byCandidate");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [districts, setDistricts] = useState<{ id: string; name: string }[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [pledges, setPledges] = useState<Pledge[]>([]);
  const [loadingPledges, setLoadingPledges] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/candidates?limit=100").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
      fetch("/api/districts").then((r) => r.json()),
    ]).then(([cJson, catJson, dJson]) => {
      setCandidates(
        (cJson.data ?? []).filter((c: Candidate) => c.id !== currentCandidateId)
      );
      setCategories(catJson.data ?? []);
      setDistricts(dJson.data ?? []);
    });
  }, [currentCandidateId]);

  const fetchPledges = useCallback(async () => {
    setLoadingPledges(true);
    setPledges([]);

    let url = `/api/pledges?limit=100`;
    if (viewMode === "byCandidate" && selectedCandidateId) {
      url += `&candidateId=${selectedCandidateId}`;
    } else if (viewMode === "byCity" && selectedDistrict) {
      url += `&district=${encodeURIComponent(selectedDistrict)}`;
    } else if (viewMode === "byCategory") {
      url += `&limit=200`; // fetch all, filter client-side by category
    }

    try {
      const res = await fetch(url);
      const json = await res.json();
      let data: Pledge[] = json.data ?? [];

      // Filter out own pledges
      data = data.filter((p) => p.candidateId !== currentCandidateId);

      // Client-side category filter
      if (viewMode === "byCategory" && selectedCategoryId) {
        data = data.filter((p) => p.categoryId === selectedCategoryId);
      }

      setPledges(data);
    } catch {
      console.error("Failed to fetch pledges");
    }
    setLoadingPledges(false);
  }, [viewMode, selectedCandidateId, selectedCategoryId, selectedDistrict, currentCandidateId]);

  useEffect(() => {
    if (
      (viewMode === "byCandidate" && selectedCandidateId) ||
      (viewMode === "byCategory" && selectedCategoryId) ||
      (viewMode === "byCity" && selectedDistrict)
    ) {
      fetchPledges();
    } else {
      setPledges([]);
    }
  }, [viewMode, selectedCandidateId, selectedCategoryId, selectedDistrict, fetchPledges]);

  const handleJoin = async (pledge: Pledge) => {
    setJoiningId(pledge.id);
    try {
      const res = await fetch(`/api/pledges/${pledge.id}/collaborators`, {
        method: "POST",
      });
      if (res.ok || res.status === 409) {
        setJoinedIds((prev) => new Set([...prev, pledge.id]));
      } else {
        const json = await res.json();
        alert(json.error || "참여에 실패했습니다.");
      }
    } catch {
      alert("참여에 실패했습니다.");
    }
    setJoiningId(null);
  };

  const filteredCandidates = candidates.filter(
    (c) =>
      c.name.includes(searchQuery) ||
      c.district.includes(searchQuery)
  );

  return (
    <div className="flex flex-col gap-4">
      {/* View mode selector */}
      <div className="flex gap-2 flex-wrap">
        <span className="text-sm font-medium text-foreground self-center">보기 방식:</span>
        {(["byCandidate", "byCategory", "byCity"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => {
              setViewMode(mode);
              setPledges([]);
            }}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              viewMode === mode
                ? "bg-primary text-white border-primary"
                : "bg-surface text-muted border-border hover:border-primary hover:text-primary"
            }`}
          >
            {mode === "byCandidate" ? "출마자별" : mode === "byCategory" ? "분야별" : "지역별"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-16rem)]">
        {/* Left panel: selector */}
        <div className="overflow-y-auto custom-scrollbar border border-border rounded-xl bg-surface">
          {viewMode === "byCandidate" && (
            <div>
              <div className="p-3 border-b border-border sticky top-0 bg-surface">
                <input
                  type="text"
                  placeholder="이름 또는 지역으로 검색"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="divide-y divide-border">
                {filteredCandidates.map((candidate) => (
                  <button
                    key={candidate.id}
                    onClick={() => setSelectedCandidateId(candidate.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      selectedCandidateId === candidate.id
                        ? "bg-primary-light border-l-2 border-primary"
                        : "hover:bg-background"
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-100 shrink-0">
                      {candidate.profileImage ? (
                        <Image
                          src={candidate.profileImage}
                          alt={candidate.name}
                          width={36}
                          height={36}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm text-muted">
                          {candidate.name[0]}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-foreground">{candidate.name}</p>
                      <p className="text-xs text-muted truncate">{candidate.district}</p>
                    </div>
                  </button>
                ))}
                {filteredCandidates.length === 0 && (
                  <p className="text-sm text-muted text-center py-6">출마자가 없습니다</p>
                )}
              </div>
            </div>
          )}

          {viewMode === "byCategory" && (
            <div className="divide-y divide-border">
              <div className="px-4 py-3 text-xs font-semibold text-muted sticky top-0 bg-surface">
                분야 선택
              </div>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    selectedCategoryId === cat.id
                      ? "bg-primary-light border-l-2 border-primary"
                      : "hover:bg-background"
                  }`}
                >
                  <span className="text-lg">{cat.emoji || "📌"}</span>
                  <span className="text-sm font-medium text-foreground">{cat.name}</span>
                </button>
              ))}
              {categories.length === 0 && (
                <p className="text-sm text-muted text-center py-6">카테고리가 없습니다</p>
              )}
            </div>
          )}

          {viewMode === "byCity" && (
            <div className="divide-y divide-border">
              <div className="px-4 py-3 text-xs font-semibold text-muted sticky top-0 bg-surface">
                지역 선택
              </div>
              {districts.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setSelectedDistrict(d.name)}
                  className={`w-full px-4 py-3 text-left text-sm font-medium transition-colors ${
                    selectedDistrict === d.name
                      ? "bg-primary-light text-primary border-l-2 border-primary"
                      : "text-foreground hover:bg-background"
                  }`}
                >
                  {d.name}
                </button>
              ))}
              {districts.length === 0 && (
                <p className="text-sm text-muted text-center py-6">지역 정보가 없습니다</p>
              )}
            </div>
          )}
        </div>

        {/* Right panel: pledges */}
        <div className="lg:col-span-2 overflow-y-auto custom-scrollbar">
          {loadingPledges ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : pledges.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 text-muted">
              <p className="text-lg mb-2">
                <span className="lg:hidden">👆</span>
                <span className="hidden lg:inline">👈</span>
              </p>
              <p className="text-sm">
                <span className="lg:hidden">
                  {viewMode === "byCandidate"
                    ? "위에서 출마자를 선택하세요"
                    : viewMode === "byCategory"
                    ? "위에서 분야를 선택하세요"
                    : "위에서 지역을 선택하세요"}
                </span>
                <span className="hidden lg:inline">
                  {viewMode === "byCandidate"
                    ? "왼쪽에서 출마자를 선택하세요"
                    : viewMode === "byCategory"
                    ? "왼쪽에서 분야를 선택하세요"
                    : "왼쪽에서 지역을 선택하세요"}
                </span>
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted">공약 {pledges.length}건</p>
              {pledges.map((pledge) => {
                const isJoined = joinedIds.has(pledge.id);
                const isJoining = joiningId === pledge.id;

                return (
                  <Card key={pledge.id} padding="sm">
                    <div className="flex gap-3">
                      {/* Category emoji */}
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0"
                        style={{ backgroundColor: pledge.category?.color ? `${pledge.category.color}20` : "#f3f4f6" }}>
                        {pledge.category?.emoji || "📌"}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-foreground text-sm">{pledge.title}</h3>
                        {pledge.candidate && (
                          <p className="text-xs text-muted mt-0.5">
                            {pledge.candidate.name} · {pledge.candidate.district}
                          </p>
                        )}
                        <p className="text-xs text-muted line-clamp-2 mt-1">
                          {pledge.description}
                        </p>
                        {pledge.budget && (
                          <span className="inline-block mt-1.5 px-2 py-0.5 text-xs bg-primary-light text-primary rounded-full">
                            {pledge.budget}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                      <span className="text-xs text-muted">
                        {pledge.collaborators && pledge.collaborators.length > 0
                          ? `공동공약 ${pledge.collaborators.length}명 참여 중`
                          : ""}
                      </span>
                      <button
                        onClick={() => handleJoin(pledge)}
                        disabled={isJoined || isJoining}
                        className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                          isJoined
                            ? "bg-green-100 text-green-700 cursor-default"
                            : "bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
                        }`}
                      >
                        {isJoining ? "처리 중..." : isJoined ? "✓ 함께하기 완료" : "함께하기"}
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
