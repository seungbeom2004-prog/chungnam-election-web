"use client";

import { useState, useEffect, useCallback } from "react";
import { Button, Badge, Card } from "@/components/ui";

interface DistrictOption {
  name: string;
  wOrder?: number;
}

interface ElectionOption {
  id: string;
  name: string;
}

interface AdminCandidate {
  id: string;
  email: string;
  name: string;
  district: string;
  party: string;
  phone: string | null;
  verified: boolean;
  emailVerified: boolean;
  role: string;
  electionId: string | null;
  election: { id: string; name: string } | null;
  candidateStatus: string;
  caucusStatus: string;
  pinLat: number | null;
  pinLng: number | null;
  createdAt: string;
}

type FilterTab = "pending" | "approved" | "all";

const CANDIDATE_STATUSES = ["출마예정자", "예비후보자", "후보자"];
const CAUCUS_STATUSES = ["공천 미확정", "공천 확정"];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, "primary" | "secondary" | "muted"> = {
    "후보자": "primary",
    "예비후보자": "secondary",
    "출마예정자": "muted",
  };
  return <Badge variant={map[status] ?? "muted"}>{status}</Badge>;
}

function CaucusBadge({ status }: { status: string }) {
  return (
    <Badge variant={status === "공천 확정" ? "primary" : "muted"}>
      {status}
    </Badge>
  );
}

