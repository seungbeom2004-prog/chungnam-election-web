"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Card from "@/components/ui/Card";

const LocationPickerMap = dynamic(() => import("@/components/proposals/LocationPickerMap"), { ssr: false });

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
  adminStatus: string | null;
  parentId: string | null;
  issueId: string | null;
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

const ADMIN_STATUS_STEPS = [
  { value: null, label: "검토중", color: "bg-gray-100 text-gray-600 border-gray-300" },
  { value: "planned", label: "공약 제안", color: "bg-blue-100 text-blue-700 border-blue-300" },
  { value: "adopted", label: "공약 반영 완료", color: "bg-green-100 text-green-700 border-green-300" },
];

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

  // Admin status state
  const [adminStatusLoading, setAdminStatusLoading] = useState<string | null>(null);

  // Anonymize state
  const [anonymizeLoading, setAnonymizeLoading] = useState<string | null>(null);

  // Link modal state
  const [linkTarget, setLinkTarget] = useState<Proposal | null>(null);
  const [linkSearch, setLinkSearch] = useState("");
  const [linkLoading, setLinkLoading] = useState(false);

  // Issue assignment state
  const [issues, setIssues] = useState<{id: string; title: string; category: string | null; reportCount: number}[]>([]);
  const [issueModalTarget, setIssueModalTarget] = useState<Proposal | null>(null);
  const [issueAssignLoading, setIssueAssignLoading] = useState(false);

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

  useEffect(() => {
    fetch("/api/admin/issues").then(r => r.json()).then(json => setIssues(json.data ?? [])).catch(() => {});
  }, []);

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 4000);
  };

  const updateStatus = async (id: string, status: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/proposals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        showMessage(status === "deleted" ? "삭제되었습니다." : status === "hidden" ? "숨김 처리되었습니다." : "복원되었습니다.");
        fetchProposals();
      } else {
        showMessage("처리에 실패했습니다.");
      }
    } catch {
      showMessage("네트워크 오류가 발생했습니다.");
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
        showMessage(`종류를 "${newType === "민원" ? "불편 제보" : "공약 제안"}"으로 변경했습니다.`);
        fetchProposals();
      } else {
        showMessage("종류 변경에 실패했습니다.");
      }
    } catch {
      showMessage("네트워크 오류가 발생했습니다.");
    } finally {
      setTypeLoading(null);
    }
  };

  const updateAdminStatus = async (id: string, adminStatus: string | null) => {
    setAdminStatusLoading(id);
    try {
      const res = await fetch(`/api/admin/proposals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminStatus }),
      });
      if (res.ok) {
        const step = ADMIN_STATUS_STEPS.find(s => s.value === adminStatus);
        showMessage(`처리 단계를 "${step?.label ?? "검토중"}"으로 변경했습니다.`);
        setProposals(prev => prev.map(p => p.id === id ? { ...p, adminStatus } : p));
      } else {
        showMessage("단계 변경에 실패했습니다.");
      }
    } catch {
      showMessage("네트워크 오류가 발생했습니다.");
    } finally {
      setAdminStatusLoading(null);
    }
  };

  const anonymizePost = async (id: string) => {
    setAnonymizeLoading(id);
    try {
      const res = await fetch(`/api/admin/proposals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anonymize: true }),
      });
      if (res.ok) {
        showMessage("익명으로 변환되었습니다.");
        fetchProposals();
      } else {
        showMessage("익명 변환에 실패했습니다.");
      }
    } catch {
      showMessage("네트워크 오류가 발생했습니다.");
    } finally {
      setAnonymizeLoading(null);
    }
  };

  const submitLink = async (postId: string, targetParentId: string | null) => {
    setLinkLoading(true);
    try {
      const res = await fetch(`/api/admin/proposals/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentId: targetParentId }),
      });
      if (res.ok) {
        showMessage(targetParentId ? "연결되었습니다." : "연결이 해제되었습니다.");
        setLinkTarget(null);
        fetchProposals();
      } else {
        const json = await res.json();
        showMessage(json.error ?? "연결에 실패했습니다.");
      }
    } catch {
      showMessage("네트워크 오류가 발생했습니다.");
    } finally {
      setLinkLoading(false);
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
        showMessage("수정되었습니다.");
        setEditTarget(null);
        fetchProposals();
      } else {
        showMessage("수정에 실패했습니다.");
      }
    } catch {
      showMessage("네트워크 오류가 발생했습니다.");
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
        showMessage(`분할 완료: ${json.created}개 생성됨`);
        setSplitTarget(null);
        fetchProposals();
      } else {
        showMessage(json.error ?? "분할에 실패했습니다.");
      }
    } catch {
      showMessage("네트워크 오류가 발생했습니다.");
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
        showMessage(`병합 완료: ${json.mergedInto} 에 통합됨`);
        setMergeSelected(new Set());
        fetchProposals();
      } else {
        showMessage(json.error ?? "병합에 실패했습니다.");
      }
    } catch {
      showMessage("네트워크 오류가 발생했습니다.");
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

  const adminStatusBadge = (adminStatus: string | null) => {
    if (!adminStatus || adminStatus === "reviewed") return null;
    if (adminStatus === "planned") return <span className="px-1.5 py-0.5 text-[10px] bg-blue-100 text-blue-700 rounded-full border border-blue-200">📋 공약 제안</span>;
    if (adminStatus === "adopted") return <span className="px-1.5 py-0.5 text-[10px] bg-green-100 text-green-700 rounded-full border border-green-200">✅ 공약 반영 완료</span>;
    if (adminStatus === "rejected") return <span className="px-1.5 py-0.5 text-[10px] bg-red-100 text-red-600 rounded-full border border-red-200">🚫 반영 불가</span>;
    return null;
  };

  // Filter proposals for link modal (exclude current and same-parent links)
  const linkableProposals = linkTarget
    ? proposals.filter(p => p.id !== linkTarget.id && p.status !== "deleted")
    : [];

  const filteredLinkable = linkSearch
    ? linkableProposals.filter(p =>
        (p.title ?? "").toLowerCase().includes(linkSearch.toLowerCase()) ||
        p.content.toLowerCase().includes(linkSearch.toLowerCase()) ||
        p.authorName.toLowerCase().includes(linkSearch.toLowerCase())
      )
    : linkableProposals;

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
                      {adminStatusBadge(p.adminStatus)}
                      {p.parentId && (
                        <span className="px-1.5 py-0.5 text-[10px] bg-teal-50 text-teal-700 rounded-full border border-teal-200">
                          🔗 연결됨
                        </span>
                      )}
                      {p.issueId && (
                        <span className="px-1.5 py-0.5 text-[10px] bg-amber-50 text-amber-700 rounded-full border border-amber-200">
                          🏷️ {issues.find(i => i.id === p.issueId)?.title ?? "이슈"}
                        </span>
                      )}
                      <span className="text-xs text-muted">
                        {p.candidate ? `→ ${p.candidate.name} (${p.candidate.district})` : ""}
                      </span>
                      <span className="text-xs text-muted">{new Date(p.createdAt).toLocaleDateString("ko-KR")}</span>
                    </div>
                    <p className="text-sm font-semibold text-foreground">{p.title || p.authorName}</p>
                    {p.title && <p className="text-xs text-muted">작성자: {p.authorName}</p>}
                    <p className="text-sm text-muted mt-1 break-words line-clamp-3">{p.content}</p>

                    {/* Admin status step selector */}
                    <div className="flex items-center gap-1 mt-2 flex-wrap">
                      <span className="text-[10px] text-muted mr-1">처리 단계:</span>
                      {ADMIN_STATUS_STEPS.map((step) => (
                        <button
                          key={String(step.value)}
                          onClick={() => updateAdminStatus(p.id, step.value)}
                          disabled={adminStatusLoading === p.id}
                          className={`px-1.5 py-0.5 text-[10px] rounded-full border transition-colors disabled:opacity-50 ${
                            (p.adminStatus ?? null) === step.value
                              ? step.color + " font-bold"
                              : "bg-white border-border text-muted hover:border-gray-400"
                          }`}
                        >
                          {step.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  {/* Edit + Split + Link buttons */}
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
                  <button
                    onClick={() => { setLinkTarget(p); setLinkSearch(""); }}
                    className={`px-2.5 py-1 text-xs border rounded-lg transition-colors ${
                      p.parentId
                        ? "bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100"
                        : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    {p.parentId ? "🔗 연결됨" : "🔗 연결"}
                  </button>
                  <button
                    onClick={() => setIssueModalTarget(p)}
                    className={`px-2.5 py-1 text-xs border rounded-lg transition-colors ${
                      p.issueId
                        ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                        : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    {p.issueId ? "🏷️ 이슈" : "🏷️ 이슈 배정"}
                  </button>

                  {p.status !== "deleted" && (
                    <>
                      {/* 익명 변환 (후보자 게시글만) */}
                      {p.candidateId && (
                        <button
                          onClick={() => { if (confirm("후보자 정보를 삭제하고 익명으로 변환하시겠습니까?")) anonymizePost(p.id); }}
                          disabled={anonymizeLoading === p.id}
                          className="px-2.5 py-1 text-xs bg-purple-50 text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-50"
                        >
                          {anonymizeLoading === p.id ? "..." : "👤 익명"}
                        </button>
                      )}

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
              <div>
                <label className="text-xs font-medium text-muted block mb-1">
                  위치 📍 <span className="font-normal text-muted">(지도 클릭으로 선택)</span>
                </label>
                <LocationPickerMap
                  lat={editForm.latitude !== "" ? Number(editForm.latitude) : null}
                  lng={editForm.longitude !== "" ? Number(editForm.longitude) : null}
                  onChange={(lat, lng) => setEditForm((f) => ({ ...f, latitude: String(lat), longitude: String(lng) }))}
                />
                {editForm.latitude && editForm.longitude ? (
                  <p className="text-[11px] text-muted mt-1 flex items-center gap-1">
                    위도 {Number(editForm.latitude).toFixed(6)}, 경도 {Number(editForm.longitude).toFixed(6)}
                    <button
                      type="button"
                      onClick={() => setEditForm((f) => ({ ...f, latitude: "", longitude: "" }))}
                      className="ml-1 text-red-500 hover:underline"
                    >
                      위치 삭제
                    </button>
                  </p>
                ) : (
                  <p className="text-[11px] text-muted mt-1">위치가 설정되지 않았습니다.</p>
                )}
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
                      if (idx === 0) return;
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

      {/* ── Link Modal ─────────────────────────────────────────────────── */}
      {linkTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="font-bold text-foreground">게시물 연결</h2>
              <button onClick={() => setLinkTarget(null)} className="text-muted text-xl leading-none">×</button>
            </div>
            <div className="p-5 space-y-3 flex-1 overflow-y-auto">
              {/* Target post info */}
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-muted mb-0.5">연결 설정할 게시물</p>
                <p className="text-xs font-semibold text-foreground line-clamp-2">{linkTarget.title || linkTarget.content.slice(0, 60)}</p>
                {linkTarget.parentId && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] text-muted">현재 연결:</span>
                    <code className="text-[10px] bg-white border border-border px-1.5 py-0.5 rounded font-mono">{linkTarget.parentId.slice(0, 12)}…</code>
                    <button
                      onClick={() => submitLink(linkTarget.id, null)}
                      disabled={linkLoading}
                      className="text-[10px] text-red-500 hover:underline disabled:opacity-50"
                    >
                      연결 해제
                    </button>
                  </div>
                )}
              </div>

              <p className="text-xs text-muted">이 게시물을 연결할 부모 게시물을 선택하세요.</p>

              <input
                type="text"
                placeholder="제목, 내용, 작성자 검색..."
                value={linkSearch}
                onChange={(e) => setLinkSearch(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg"
                autoFocus
              />

              <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
                {filteredLinkable.length === 0 ? (
                  <p className="text-xs text-muted text-center py-4">게시물이 없습니다</p>
                ) : (
                  filteredLinkable.slice(0, 30).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => submitLink(linkTarget.id, p.id)}
                      disabled={linkLoading}
                      className={`w-full text-left px-3 py-2.5 rounded-xl border transition-colors disabled:opacity-50 ${
                        linkTarget.parentId === p.id
                          ? "border-teal-400 bg-teal-50"
                          : "border-border hover:border-primary hover:bg-primary/5"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className={`shrink-0 mt-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white ${p.postType === "민원" ? "bg-red-500" : "bg-amber-500"}`}>
                          {p.postType === "민원" ? "제보" : "제안"}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground line-clamp-1">{p.title || p.content.slice(0, 50)}</p>
                          <p className="text-[10px] text-muted mt-0.5">{p.authorName} · {new Date(p.createdAt).toLocaleDateString("ko-KR")}</p>
                        </div>
                        {linkTarget.parentId === p.id && (
                          <span className="text-[10px] text-teal-600 font-semibold shrink-0">현재 연결</span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
            <div className="px-5 py-3 border-t">
              <button
                onClick={() => setLinkTarget(null)}
                className="w-full px-4 py-2 text-sm border border-border rounded-lg text-muted hover:text-foreground"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Issue Assignment Modal ─────────────────────────────────── */}
      {issueModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="font-bold text-foreground">이슈 배정</h2>
              <button onClick={() => setIssueModalTarget(null)} className="text-muted text-xl leading-none">×</button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-xs text-muted">게시물: <strong>{issueModalTarget.title || issueModalTarget.content.slice(0, 30)}</strong></p>
              {issueModalTarget.issueId && (
                <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg border border-amber-200">
                  <span className="text-xs text-amber-700">현재 이슈: {issues.find(i => i.id === issueModalTarget.issueId)?.title ?? issueModalTarget.issueId}</span>
                  <button
                    onClick={async () => {
                      setIssueAssignLoading(true);
                      try {
                        await fetch(`/api/admin/issues/${issueModalTarget.issueId}/assign`, {
                          method: "DELETE",
                          headers: {"Content-Type": "application/json"},
                          body: JSON.stringify({ postIds: [issueModalTarget.id] })
                        });
                        showMessage("이슈 배정이 해제되었습니다.");
                        setIssueModalTarget(null);
                        fetchProposals();
                        fetch("/api/admin/issues").then(r => r.json()).then(json => setIssues(json.data ?? []));
                      } catch { showMessage("오류가 발생했습니다."); }
                      finally { setIssueAssignLoading(false); }
                    }}
                    disabled={issueAssignLoading}
                    className="text-xs text-red-500 hover:underline"
                  >
                    해제
                  </button>
                </div>
              )}
              <div className="space-y-1.5">
                {issues.map(issue => (
                  <button
                    key={issue.id}
                    onClick={async () => {
                      setIssueAssignLoading(true);
                      try {
                        await fetch(`/api/admin/issues/${issue.id}/assign`, {
                          method: "POST",
                          headers: {"Content-Type": "application/json"},
                          body: JSON.stringify({ postIds: [issueModalTarget.id] })
                        });
                        showMessage(`"${issue.title}" 이슈에 배정되었습니다.`);
                        setIssueModalTarget(null);
                        fetchProposals();
                        fetch("/api/admin/issues").then(r => r.json()).then(json => setIssues(json.data ?? []));
                      } catch { showMessage("오류가 발생했습니다."); }
                      finally { setIssueAssignLoading(false); }
                    }}
                    disabled={issueAssignLoading}
                    className={`w-full text-left p-2.5 rounded-lg border transition-colors hover:bg-gray-50 ${
                      issueModalTarget.issueId === issue.id ? "border-amber-400 bg-amber-50" : "border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">{issue.title}</span>
                      <span className="text-xs text-muted">{issue.reportCount}건</span>
                    </div>
                    {issue.category && <span className="text-[10px] text-muted">{issue.category}</span>}
                  </button>
                ))}
                {issues.length === 0 && <p className="text-xs text-muted text-center py-4">등록된 이슈가 없습니다. 이슈 관리에서 먼저 이슈를 만들어주세요.</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
