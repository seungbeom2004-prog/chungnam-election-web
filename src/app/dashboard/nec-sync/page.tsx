"use client";

import { useState } from "react";
import Link from "next/link";

interface NecData {
  electionName: string;
  district: string;
  wiwName: string;
  electName: string;
  status: string;
  party: string;
  regDate: string;
  candidateName: string;
}

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
}

interface FetchResult {
  candidate: CandidateInfo;
  necData: NecData | null;
  allMatches: MatchItem[];
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
    try {
      const res = await fetch("/api/nec-candidate");
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "조회 실패");
      } else {
        setResult(json.data ?? json);
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setFetching(false);
    }
  };

  const handleApply = async () => {
    if (!result?.necData) return;
    setApplying(true);
    setApplyError(null);
    try {
      const body: Record<string, string | undefined> = {};
      if (applyElectionName) body.electionName = result.necData.electionName;
      if (applyDetailedElection) body.detailedElectionName = result.necData.electName;
      if (applyDistrict) body.district = result.necData.wiwName;
      if (applyStatus) body.caucusStatus = result.necData.status;

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
        // Update local state to reflect sync
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
          중앙선거관리위원회 API에서 내 선거 정보를 가져와 프로필에 자동 반영합니다.
        </p>
      </div>

      {/* Info card */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <span className="text-blue-500 text-lg">ℹ️</span>
          <div className="text-sm text-blue-800 space-y-1">
            <p className="font-semibold">가져오는 정보</p>
            <ul className="space-y-0.5 text-blue-700">
              <li>• 선거명칭 (예: 천안시의회의원선거)</li>
              <li>• 세부구역 (예: 천안시다선거구)</li>
              <li>• 등록상태 (예: 예비후보자)</li>
            </ul>
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

      {/* NEC data result */}
      {result?.necData && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden mb-4">
          <div className="px-4 py-3 border-b border-border bg-green-50">
            <div className="flex items-center gap-2">
              <span className="text-green-600">✓</span>
              <p className="text-sm font-semibold text-green-800">선관위에서 데이터를 찾았습니다</p>
            </div>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              <div>
                <span className="text-muted text-xs">후보자 이름</span>
                <p className="font-semibold text-foreground">{result.necData.candidateName}</p>
              </div>
              <div>
                <span className="text-muted text-xs">소속 정당</span>
                <p className="font-semibold text-foreground">{result.necData.party || "무소속"}</p>
              </div>
              <div>
                <span className="text-muted text-xs">선거명칭</span>
                <p className="font-semibold text-primary">{result.necData.electionName}</p>
              </div>
              <div>
                <span className="text-muted text-xs">세부구역</span>
                <p className="font-semibold text-primary">{result.necData.electName}</p>
              </div>
              <div>
                <span className="text-muted text-xs">시군구</span>
                <p className="font-semibold">{result.necData.wiwName}</p>
              </div>
              <div>
                <span className="text-muted text-xs">등록상태</span>
                <p className="font-semibold">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary font-bold">
                    {result.necData.status}
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
                  <span className="text-sm">선거명칭: <span className="text-primary font-medium">{result.necData.electionName}</span></span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={applyDetailedElection}
                    onChange={(e) => setApplyDetailedElection(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">세부선거명: <span className="text-primary font-medium">{result.necData.electName}</span></span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={applyDistrict}
                    onChange={(e) => setApplyDistrict(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">선거구 (시군구): <span className="text-primary font-medium">{result.necData.wiwName}</span></span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={applyStatus}
                    onChange={(e) => setApplyStatus(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">등록상태: <span className="text-primary font-medium">{result.necData.status}</span></span>
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

      {/* No match found */}
      {result && !result.necData && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
          <div className="flex items-start gap-3">
            <span className="text-amber-500">⚠️</span>
            <div className="text-sm text-amber-800">
              <p className="font-semibold">선관위에서 후보자 정보를 찾지 못했습니다.</p>
              <p className="mt-1 text-amber-700">
                예비후보자 등록 후 조회가 가능합니다. 또는 프로필의 이름과 선거구를 정확히 입력해 주세요.
              </p>
            </div>
          </div>
          {result.allMatches.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-amber-700 mb-2">충청남도 조회 결과 (상위 3건):</p>
              <div className="space-y-1">
                {result.allMatches.map((m, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-amber-800 bg-amber-100/50 rounded-lg px-2 py-1">
                    <span className="font-medium">{m.candidateName}</span>
                    <span>·</span>
                    <span>{m.wiwName} {m.electName}</span>
                    <span>·</span>
                    <span>{m.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
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
