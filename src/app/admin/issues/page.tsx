"use client";

import { useState, useEffect, useCallback } from "react";
import Card from "@/components/ui/Card";
import { CHUNGNAM_DISTRICTS } from "@/lib/districts";

interface Issue {
  id: string;
  title: string;
  summary: string | null;
  category: string | null;
  city: string | null;
  dong: string | null;
  reportCount: number;
  status: string;
  adminStatus: string | null;
  assignedPosts?: { id: string; title: string | null; content: string; authorName: string }[];
  createdAt: string;
}

interface Post {
  id: string;
  title: string | null;
  content: string;
  authorName: string;
  createdAt: string;
}

const CATEGORIES = ["교통", "안전", "교육", "복지", "경제", "환경", "문화", "기타"] as const;

const CATEGORY_COLORS: Record<string, string> = {
  교통: "bg-blue-100 text-blue-700 border-blue-200",
  안전: "bg-red-100 text-red-700 border-red-200",
  교육: "bg-purple-100 text-purple-700 border-purple-200",
  복지: "bg-green-100 text-green-700 border-green-200",
  경제: "bg-yellow-100 text-yellow-700 border-yellow-200",
  환경: "bg-emerald-100 text-emerald-700 border-emerald-200",
  문화: "bg-pink-100 text-pink-700 border-pink-200",
  기타: "bg-gray-100 text-gray-600 border-gray-200",
};

const ADMIN_STATUS_STEPS = [
  { value: null, label: "검토중", color: "bg-gray-100 text-gray-600 border-gray-300" },
  { value: "planned", label: "공약 제안", color: "bg-blue-100 text-blue-700 border-blue-300" },
  { value: "adopted", label: "공약 반영 완료", color: "bg-green-100 text-green-700 border-green-300" },
];