export default function AdminCandidatesPage() {
  const [candidates, setCandidates] = useState<AdminCandidate[]>([]);
  const [districts, setDistricts] = useState<DistrictOption[]>([]);
  const [elections, setElections] = useState<ElectionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("pending");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter === "pending") params.set("verified", "false");
    if (filter === "approved") params.set("verified", "true");

    try {
      const [candidatesRes, electionsRes, districtsRes] = await Promise.all([
        fetch(`/api/admin/candidates?${params.toString()}`),
        fetch("/api/admin/elections"),
        fetch("/api/nec?type=districts"), // NEC-sourced exact districts
      ]);
      const candidatesJson = await candidatesRes.json();
      const electionsJson = await electionsRes.json();
      const districtsJson = await districtsRes.json();
      setCandidates(candidatesJson.data ?? candidatesJson ?? []);
      setElections(electionsJson.data ?? []);
      const dists: DistrictOption[] = districtsJson.data ?? [];
      dists.sort((a, b) => (a.wOrder ?? 0) - (b.wOrder ?? 0));
      setDistricts(dists);
    } catch {
      console.error("Failed to fetch data");
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleVerify = async (candidateId: string, verified: boolean) => {
    setActionLoading(candidateId + "verify");
    try {
      await fetch("/api/admin/candidates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId, verified }),
      });
      await fetchData();
    } catch {
      alert("상태 변경에 실패했습니다.");
    }
    setActionLoading(null);
  };

  const handleFieldChange = async (
    candidateId: string,
    field: "candidateStatus" | "caucusStatus" | "electionId" | "district" | "pinLat" | "pinLng",
    value: string | null
  ) => {
    setActionLoading(candidateId + field);
    try {
      await fetch("/api/admin/candidates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId, [field]: value }),
      });
      await fetchData();
    } catch {
      alert("상태 변경에 실패했습니다.");
    }
    setActionLoading(null);
  };

  const handleDelete = async (candidateId: string, name: string) => {
    if (!confirm(`정말로 "${name}" 출마자를 삭제하시겠습니까?`)) return;
    setActionLoading(candidateId + "delete");
    try {
      await fetch(`/api/admin/candidates?id=${candidateId}`, { method: "DELETE" });
      await fetchData();
    } catch {
      alert("삭제에 실패했습니다.");
    }
    setActionLoading(null);
  };

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: "pending", label: "승인 대기" },
    { key: "approved", label: "승인됨" },
    { key: "all", label: "전체" },
  ];

  const filtered = candidates.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.district.toLowerCase().includes(q)
    );
  });

  const pendingCount = candidates.filter((c) => !c.verified && c.role !== "admin").length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">출마자 관리</h1>
          <p className="text-sm text-muted mt-0.5">출마자 승인, 상태 변경, 선거구 배정을 관리합니다</p>
        </div>
        <span className="text-sm text-muted bg-background px-3 py-1.5 rounded-lg border border-border">
          총 {filtered.length}명
        </span>
      </div>

      {/* Filter tabs + Search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex gap-1.5">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors relative ${
                filter === tab.key
                  ? "bg-primary text-white"
                  : "bg-background text-muted hover:text-foreground border border-border"
              }`}
            >
              {tab.label}
              {tab.key === "pending" && pendingCount > 0 && filter !== "pending" && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {pendingCount > 9 ? "9+" : pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="이름, 이메일, 선거구 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-3 py-1.5 text-sm border border-border rounded-lg bg-surface text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
        />
      </div>

      {/* Candidates list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card padding="lg">
          <p className="text-center text-muted py-8">
            {search
              ? "검색 결과가 없습니다."
              : filter === "pending"
              ? "승인 대기 중인 출마자가 없습니다."
              : filter === "approved"
              ? "승인된 출마자가 없습니다."
              : "등록된 출마자가 없습니다."}
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((candidate) => {
            const isExpanded = expandedId === candidate.id;
            const isActionLoading = (suffix: string) =>
              actionLoading === candidate.id + suffix;
            const anyLoading = actionLoading?.startsWith(candidate.id);

            return (
              <Card key={candidate.id} padding="md">
                {/* Main row */}
                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                  {/* Left: info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-foreground text-sm">
                        {candidate.name}
                      </span>
                      <Badge variant={candidate.verified ? "primary" : "muted"}>
                        {candidate.verified ? "승인됨" : "대기중"}
                      </Badge>
                      {candidate.role === "admin" && (
                        <Badge variant="primary">관리자</Badge>
                      )}
                      {candidate.emailVerified && (
                        <Badge variant="secondary">이메일 인증</Badge>
                      )}
                      <StatusBadge status={candidate.candidateStatus} />
                      <CaucusBadge status={candidate.caucusStatus} />
                    </div>

                    <div className="text-xs text-muted space-y-0.5">
                      <p>{candidate.email}</p>
                      <p className="flex items-center gap-2 flex-wrap">
                        <span>선거구: <span className="text-foreground font-medium">{candidate.district || "미지정"}</span></span>
                        {candidate.election && (
                          <span>| 선거: <span className="text-foreground font-medium">{candidate.election.name}</span></span>
                        )}
                        {candidate.phone && (
                          <span>| {candidate.phone}</span>
                        )}
                      </p>
                      <p>가입: {new Date(candidate.createdAt).toLocaleDateString("ko-KR")}</p>
                    </div>
                  </div>

                  {/* Right: action buttons */}
                  {candidate.role !== "admin" && (
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      {candidate.verified ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleVerify(candidate.id, false)}
                          disabled={!!anyLoading}
                        >
                          {isActionLoading("verify") ? "처리 중..." : "승인 취소"}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleVerify(candidate.id, true)}
                          disabled={!!anyLoading}
                        >
                          {isActionLoading("verify") ? "처리 중..." : "승인"}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setExpandedId(isExpanded ? null : candidate.id)
                        }
                      >
                        {isExpanded ? "접기" : "상세관리"}
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDelete(candidate.id, candidate.name)}
                        disabled={!!anyLoading}
                      >
                        삭제
                      </Button>
                    </div>
                  )}
                </div>

                {/* Expanded management panel */}
                {isExpanded && candidate.role !== "admin" && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
                      상세 정보 관리
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Candidate status */}
                      <div>
                        <label className="block text-xs font-medium text-muted mb-1">
                          후보 상태
                        </label>
                        <select
                          value={candidate.candidateStatus}
                          onChange={(e) =>
                            handleFieldChange(
                              candidate.id,
                              "candidateStatus",
                              e.target.value
                            )
                          }
                          disabled={!!anyLoading}
                          className="w-full px-2.5 py-1.5 text-sm border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 disabled:opacity-50"
                        >
                          {CANDIDATE_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Caucus status */}
                      <div>
                        <label className="block text-xs font-medium text-muted mb-1">
                          공천 상태
                        </label>
                        <select
                          value={candidate.caucusStatus}
                          onChange={(e) =>
                            handleFieldChange(
                              candidate.id,
                              "caucusStatus",
                              e.target.value
                            )
                          }
                          disabled={!!anyLoading}
                          className="w-full px-2.5 py-1.5 text-sm border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 disabled:opacity-50"
                        >
                          {CAUCUS_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* District — from NEC API */}
                      <div>
                        <label className="block text-xs font-medium text-muted mb-1">
                          선거구
                        </label>
                        <select
                          value={candidate.district}
                          onChange={(e) =>
                            handleFieldChange(
                              candidate.id,
                              "district",
                              e.target.value
                            )
                          }
                          disabled={!!anyLoading}
                          className="w-full px-2.5 py-1.5 text-sm border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 disabled:opacity-50"
                        >
                          <option value="">선거구 미지정</option>
                          {districts.map((d) => (
                            <option key={d.name} value={d.name}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Election */}
                      <div>
                        <label className="block text-xs font-medium text-muted mb-1">
                          선거
                        </label>
                        {elections.length > 0 ? (
                          <select
                            value={candidate.electionId || ""}
                            onChange={(e) =>
                              handleFieldChange(
                                candidate.id,
                                "electionId",
                                e.target.value || null
                              )
                            }
                            disabled={!!anyLoading}
                            className="w-full px-2.5 py-1.5 text-sm border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 disabled:opacity-50"
                          >
                            <option value="">선거 미지정</option>
                            {elections.map((el) => (
                              <option key={el.id} value={el.id}>
                                {el.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <p className="text-sm text-muted px-2.5 py-1.5 border border-border rounded-lg bg-background">
                            등록된 선거 없음
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Pin location — admin sets map marker position */}
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <p className="text-xs font-medium text-muted mb-2">
                        지도 핀 위치{" "}
                        <span className="font-normal text-muted/70">(비워두면 선거구 중심으로 표시)</span>
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-muted mb-1">위도 (Lat)</label>
                          <input
                            type="number"
                            step="0.0001"
                            placeholder="예: 36.8151"
                            defaultValue={candidate.pinLat ?? ""}
                            onBlur={(e) =>
                              handleFieldChange(
                                candidate.id,
                                "pinLat",
                                e.target.value || null
                              )
                            }
                            disabled={!!anyLoading}
                            className="w-full px-2.5 py-1.5 text-sm border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 disabled:opacity-50"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-muted mb-1">경도 (Lng)</label>
                          <input
                            type="number"
                            step="0.0001"
                            placeholder="예: 127.1139"
                            defaultValue={candidate.pinLng ?? ""}
                            onBlur={(e) =>
                              handleFieldChange(
                                candidate.id,
                                "pinLng",
                                e.target.value || null
                              )
                            }
                            disabled={!!anyLoading}
                            className="w-full px-2.5 py-1.5 text-sm border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 disabled:opacity-50"
                          />
                        </div>
                      </div>
                    </div>

                    {anyLoading && (
                      <p className="text-xs text-primary mt-2 flex items-center gap-1.5">
                        <span className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin inline-block" />
                        저장 중...
                      </p>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
