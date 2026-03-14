"use client";

import { useState, useEffect, useCallback } from "react";
import Card from "@/components/ui/Card";

interface Proposal {
  id: string;
  authorName: string;
  content: string;
  city: string | null;
  status: string;
  createdAt: string;
  candidate?: { id: string; name: string; district: string } | null;
}

export default function AdminProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "accepted" | "hidden">("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const fetchProposals = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (filter !== "all") params.set("status", filter);
      const res = await fetch(`/api/admin/proposals?${params}`);
      const json = await res.json();
      setProposals(json.data ?? []);
    } catch {
      setMessage("불러오기에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  const updateStatus = async (id: string, status: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/proposals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setMessage(status === "deleted" ? "삭제되었습니다." : status === "hidden" ? "숨김 처리되었습니다." : "복원되었습니다.");
        fetchProposals();
      } else {
        setMessage("처리에 실패했습니다.");
      }
    } catch {
      setMessage("네트워크 오류가 발생했습니다.");
    } finally {
      setActionLoading(null);
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "pending": return <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded-full">검토 중</span>;
      case "accepted": return <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">채택됨</span>;
      case "hidden": return <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded-full">숨김</span>;
      case "deleted": return <span className="px-2 py-0.5 text-xs bg-red-100 text-red-600 rounded-full">삭제됨</span>;
      default: return <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded-full">{status}</span>;
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-foreground">게시판 관리</h1>
        <button
          onClick={fetchProposals}
          className="text-xs text-muted hover:text-foreground px-3 py-1.5 border border-border rounded-lg"
        >
          새로고침
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(["all", "pending", "accepted", "hidden"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              filter === s
                ? "bg-primary text-white border-primary"
                : "border-border text-muted hover:text-foreground"
            }`}
          >
            {s === "all" ? "전체" : s === "pending" ? "검토 중" : s === "accepted" ? "채택됨" : "숨김"}
          </button>
        ))}
      </div>

      {message && (
        <p className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg mb-4">{message}</p>
      )}

      {loading ? (
        <p className="text-muted text-sm">불러오는 중...</p>
      ) : proposals.length === 0 ? (
        <p className="text-muted text-sm">게시물이 없습니다.</p>
      ) : (
        <div className="space-y-3">
          {proposals.map((p) => (
            <Card key={p.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {statusLabel(p.status)}
                    <span className="text-xs text-muted">
                      {p.candidate ? `${p.candidate.name} (${p.candidate.district})` : "후보자 없음"}
                    </span>
                    <span className="text-xs text-muted">{new Date(p.createdAt).toLocaleDateString("ko-KR")}</span>
                  </div>
                  <p className="text-sm font-medium text-foreground">{p.authorName}</p>
                  <p className="text-sm text-muted mt-1 break-words">{p.content}</p>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  {p.status !== "deleted" && (
                    <>
                      {p.status === "hidden" ? (
                        <button
                          onClick={() => updateStatus(p.id, "pending")}
                          disabled={actionLoading === p.id}
                          className="px-2.5 py-1 text-xs bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
                        >
                          복원
                        </button>
                      ) : (
                        <button
                          onClick={() => updateStatus(p.id, "hidden")}
                          disabled={actionLoading === p.id}
                          className="px-2.5 py-1 text-xs bg-gray-50 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                        >
                          숨김
                        </button>
                      )}
                      {p.status === "pending" && (
                        <button
                          onClick={() => updateStatus(p.id, "accepted")}
                          disabled={actionLoading === p.id}
                          className="px-2.5 py-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                        >
                          채택
                        </button>
                      )}
                      <button
                        onClick={() => { if (confirm("정말 삭제하시겠습니까?")) updateStatus(p.id, "deleted"); }}
                        disabled={actionLoading === p.id}
                        className="px-2.5 py-1 text-xs bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                      >
                        삭제
                      </button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