export default function AdminIssuesPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "resolved" | "archived">("all");
  const [message, setMessage] = useState("");

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ title: "", summary: "", category: "", city: "", dong: "" });
  const [createLoading, setCreateLoading] = useState(false);

  // Edit modal
  const [editTarget, setEditTarget] = useState<Issue | null>(null);
  const [editForm, setEditForm] = useState({ title: "", summary: "", category: "", city: "", dong: "", status: "" });
  const [editLoading, setEditLoading] = useState(false);

  // Admin status
  const [adminStatusLoading, setAdminStatusLoading] = useState<string | null>(null);

  // Assign posts
  const [assignTarget, setAssignTarget] = useState<Issue | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [postSearch, setPostSearch] = useState("");
  const [postsLoading, setPostsLoading] = useState(false);
  const [assignLoading, setAssignLoading] = useState<string | null>(null);

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 4000);
  };

  const fetchIssues = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/issues");
      const json = await res.json();
      let data: Issue[] = json.data ?? json ?? [];
      // Filter
      if (filter !== "all") {
        data = data.filter((i) => i.status === filter);
      }
      // Sort by reportCount desc
      data.sort((a, b) => (b.reportCount ?? 0) - (a.reportCount ?? 0));
      setIssues(data);
    } catch {
      showMessage("불러오기에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  // Fetch posts for assign section
  const fetchPosts = async () => {
    setPostsLoading(true);
    try {
      const res = await fetch("/api/admin/proposals?limit=100");
      const json = await res.json();
      setPosts(json.data ?? []);
    } catch {
      showMessage("게시물을 불러오지 못했습니다.");
    } finally {
      setPostsLoading(false);
    }
  };

  // ── Create Issue ──────────────────────────────────────────────────
  const submitCreate = async () => {
    if (!createForm.title.trim()) {
      showMessage("제목을 입력하세요.");
      return;
    }
    setCreateLoading(true);
    try {
      const res = await fetch("/api/admin/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: createForm.title,
          summary: createForm.summary || null,
          category: createForm.category || null,
          city: createForm.city || null,
          dong: createForm.dong || null,
        }),
      });
      if (res.ok) {
        showMessage("이슈가 생성되었습니다.");
        setShowCreate(false);
        setCreateForm({ title: "", summary: "", category: "", city: "", dong: "" });
        fetchIssues();
      } else {
        const json = await res.json();
        showMessage(json.error ?? "생성에 실패했습니다.");
      }
    } catch {
      showMessage("네트워크 오류가 발생했습니다.");
    } finally {
      setCreateLoading(false);
    }
  };

  // ── Edit Issue ────────────────────────────────────────────────────
  const openEdit = (issue: Issue) => {
    setEditTarget(issue);
    setEditForm({
      title: issue.title,
      summary: issue.summary ?? "",
      category: issue.category ?? "",
      city: issue.city ?? "",
      dong: issue.dong ?? "",
      status: issue.status,
    });
    // Also load assign section
    setAssignTarget(issue);
    fetchPosts();
  };

  const submitEdit = async () => {
    if (!editTarget) return;
    setEditLoading(true);
    try {
      const res = await fetch(`/api/admin/issues/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editForm.title,
          summary: editForm.summary || null,
          category: editForm.category || null,
          city: editForm.city || null,
          dong: editForm.dong || null,
          status: editForm.status,
        }),
      });
      if (res.ok) {
        showMessage("수정되었습니다.");
        setEditTarget(null);
        setAssignTarget(null);
        fetchIssues();
      } else {
        const json = await res.json();
        showMessage(json.error ?? "수정에 실패했습니다.");
      }
    } catch {
      showMessage("네트워크 오류가 발생했습니다.");
    } finally {
      setEditLoading(false);
    }
  };

  // ── Admin Status ──────────────────────────────────────────────────
  const updateAdminStatus = async (id: string, adminStatus: string | null) => {
    setAdminStatusLoading(id);
    try {
      const res = await fetch(`/api/admin/issues/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminStatus }),
      });
      if (res.ok) {
        const step = ADMIN_STATUS_STEPS.find((s) => s.value === adminStatus);
        showMessage(`처리 단계를 "${step?.label ?? "검토중"}"으로 변경했습니다.`);
        setIssues((prev) => prev.map((i) => (i.id === id ? { ...i, adminStatus } : i)));
      } else {
        showMessage("단계 변경에 실패했습니다.");
      }
    } catch {
      showMessage("네트워크 오류가 발생했습니다.");
    } finally {
      setAdminStatusLoading(null);
    }
  };

  // ── Assign / Unassign Posts ───────────────────────────────────────
  const assignPost = async (postId: string) => {
    if (!assignTarget) return;
    setAssignLoading(postId);
    try {
      const res = await fetch(`/api/admin/issues/${assignTarget.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postIds: [postId] }),
      });
      if (res.ok) {
        showMessage("게시물이 배정되었습니다.");
        // Refresh issue data
        const issueRes = await fetch("/api/admin/issues");
        const issueJson = await issueRes.json();
        const allIssues: Issue[] = issueJson.data ?? issueJson ?? [];
        const updated = allIssues.find((i) => i.id === assignTarget.id);
        if (updated) {
          setAssignTarget(updated);
          setIssues((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
        }
      } else {
        const json = await res.json();
        showMessage(json.error ?? "배정에 실패했습니다.");
      }
    } catch {
      showMessage("네트워크 오류가 발생했습니다.");
    } finally {
      setAssignLoading(null);
    }
  };

  const unassignPost = async (postId: string) => {
    if (!assignTarget) return;
    setAssignLoading(postId);
    try {
      const res = await fetch(`/api/admin/issues/${assignTarget.id}/assign`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postIds: [postId] }),
      });
      if (res.ok) {
        showMessage("배정이 해제되었습니다.");
        const issueRes = await fetch("/api/admin/issues");
        const issueJson = await issueRes.json();
        const allIssues: Issue[] = issueJson.data ?? issueJson ?? [];
        const updated = allIssues.find((i) => i.id === assignTarget.id);
        if (updated) {
          setAssignTarget(updated);
          setIssues((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
        }
      } else {
        const json = await res.json();
        showMessage(json.error ?? "해제에 실패했습니다.");
      }
    } catch {
      showMessage("네트워크 오류가 발생했습니다.");
    } finally {
      setAssignLoading(null);
    }
  };

  const assignedPostIds = new Set(assignTarget?.assignedPosts?.map((p) => p.id) ?? []);

  const filteredPosts = postSearch
    ? posts.filter(
        (p) =>
          !assignedPostIds.has(p.id) &&
          ((p.title ?? "").toLowerCase().includes(postSearch.toLowerCase()) ||
            p.content.toLowerCase().includes(postSearch.toLowerCase()))
      )
    : [];

  const categoryBadge = (category: string | null) => {
    if (!category) return null;
    const color = CATEGORY_COLORS[category] ?? CATEGORY_COLORS["기타"];
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${color}`}>
        {category}
      </span>
    );
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "active":
        return <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">active</span>;
      case "resolved":
        return <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">resolved</span>;
      case "archived":
        return <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded-full">archived</span>;
      default:
        return <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded-full">{status}</span>;
    }
  };

  const adminStatusBadge = (adminStatus: string | null) => {
    if (!adminStatus || adminStatus === "reviewed") return null;
    if (adminStatus === "planned")
      return (
        <span className="px-1.5 py-0.5 text-[10px] bg-blue-100 text-blue-700 rounded-full border border-blue-200">
          공약 제안
        </span>
      );
    if (adminStatus === "adopted")
      return (
        <span className="px-1.5 py-0.5 text-[10px] bg-green-100 text-green-700 rounded-full border border-green-200">
          공약 반영 완료
        </span>
      );
    return null;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-foreground">이슈 관리</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreate(true)}
            className="text-xs bg-primary text-white px-3 py-1.5 rounded-lg"
          >
            새 이슈 만들기
          </button>
          <button
            onClick={fetchIssues}
            className="text-xs text-muted hover:text-foreground px-3 py-1.5 border border-border rounded-lg"
          >
            새로고침
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(["all", "active", "resolved", "archived"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              filter === s
                ? "bg-primary text-white border-primary"
                : "border-border text-muted hover:text-foreground"
            }`}
          >
            {s === "all" ? "전체" : s}
          </button>
        ))}
      </div>

      {message && (
        <p className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg mb-4">{message}</p>
      )}

      {loading ? (
        <p className="text-muted text-sm">불러오는 중...</p>
      ) : issues.length === 0 ? (
        <p className="text-muted text-sm">이슈가 없습니다.</p>
      ) : (
        <div className="space-y-3">
          {issues.map((issue) => (
            <Card
              key={issue.id}
              className="p-4 cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all"
              onClick={() => openEdit(issue)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {categoryBadge(issue.category)}
                    {statusLabel(issue.status)}
                    {adminStatusBadge(issue.adminStatus)}
                    {issue.city && (
                      <span className="text-xs text-muted">
                        {issue.city}
                        {issue.dong ? ` ${issue.dong}` : ""}
                      </span>
                    )}
                    <span className="text-xs text-muted">
                      {new Date(issue.createdAt).toLocaleDateString("ko-KR")}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">{issue.title}</p>
                  {issue.summary && (
                    <p className="text-sm text-muted mt-1 break-words line-clamp-2">{issue.summary}</p>
                  )}

                  {/* Admin status step selector */}
                  <div className="flex items-center gap-1 mt-2 flex-wrap">
                    <span className="text-[10px] text-muted mr-1">처리 단계:</span>
                    {ADMIN_STATUS_STEPS.map((step) => (
                      <button
                        key={String(step.value)}
                        onClick={(e) => {
                          e.stopPropagation();
                          updateAdminStatus(issue.id, step.value);
                        }}
                        disabled={adminStatusLoading === issue.id}
                        className={`px-1.5 py-0.5 text-[10px] rounded-full border transition-colors disabled:opacity-50 ${
                          (issue.adminStatus ?? null) === step.value
                            ? step.color + " font-bold"
                            : "bg-white border-border text-muted hover:border-gray-400"
                        }`}
                      >
                        {step.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-lg font-bold text-primary">{issue.reportCount ?? 0}</span>
                  <span className="text-[10px] text-muted">제보 수</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Create Issue Modal ──────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-bold text-foreground">새 이슈 만들기</h2>
              <button onClick={() => setShowCreate(false)} className="text-muted text-xl leading-none">
                &times;
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs font-medium text-muted block mb-1">제목 *</label>
                <input
                  type="text"
                  value={createForm.title}
                  onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground"
                  placeholder="이슈 제목"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted block mb-1">요약</label>
                <textarea
                  value={createForm.summary}
                  onChange={(e) => setCreateForm((f) => ({ ...f, summary: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg resize-y bg-background text-foreground"
                  placeholder="이슈 요약"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted block mb-1">카테고리</label>
                <select
                  value={createForm.category}
                  onChange={(e) => setCreateForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground"
                >
                  <option value="">선택 안 함</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted block mb-1">시/군</label>
                <select
                  value={createForm.city}
                  onChange={(e) => setCreateForm((f) => ({ ...f, city: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground"
                >
                  <option value="">선택 안 함</option>
                  {CHUNGNAM_DISTRICTS.map((d) => (
                    <option key={d.code} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted block mb-1">동/읍/면</label>
                <input
                  type="text"
                  value={createForm.dong}
                  onChange={(e) => setCreateForm((f) => ({ ...f, dong: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground"
                  placeholder="동/읍/면 이름"
                />
              </div>
            </div>
            <div className="flex gap-2 px-5 py-4 border-t border-border">
              <button
                onClick={submitCreate}
                disabled={createLoading}
                className="flex-1 px-4 py-2 text-sm font-semibold bg-primary text-white rounded-lg disabled:opacity-50"
              >
                {createLoading ? "생성 중..." : "생성"}
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-sm border border-border rounded-lg text-muted"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Issue Modal ────────────────────────────────────────────── */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-bold text-foreground">이슈 수정</h2>
              <button
                onClick={() => {
                  setEditTarget(null);
                  setAssignTarget(null);
                }}
                className="text-muted text-xl leading-none"
              >
                &times;
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Edit fields */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted block mb-1">제목 *</label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted block mb-1">요약</label>
                  <textarea
                    value={editForm.summary}
                    onChange={(e) => setEditForm((f) => ({ ...f, summary: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg resize-y bg-background text-foreground"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted block mb-1">카테고리</label>
                    <select
                      value={editForm.category}
                      onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground"
                    >
                      <option value="">선택 안 함</option>
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted block mb-1">상태</label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground"
                    >
                      <option value="active">active</option>
                      <option value="resolved">resolved</option>
                      <option value="archived">archived</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted block mb-1">시/군</label>
                    <select
                      value={editForm.city}
                      onChange={(e) => setEditForm((f) => ({ ...f, city: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground"
                    >
                      <option value="">선택 안 함</option>
                      {CHUNGNAM_DISTRICTS.map((d) => (
                        <option key={d.code} value={d.name}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted block mb-1">동/읍/면</label>
                    <input
                      type="text"
                      value={editForm.dong}
                      onChange={(e) => setEditForm((f) => ({ ...f, dong: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>
                </div>

                {/* Admin status stepper */}
                <div>
                  <label className="text-xs font-medium text-muted block mb-2">처리 단계</label>
                  <div className="flex items-center gap-1 flex-wrap">
                    {ADMIN_STATUS_STEPS.map((step) => (
                      <button
                        key={String(step.value)}
                        onClick={() => updateAdminStatus(editTarget.id, step.value)}
                        disabled={adminStatusLoading === editTarget.id}
                        className={`px-2 py-1 text-xs rounded-full border transition-colors disabled:opacity-50 ${
                          (editTarget.adminStatus ?? null) === step.value
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

              {/* ── Assign Posts Section ────────────────────────────────────── */}
              {assignTarget && (
                <div className="border-t border-border pt-4">
                  <h3 className="text-sm font-bold text-foreground mb-3">게시물 배정</h3>

                  {/* Currently assigned posts */}
                  {assignTarget.assignedPosts && assignTarget.assignedPosts.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-muted mb-2">
                        배정된 게시물 ({assignTarget.assignedPosts.length}개)
                      </p>
                      <div className="space-y-1">
                        {assignTarget.assignedPosts.map((post) => (
                          <div
                            key={post.id}
                            className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-border bg-surface"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-foreground line-clamp-1">
                                {post.title || post.content.slice(0, 50)}
                              </p>
                              <p className="text-[10px] text-muted">{post.authorName}</p>
                            </div>
                            <button
                              onClick={() => unassignPost(post.id)}
                              disabled={assignLoading === post.id}
                              className="px-2 py-1 text-[10px] text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 shrink-0"
                            >
                              {assignLoading === post.id ? "..." : "해제"}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Search posts to assign */}
                  <div>
                    <input
                      type="text"
                      placeholder="제목 또는 내용으로 게시물 검색..."
                      value={postSearch}
                      onChange={(e) => setPostSearch(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground"
                    />
                    {postsLoading && <p className="text-xs text-muted mt-2">게시물 불러오는 중...</p>}
                    {postSearch && (
                      <div className="space-y-1 mt-2 max-h-48 overflow-y-auto">
                        {filteredPosts.length === 0 ? (
                          <p className="text-xs text-muted text-center py-3">
                            {postSearch ? "일치하는 게시물이 없습니다" : "검색어를 입력하세요"}
                          </p>
                        ) : (
                          filteredPosts.slice(0, 20).map((p) => (
                            <button
                              key={p.id}
                              onClick={() => assignPost(p.id)}
                              disabled={assignLoading === p.id}
                              className="w-full text-left px-3 py-2 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
                            >
                              <p className="text-xs font-medium text-foreground line-clamp-1">
                                {p.title || p.content.slice(0, 50)}
                              </p>
                              <p className="text-[10px] text-muted mt-0.5">
                                {p.authorName} &middot;{" "}
                                {new Date(p.createdAt).toLocaleDateString("ko-KR")}
                              </p>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2 px-5 py-4 border-t border-border">
              <button
                onClick={submitEdit}
                disabled={editLoading}
                className="flex-1 px-4 py-2 text-sm font-semibold bg-primary text-white rounded-lg disabled:opacity-50"
              >
                {editLoading ? "저장 중..." : "저장"}
              </button>
              <button
                onClick={() => {
                  setEditTarget(null);
                  setAssignTarget(null);
                }}
                className="px-4 py-2 text-sm border border-border rounded-lg text-muted"
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
