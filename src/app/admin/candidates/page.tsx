"use client";

import { useState, useEffect, useCallback } from "react";
import { Button, Badge, Card } from "@/components/ui";

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
  createdAt: string;
}

type FilterTab = "pending" | "approved";

const CANDIDATE_STATUSES = ["출마예정자", "예비후보자", "후보자"];
const CAUCUS_STATUSES = ["공천 미확정", "공천 확정"];

export default function AdminCandidatesPage() {
  const [candidates, setCandidates] = useState<AdminCandidate[]>([]);
  const [elections, setElections] = useState<ElectionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("pending");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter === "pending") params.set("verified", "false");
    if (filter === "approved") params.set("verified", "true");

    try {
      const [candidatesRes, electionsRes] = await Promise.all([
        fetch(`/api/admin/candidates?${params.toString()}`),
        fetch("/api/admin/elections"),
      ]);
      const candidatesJson = await candidatesRes.json();
      const electionsJson = await electionsRes.json();
      setCandidates(candidatesJson.data ?? candidatesJson ?? []);
      setElections(electionsJson.data ?? []);
    } catch {
      console.error("Failed to fetch data");
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  const handleVerify = async (candidateId: string, verified: boolean) => {
    setActionLoading(candidateId);
    try {
      await fetch("/api/admin/candidates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId, verified }),
      });
      await fetchCandidates();
    } catch {
      alert("상태 변경에 실패했습니다.");
    }
    setActionLoading(null);
  };

  const handleStatusChange = async (
    candidateId: string,
    field: "candidateStatus" | "caucusStatus" | "electionId" | "district",
    value: string | null
  ) => {
    setActionLoading(candidateId + field);
    try {
      await fetch("/api/admin/candidates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId, [field]: value }),
      });
      await fetchCandidates();
    } catch {
      alert("상태 변경에 실패했습니다.");
    }
    setActionLoading(null);
  };

  const handleDelete = async (candidateId: string, name: string) => {
    if (!confirm(`정말로 "${name}" 후보를 삭제하시겠습니까?`)) return;
    setActionLoading(candidateId);
    try {
      await fetch(`/api/admin/candidates?id=${candidateId}`, { method: "DELETE" });
      await fetchCandidates();
    } catch {
      alert("삭제에 실패했습니다.");
    }
    setActionLoading(null);
  };

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: "pending", label: "대기중" },
    { key: "approved", label: "승인됨" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-foreground">후보 관리</h1>
        <span className="text-sm text-muted">총 {candidates.length}명</span>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              filter === tab.key
                ? "bg-primary text-white"
                : "bg-background text-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Candidates list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : candidates.length === 0 ? (
        <Card padding="lg">
          <p className="text-center text-muted py-8">
            {filter === "pending" ? "승인 대기 중인 후보가 없습니다." : "승인된 후보가 없습니다."}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {candidates.map((candidate) => (
            <Card key={candidate.id} padding="md">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground">{candidate.name}</span>
                    <Badge variant={candidate.verified ? "primary" : "muted"}>
                      {candidate.verified ? "승인됨" : "대기중"}
                    </Badge>
                    {candidate.emailVerified && (
                      <Badge variant="secondary">이메일 인증</Badge>
                    )}
                    {candidate.role === "admin" && (
                      <Badge variant="primary">관리자</Badge>
                    )}
                    <Badge variant="muted">{candidate.candidateStatus}</Badge>
                    <Badge variant={candidate.caucusStatus === "공천 확정" ? "primary" : "muted"}>
                      {candidate.caucusStatus}
                    </Badge>
                  </div>
                  <div className="mt-1 text-sm text-muted space-y-0.5">
                    <p>{candidate.email}</p>
                    <p>
                      {candidate.district} | {candidate.party}
                      {candidate.phone && ` | ${candidate.phone}`}
                    </p>
                    {candidate.election && (
                      <p>선거: {candidate.election.name}</p>
                    )}
                    <p className="text-xs">
                      가입: {new Date(candidate.createdAt).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                {candidate.role !== "admin" && (
                  <div className="flex flex-col gap-2 shrink-0">
                    <div className="flex gap-2">
                      {candidate.verified ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleVerify(candidate.id, false)}
                          disabled={actionLoading === candidate.id}
                        >
                          승인 취소
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleVerify(candidate.id, true)}
                          disabled={actionLoading === candidate.id}
                        >
                          승인
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setExpandedId(expandedId === candidate.id ? null : candidate.id)}
                      >
                        {expandedId === candidate.id ? "접기" : "상세관리"}
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDelete(candidate.id, candidate.name)}
                        disabled={actionLoading === candidate.id}
                      >
                        삭제
                      </Button>
                    </div>

                    {/* Expanded management panel */}
                    {expandedId === candidate.id && (
                      <div className="mt-2 p-3 bg-background rounded-lg space-y-2 text-sm">
                        <div>
                          <label className="block text-xs font-medium text-muted mb-1">후보 상태</label>
                          <select
                            value={candidate.candidateStatus}
                            onChange={(e) =>
                              handleStatusChange(candidate.id, "candidateStatus", e.target.value)
                            }
                            disabled={actionLoading?.startsWith(candidate.id)}
                            className="w-full px-2 py-1.5 text-sm border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20"
                          >
                            {CANDIDATE_STATUSES.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-muted mb-1">공천 상태</label>
                          <select
                            value={candidate.caucusStatus}
                            onChange={(e) =>
                              handleStatusChange(candidate.id, "caucusStatus", e.target.value)
                            }
                            disabled={actionLoading?.startsWith(candidate.id)}
                            className="w-full px-2 py-1.5 text-sm border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20"
                          >
                            {CAUCUS_STATUSES.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>
                        {elections.length > 0 && (
                          <div>
                            <label className="block text-xs font-medium text-muted mb-1">선거</label>
                            <select
                              value={candidate.electionId || ""}
                              onChange={(e) =>
                                handleStatusChange(candidate.id, "electionId", e.target.value || null)
                              }
                              disabled={actionLoading?.startsWith(candidate.id)}
                              className="w-full px-2 py-1.5 text-sm border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20"
                            >
                              <option value="">선거 미지정</option>
                              {elections.map((el) => (
                                <option key={el.id} value={el.id}>{el.name}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
