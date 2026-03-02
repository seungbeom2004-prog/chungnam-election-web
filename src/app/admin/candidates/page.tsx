"use client";

import { useState, useEffect, useCallback } from "react";
import { Button, Badge, Card } from "@/components/ui";

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
  createdAt: string;
}

type FilterTab = "all" | "pending" | "approved";

export default function AdminCandidatesPage() {
  const [candidates, setCandidates] = useState<AdminCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter === "pending") params.set("verified", "false");
    if (filter === "approved") params.set("verified", "true");

    try {
      const res = await fetch(`/api/admin/candidates?${params.toString()}`);
      const json = await res.json();
      setCandidates(json.data ?? json ?? []);
    } catch {
      console.error("Failed to fetch candidates");
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

  const handleDelete = async (candidateId: string, name: string) => {
    if (!confirm(`정말로 "${name}" 후보를 삭제하시겠습니까?`)) return;
    setActionLoading(candidateId);
    try {
      await fetch(`/api/admin/candidates?id=${candidateId}`, {
        method: "DELETE",
      });
      await fetchCandidates();
    } catch {
      alert("삭제에 실패했습니다.");
    }
    setActionLoading(null);
  };

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "전체" },
    { key: "pending", label: "대기중" },
    { key: "approved", label: "승인됨" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-foreground">후보 관리</h1>
        <span className="text-sm text-muted">
          총 {candidates.length}명
        </span>
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
            {filter === "pending"
              ? "승인 대기 중인 후보가 없습니다."
              : filter === "approved"
              ? "승인된 후보가 없습니다."
              : "등록된 후보가 없습니다."}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {candidates.map((candidate) => (
            <Card key={candidate.id} padding="md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground">
                      {candidate.name}
                    </span>
                    <Badge
                      variant={candidate.verified ? "primary" : "muted"}
                    >
                      {candidate.verified ? "승인됨" : "대기중"}
                    </Badge>
                    {candidate.emailVerified && (
                      <Badge variant="secondary">이메일 인증됨</Badge>
                    )}
                    {candidate.role === "admin" && (
                      <Badge variant="primary">관리자</Badge>
                    )}
                  </div>
                  <div className="mt-1 text-sm text-muted space-y-0.5">
                    <p>{candidate.email}</p>
                    <p>
                      {candidate.district} | {candidate.party}
                      {candidate.phone && ` | ${candidate.phone}`}
                    </p>
                    <p className="text-xs">
                      가입:{" "}
                      {new Date(candidate.createdAt).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                {candidate.role !== "admin" && (
                  <div className="flex gap-2 shrink-0">
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
                      variant="danger"
                      onClick={() =>
                        handleDelete(candidate.id, candidate.name)
                      }
                      disabled={actionLoading === candidate.id}
                    >
                      삭제
                    </Button>
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
