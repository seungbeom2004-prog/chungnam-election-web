"use client";

import { useState } from "react";
import Link from "next/link";

interface CandidateInfo {
  name: string;
  district: string;
  electionType: string | null;
  detailedElectionName: string | null;
  caucusStatus: string | null;
  electionName: string | null;
}

interface MatchItem {
  candidateName: string;
  wiwName: string;
  electName: string;
  status: string;
  party: string;
  sdName: string;
}

interface FetchResult {
  candidate: CandidateInfo;
  nameMatches: MatchItem[];
  allCandidates: MatchItem[];
  alreadySyncedToday: boolean;
  lastSyncDate: string | null;
}

export default function NecSyncPage() {
  const [fetching, setFetching] = useState(false);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<FetchResult | null>(null);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<MatchItem | null>(null);
  const [searchFilter, setSearchFilter] = useState("");

  // Fields to apply (user can toggle)
  const [applyElectionName, setApplyElectionName] = useState(true);
  const [applyDetailedElection, setApplyDetailedElection] = useState(true);
  const [applyDistrict, setApplyDistrict] = useState(false);
  const [applyStatus, setApplyStatus] = useState(true);

  const handleFetch = async () => {
    setFetching(true);
    setError(null);
    setResult(null);
    setApplied(false);
    setSelectedMatch(null);
    setSearchFilter("");
    try {
      const res = await fetch("/api/nec-candidate");
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "조회 실패");
      } else {
        const data: FetchResult = json.data ?? json;
        setResult(data);
        // Auto-select if there's exactly one name match
        if (data.nameMatches.length === 1) {
          setSelectedMatch(data.nameMatches[0]!);
        }
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setFetching(false);
    }
  };

  const handleApply = async () => {
    if (!selectedMatch) return;
    setApplying(true);
    setApplyError(null);
    try {
      const body: Record<string, string | undefined> = {};
      if (applyElectionName) body.electionName = selectedMatch.electName;
      if (applyDetailedElection) body.detailedElectionName = selectedMatch.electName;
      if (applyDistrict) body.district = selectedMatch.wiwName;
      if (applyStatus) body.caucusStatus = selectedMatch.status;

      const res = await fetch("/api/nec-candidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setApplyError(json.error || "적용 실패");
      } else {
        setApplied(true);
        if (result) {
          setResult({ ...result, alreadySyncedToday: true, lastSyncDate: new Date().toISOString().split("T")[0] });
        }
      }
    } catch {
      setApplyError("네트워크 오류가 발생했습니다.");
    } finally {
      setApplying(false);
    }
  };

  // Filtered allCandidates list
  const filteredCandidates = result
    ? result.allCandidates.filter((m) => {
        const q = searchFilter.trim().toLowerCase();
        if (!q) return true;
        return (
          m.candidateName?.toLowerCase().includes(q) ||
          m.wiwName?.toLowerCase().includes(q) ||
          m.electName?.toLowerCase().includes(q) ||
          m.party?.toLowerCase().includes(q)
        );
      })
    : [];

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Link href="/dashboard" className="text-muted hover:text-foreground text-sm">대시보드</Link>
          <span className="text-muted text-sm">/</span>
          <span className="text-sm text-foreground font-medium">선관위 연동</span>
        </div>
        <h1 className="text-xl font-bold text-foreground">선관위 (NEC) 데이터 연동</h1>
        <p className="text-sm text-muted mt-1">
          중앙선거관리위원회 API에서 충청남도 후보자 목록을 조회하여 내 정보를 선택·반영합니다.
        </p>
      </div>

      {/* Info card */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <span className="text-blue-500 text-lg">ℹ️</span>
          <div className="text-sm text-blue-800 space-y-1">
            <p className="font-semibold">사용 방법</p>
            <ol className="space-y-0.5 text-blue-700 list-decimal list-inside">
              <li>아래 버튼으로 선관위 데이터를 조회합니다</li>
              <li>목록에서 본인의 이름을 클릭해 선택합니다</li>
              <li>반영할 항목을 체크 후 프로필에 적용합니다</li>
            </ol>
            <p className="text-blue-600 text-xs mt-2">하루에 한 번 새로고침이 가능합니다.</p>
          </div>
        </div>
      </div>

      {/* Current profile status */}
      {result && (
        <div className="bg-surface border border-border rounded-xl p-4 mb-4">
          <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">현재 프로필 정보</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted text-xs">이름</span>
              <p className="font-medium">{result.candidate.name}</p>
            </div>
            <div>
              <span className="text-muted text-xs">선거구</span>
              <p className="font-medium">{result.candidate.district || "미입력"}</p>
            </div>
            <div>
              <span className="text-muted text-xs">선거종류</span>
              <p className="font-medium">{result.candidate.electionType || "미입력"}</p>
            </div>
            <div>
              <span className="text-muted text-xs">세부선거명</span>
              <p className="font-medium">{result.candidate.detailedElectionName || "미입력"}</p>
            </div>
          </div>
        </div>
      )}

      {/* Fetch button */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={handleFetch}
          disabled={fetching}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {fetching ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              조회 중...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              선관위에서 조회
            </>
          )}
        </button>
        {result?.lastSyncDate && (
          <span className="text-xs text-muted">
            마지막 동기화: {result.lastSyncDate}
            {result.alreadySyncedToday && " (오늘 완료)"}
          </span>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <>
          {/* Name matches (highlighted) */}
          {result.nameMatches.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-green-600 font-bold text-sm">✓</span>
                <p className="text-sm font-semibold text-foreground">이름 일치 후보자 ({result.nameMatches.length}명)</p>
              </div>
              <div className="space-y-1.5">
                {result.nameMatches.map((m, i) => (
                  <button
                    key={`nm-${i}`}
                    onClick={() => { setSelectedMatch(m); setApplied(false); setApplyError(null); }}
                    className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-colors ${
                      selectedMatch === m
                        ? "border-primary bg-primary/10"
                        : "border-green-300 bg-green-50 hover:border-primary/50 hover:bg-primary/5"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-foreground text-sm">{m.candidateName}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">{m.status}</span>
                      </div>
                      <p className="text-xs text-muted mt-0.5">{m.wiwName} {m.electName} · {m.party || "무소속"}</p>
                    </div>
                    {selectedMatch === m && (
                      <span className="text-primary font-bold shrink-0">선택됨 ✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* No name match warning */}
          {result.nameMatches.length === 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
              <div className="flex items-start gap-3">
                <span className="text-amber-500">⚠️</span>
                <div className="text-sm text-amber-800">
                  <p className="font-semibold">이름으로 일치하는 후보자를 찾지 못했습니다.</p>
                  <p className="mt-1 text-amber-700">아래 전체 목록에서 직접 선택해 주세요.</p>
                </div>
              </div>
            </div>
          )}

          {/* All candidates list */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-foreground">충청남도 전체 예비후보자 목록</p>
              <span className="text-xs text-muted">{result.allCandidates.length}명 (최대 20명 표시)</span>
            </div>

            {/* Search filter */}
            <div className="flex items-center gap-2 bg-background border border-border rounded-xl px-3 py-2 mb-2 focus-within:border-primary/50 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted shrink-0">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="이름, 지역, 정당으로 검색"
                className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted min-w-0"
              />
              {searchFilter && (
                <button onClick={() => setSearchFilter("")} className="text-muted hover:text-foreground text-sm leading-none" aria-label="검색어 지우기">×</button>
              )}
            </div>

            <div className="border border-border rounded-xl overflow-hidden">
              {filteredCandidates.length === 0 ? (
                <div className="py-8 text-center text-muted text-sm">검색 결과가 없습니다</div>
              ) : (
                <div className="divide-y divide-border/50 max-h-72 overflow-y-auto">
                  {filteredCandidates.map((m, i) => (
                    <button
                      key={`all-${i}`}
                      onClick={() => { setSelectedMatch(m); setApplied(false); setApplyError(null); }}
                      className={`w-full text-left flex items-center gap-3 px-4 py-3 transition-colors ${
                        selectedMatch === m
                          ? "bg-primary/10 border-l-2 border-primary"
                          : "hover:bg-background/70"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-foreground text-sm">{m.candidateName}</span>
                          <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{m.status}</span>
                        </div>
                        <p className="text-xs text-muted mt-0.5">{m.wiwName} {m.electName} · {m.party || "무소속"}</p>
                      </div>
                      {selectedMatch === m && (
                        <span className="text-primary font-bold text-xs shrink-0">선택 ✓</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Selected match detail + apply */}
          {selectedMatch && (
            <div className="bg-surface border border-border rounded-xl overflow-hidden mb-4">
              <div className="px-4 py-3 border-b border-border bg-primary/5">
                <div className="flex items-center gap-2">
                  <span className="text-primary">✓</span>
                  <p className="text-sm font-semibold text-foreground">선택된 후보자: {selectedMatch.candidateName}</p>
                </div>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                  <div>
                    <span className="text-muted text-xs">후보자 이름</span>
                    <p className="font-semibold text-foreground">{selectedMatch.candidateName}</p>
                  </div>
                  <div>
                    <span className="text-muted text-xs">소속 정당</span>
                    <p className="font-semibold text-foreground">{selectedMatch.party || "무소속"}</p>
                  </div>
                  <div>
                    <span className="text-muted text-xs">선거명칭</span>
                    <p className="font-semibold text-primary">{selectedMatch.electName}</p>
                  </div>
                  <div>
                    <span className="text-muted text-xs">시군구</span>
                    <p className="font-semibold">{selectedMatch.wiwName}</p>
                  </div>
                  <div>
                    <span className="text-muted text-xs">등록상태</span>
                    <p className="font-semibold">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary font-bold">
                        {selectedMatch.status}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Apply options */}
                <div className="border-t border-border pt-4">
                  <p className="text-xs font-semibold text-muted mb-3">프로필에 반영할 항목 선택</p>
                  <div className="space-y-2 mb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={applyElectionName}
                        onChange={(e) => setApplyElectionName(e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-sm">선거명칭: <span className="text-primary font-medium">{selectedMatch.electName}</span></span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={applyDetailedElection}
                        onChange={(e) => setApplyDetailedElection(e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-sm">세부선거명: <span className="text-primary font-medium">{selectedMatch.electName}</span></span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={applyDistrict}
                        onChange={(e) => setApplyDistrict(e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-sm">선거구 (시군구): <span className="text-primary font-medium">{selectedMatch.wiwName}</span></span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={applyStatus}
                        onChange={(e) => setApplyStatus(e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-sm">등록상태: <span className="text-primary font-medium">{selectedMatch.status}</span></span>
                    </label>
                  </div>

                  {applied ? (
                    <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                      <span>✓</span>
                      <span>프로필에 반영되었습니다!</span>
                      <Link href="/dashboard/profile" className="text-primary underline ml-2">프로필 확인 →</Link>
                    </div>
                  ) : (
                    <button
                      onClick={handleApply}
                      disabled={applying || result.alreadySyncedToday || (!applyElectionName && !applyDetailedElection && !applyDistrict && !applyStatus)}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {applying ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          적용 중...
                        </>
                      ) : (
                        <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          프로필에 반영
                        </>
                      )}
                    </button>
                  )}
                  {result.alreadySyncedToday && !applied && (
                    <p className="text-xs text-amber-600 mt-2">오늘은 이미 동기화했습니다. 내일 다시 시도해 주세요.</p>
                  )}
                  {applyError && (
                    <p className="text-xs text-red-600 mt-2">{applyError}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Back to profile link */}
      <div className="mt-6 flex gap-3">
        <Link
          href="/dashboard/profile"
          className="text-sm text-muted hover:text-foreground transition-colors"
        >
          ← 프로필로 돌아가기
        </Link>
      </div>
    </div>
  );
}
