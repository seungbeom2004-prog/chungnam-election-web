"use client";

import { useState, useEffect, useCallback } from "react";
import Card from "@/components/ui/Card";

interface Proposal {
  id: string;
  title: string | null;
  authorName: string;
  content: string;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  categoryId: string | null;
  status: string;
  postType: string | null;
  candidateId: string | null;
  createdAt: string;
  candidate?: { id: string; name: string; district: string } | null;
}

interface EditForm {
  title: string;
  content: string;
  city: string;
  latitude: string;
  longitude: string;
  categoryId: string;
}

export default function AdminProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "accepted" | "hidden">("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [typeLoading, setTypeLoading] = useState<string | null>(null);

  // Edit modal state
  const [editTarget, setEditTarget] = useState<Proposal | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ title: "", content: "", city: "", latitude: "", longitude: "", categoryId: "" });
  const [editLoading, setEditLoading] = useState(false);

  // Split modal state
  const [splitTarget, setSplitTarget] = useState<Proposal | null>(null);
  const [splitIndices, setSplitIndices] = useState<Set<number>>(new Set());
  const [splitLoading, setSplitLoading] = useState(false);

  // Merge state
  const [mergeSelected, setMergeSelected] = useState<Set<string>>(new Set());
  const [mergeLoading, setMergeLoading] = useState(false);

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

  const changePostType = async (id: string, newType: "민원" | "제안") => {
    setTypeLoading(id);
    try {
      const res = await fetch(`/api/admin/proposals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postType: newType }),
      });
      if (res.ok) {
        setMessage(`종류를 "${newType === "민원" ? "불편 제보" : "공약 제안"}"으로 변경했습니다.`);
        fetchProposals();
      } else {
        setMessage("종류 변경에 실패했습니다.");
      }
    } catch {
      setMessage("네트워크 오류가 발생했습니다.");
    } finally {
      setTypeLoading(null);
    }
  };

  const openEdit = (p: Proposal) => {
    setEditTarget(p);
    setEditForm({
      title: p.title ?? "",
      content: p.content,
      city: p.city ?? "",
      latitude: p.latitude != null ? String(p.latitude) : "",
      longitude: p.longitude != null ? String(p.longitude) : "",
      categoryId: p.categoryId ?? "",
    });
  };

  const submitEdit = async () => {
    if (!editTarget) return;
    setEditLoading(true);
    try {
      const res = await fetch(`/api/admin/proposals/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editForm.title || null,
          content: editForm.content,
          city: editForm.city || null,
          latitude: editForm.latitude !== "" ? Number(editForm.latitude) : null,
          longitude: editForm.longitude !== "" ? Number(editForm.longitude) : null,
          categoryId: editForm.categoryId || null,
        }),
      });
      if (res.ok) {
        setMessage("수정되었습니다.");
        setEditTarget(null);
        fetchProposals();
      } else {
        setMessage("수정에 실패했습니다.");
      }
    } catch {
      setMessage("네트워크 오류가 발생했습니다.");
    } finally {
      setEditLoading(false);
    }
  };

  const openSplit = (p: Proposal) => {
    setSplitTarget(p);
    setSplitIndices(new Set());
  };

  const submitSplit = async () => {
    if (!splitTarget) return;
    setSplitLoading(true);
    try {
      const res = await fetch(`/api/admin/proposals/${splitTarget.id}/split`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paragraphIndices: Array.from(splitIndices) }),
      });
      const json = await res.json();
      if (res.ok) {
        setMessage(`분할 완료: ${json.created}개 생성됨`);
        setSplitTarget(null);
        fetchProposals();
      } else {
        setMessage(json.error ?? "분할에 실패했습니다.");
      }
    } catch {
      setMessage("네트워크 오류가 발생했습니다.");
    } finally {
      setSplitLoading(false);
    }
  };

  const toggleMergeSelect = (id: string) => {
    setMergeSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const submitMerge = async () => {
    if (mergeSelected.size < 2) return;
    setMergeLoading(true);
    try {
      const res = await fetch("/api/admin/proposals/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(mergeSelected) }),
      });
      const json = await res.json();
      if (res.ok) {
        setMessage(`병합 완료: ${json.mergedInto} 에 통합됨`);
        setMergeSelected(new Set());
        fetchProposals();
      } else {
        setMessage(json.error ?? "병합에 실패했습니다.");
      }
    } catch {
      setMessage("네트워크 오류가 발생했습니다.");
    } finally {
      setMergeLoading(false);
    }
  };

  const postTypeBadge = (postType: string | null) => {
    if (postType === "민원") return (
      <span className="px-2 py-0.5 text-xs font-bold rounded-full text-white" style={{ backgroundColor: "#EF4444" }}>📢 불편 제보</span>
    );
    return (
      <span className="px-2 py-0.5 text-xs font-bold rounded-full text-gray-900" style={{ backgroundColor: "#FACC15" }}>💡 공약 제안</span>
    );
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
        <div className="flex gap-2">
          {mergeSelected.size >= 2 && (
            <button
              onClick={submitMerge}
              disabled={mergeLoading}
              className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg disabled:opacity-50"
            >
              {mergeLoading ? "병합 중..." : `선택 병합 (${mergeSelected.size}개)`}
            </button>
          )}
          {mergeSelected.size > 0 && (
            <button
              onClick={() => setMergeSelected(new Set())}
              className="text-xs text-muted border border-border px-3 py-1.5 rounded-lg"
            >
              선택 해제
            </button>
          )}
          <button
            onClick={fetchProposals}
            className="text-xs text-muted hover:text-foreground px-3 py-1.5 border border-border rounded-lg"
          >
            새로고침
          </button>
        </div>
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
            <Card key={p.id} className={`p-4 ${mergeSelected.has(p.id) ? "ring-2 ring-blue-400" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  {/* Merge checkbox */}
                  <input
                    type="checkbox"
                    checked={mergeSelected.has(p.id)}
                    onChange={() => toggleMergeSelect(p.id)}
                    className="mt-1 shrink-0"
                    title="병합 선택"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {postTypeBadge(p.postType)}
                      {statusLabel(p.status)}
                      <span className="text-xs text-muted">
                        {p.candidate ? `→ ${p.candidate.name} (${p.candidate.district})` : ""}
                      </span>
                      <span className="text-xs text-muted">{new Date(p.createdAt).toLocaleDateString("ko-KR")}</span>
                    </div>
                    <p className="text-sm font-semibold text-foreground">{p.title || p.authorName}</p>
                    {p.title && <p className="text-xs text-muted">작성자: {p.authorName}</p>}
                    <p className="text-sm text-muted mt-1 break-words line-clamp-3">{p.content}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  {/* Edit + Split buttons */}
                  <button
                    onClick={() => openEdit(p)}
                    className="px-2.5 py-1 text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
                  >
                    ✏️ 수정
                  </button>
                  <button
                    onClick={() => openSplit(p)}
                    className="px-2.5 py-1 text-xs bg-orange-50 text-orange-700 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
                  >
                    ✂️ 분할
                  </button>

                  {p.status !== "deleted" && (
                    <>
                      {/* 종류 변경 — 후보자가 단 공약 제안(candidateId 있는 제안)은 삭제만 */}
                      {!(p.postType === "제안" && p.candidateId) && (
                        <button
                          onClick={() => changePostType(p.id, p.postType === "민원" ? "제안" : "민원")}
                          disabled={typeLoading === p.id}
                          className="px-2.5 py-1 text-xs border rounded-lg hover:opacity-80 transition-colors disabled:opacity-50"
                          style={p.postType === "민원"
                            ? { backgroundColor: "#FEF9C3", color: "#B45309", borderColor: "#FDE68A" }
                            : { backgroundColor: "#FEF2F2", color: "#EF4444", borderColor: "#FCA5A5" }
                          }
                        >
                          {typeLoading === p.id ? "변경 중..." : p.postType === "민원" ? "→ 공약 제안" : "→ 불편 제보"}
                        </button>
                      )}
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
                      {p.status === "pending" && !(p.postType === "제안" && p.candidateId) && (
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

      {/* ── Edit Modal ─────────────────────────────────────────────────── */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="font-bold text-foreground">게시물 수정</h2>
              <button onClick={() => setEditTarget(null)} className="text-muted text-xl leading-none">×</button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs font-medium text-muted block mb-1">제목</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted block mb-1">내용</label>
                <textarea
                  value={editForm.content}
                  onChange={(e) => setEditForm((f) => ({ ...f, content: e.target.value }))}
                  rows={6}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg resize-y"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted block mb-1">도시</label>
                <input
                  type="text"
                  value={editForm.city}
                  onChange={(e) => setEditForm((f) => ({ ...f, city: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs font-medium text-muted block mb-1">위도</label>
                  <input
                    type="number"
                    step="any"
                    value={editForm.latitude}
                    onChange={(e) => setEditForm((f) => ({ ...f, latitude: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium text-muted block mb-1">경도</label>
                  <input
                    type="number"
                    step="any"
                    value={editForm.longitude}
                    onChange={(e) => setEditForm((f) => ({ ...f, longitude: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted block mb-1">카테고리 ID</label>
                <input
                  type="text"
                  placeholder="카테고리 ID"
                  value={editForm.categoryId}
                  onChange={(e) => setEditForm((f) => ({ ...f, categoryId: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg"
                />
              </div>
            </div>
            <div className="flex gap-2 px-5 py-4 border-t">
              <button
                onClick={submitEdit}
                disabled={editLoading}
                className="flex-1 px-4 py-2 text-sm font-semibold bg-primary text-white rounded-lg disabled:opacity-50"
              >
                {editLoading ? "저장 중..." : "저장"}
              </button>
              <button
                onClick={() => setEditTarget(null)}
                className="px-4 py-2 text-sm border border-border rounded-lg"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Split Modal ────────────────────────────────────────────────── */}
      {splitTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="font-bold text-foreground">게시물 분할</h2>
              <button onClick={() => setSplitTarget(null)} className="text-muted text-xl leading-none">×</button>
            </div>
            <div className="p-5">
              <p className="text-xs text-muted mb-3">분할 시작 위치의 단락을 선택하세요 (1개 이상)</p>
              <div className="space-y-2">
                {splitTarget.content.split(/\n\n+/).map((para, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border cursor-pointer transition-colors ${
                      idx === 0
                        ? "border-border/40 bg-gray-50"
                        : splitIndices.has(idx)
                          ? "border-orange-400 bg-orange-50"
                          : "border-border hover:border-orange-300 hover:bg-orange-50/50"
                    }`}
                    onClick={() => {
                      if (idx === 0) return; // first paragraph cannot be a split point
                      setSplitIndices((prev) => {
                        const next = new Set(prev);
                        if (next.has(idx)) next.delete(idx); else next.add(idx);
                        return next;
                      });
                    }}
                  >
                    <div className="flex items-start gap-2">
                      {idx > 0 && (
                        <input
                          type="checkbox"
                          readOnly
                          checked={splitIndices.has(idx)}
                          className="mt-0.5 shrink-0"
                        />
                      )}
                      <p className="text-xs text-foreground whitespace-pre-wrap break-words flex-1">{para}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2 px-5 py-4 border-t">
              <button
                onClick={submitSplit}
                disabled={splitLoading || splitIndices.size < 1}
                className="flex-1 px-4 py-2 text-sm font-semibold bg-orange-500 text-white rounded-lg disabled:opacity-50"
              >
                {splitLoading ? "분할 중..." : `분할 (${splitIndices.size + 1}개 생성)`}
              </button>
              <button
                onClick={() => setSplitTarget(null)}
                className="px-4 py-2 text-sm border border-border rounded-lg"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
