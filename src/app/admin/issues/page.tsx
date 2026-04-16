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
  postCount?: number;
  status: string;
  adminStatus: string | null;
  assignedPosts?: { id: string; title: string | null; content: string; authorName: string; postType?: string }[];
  createdAt: string;
}

interface Post {
  id: string;
  title: string | null;
  content: string;
  authorName: string;
  postType?: string;
  issueId?: string | null;
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
  { value: "complaint_resolved", label: "🏛️ 민원 해결", color: "bg-purple-100 text-purple-700 border-purple-300" },
  { value: "adopted", label: "공약 반영 완료", color: "bg-green-100 text-green-700 border-green-300" },
];

export default function AdminIssuesPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "resolved">("all");
  const [message, setMessage] = useState("");

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ title: "", summary: "", category: "", city: "", dong: "" });
  const [createLoading, setCreateLoading] = useState(false);

  // Edit modal
  const [editTarget, setEditTarget] = useState<Issue | null>(null);
  const [editForm, setEditForm] = useState({ title: "", summary: "", category: "", city: "", dong: "", status: "" });
  const [editLoading, setEditLoading] = useState(false);
  const [editTab, setEditTab] = useState<"info" | "posts">("info");

  // Admin status
  const [adminStatusLoading, setAdminStatusLoading] = useState<string | null>(null);

  // Delete
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  // Assign posts
  const [assignTarget, setAssignTarget] = useState<Issue | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [postSearch, setPostSearch] = useState("");
  const [postsLoading, setPostsLoading] = useState(false);
  const [assignLoading, setAssignLoading] = useState<string | null>(null);
  const [selectedPostIds, setSelectedPostIds] = useState<Set<string>>(new Set());
  const [bulkAssignLoading, setBulkAssignLoading] = useState(false);

  // Inline expand for assigned posts
  const [expandedIssueId, setExpandedIssueId] = useState<string | null>(null);

  // AI summary
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [aiCategoryLoading, setAiCategoryLoading] = useState(false);

  // AI suggest new issues
  const [aiSuggestLoading, setAiSuggestLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<{
    title: string; summary: string; category: string; city: string | null; postIds: string[];
  }[]>([]);
  const [aiCreateLoading, setAiCreateLoading] = useState<number | null>(null);

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
      if (filter !== "all") {
        data = data.filter((i) => i.status === filter);
      }
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
      const res = await fetch("/api/admin/proposals?limit=200");
      const json = await res.json();
      setPosts(json.data ?? []);
    } catch {
      showMessage("게시물을 불러오지 못했습니다.");
    } finally {
      setPostsLoading(false);
    }
  };

  // ── Delete Issue ────────────────────────────────────────────────
  const deleteIssue = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm("이 이슈를 완전히 삭제하시겠습니까?\n연결된 게시물의 이슈 배정은 자동으로 해제됩니다.")) return;
    setDeleteLoading(id);
    try {
      const res = await fetch(`/api/admin/issues/${id}`, { method: "DELETE" });
      if (res.ok) {
        showMessage("이슈가 삭제되었습니다.");
        setEditTarget(null);
        setAssignTarget(null);
        fetchIssues();
      } else {
        const json = await res.json();
        showMessage(json.error ?? "삭제에 실패했습니다.");
      }
    } catch {
      showMessage("네트워크 오류가 발생했습니다.");
    } finally {
      setDeleteLoading(null);
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
    setEditTab("info");
    setAssignTarget(issue);
    setSelectedPostIds(new Set());
    setPostSearch("");
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
        if (editTarget?.id === id) setEditTarget((prev) => prev ? { ...prev, adminStatus } : prev);
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
  const refreshAssignTarget = async (issueId: string) => {
    const issueRes = await fetch("/api/admin/issues");
    const issueJson = await issueRes.json();
    const allIssues: Issue[] = issueJson.data ?? issueJson ?? [];
    const updated = allIssues.find((i) => i.id === issueId);
    if (updated) {
      setAssignTarget(updated);
      setEditTarget((prev) => prev?.id === updated.id ? updated : prev);
      setIssues((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    }
  };

  const assignPost = async (postId: string, issueId?: string) => {
    const targetId = issueId ?? assignTarget?.id;
    if (!targetId) return;
    setAssignLoading(postId);
    try {
      const res = await fetch(`/api/admin/issues/${targetId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postIds: [postId] }),
      });
      if (res.ok) {
        showMessage("게시물이 배정되었습니다.");
        await refreshAssignTarget(targetId);
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

  const unassignPost = async (postId: string, issueId?: string) => {
    const targetId = issueId ?? assignTarget?.id;
    if (!targetId) return;
    setAssignLoading(postId);
    try {
      const res = await fetch(`/api/admin/issues/${targetId}/assign`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postIds: [postId] }),
      });
      if (res.ok) {
        showMessage("배정이 해제되었습니다.");
        await refreshAssignTarget(targetId);
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

  const togglePostSelection = (id: string) => {
    setSelectedPostIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const bulkAssignPosts = async () => {
    if (!assignTarget || selectedPostIds.size === 0) return;
    setBulkAssignLoading(true);
    try {
      const res = await fetch(`/api/admin/issues/${assignTarget.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postIds: [...selectedPostIds] }),
      });
      if (res.ok) {
        showMessage(`${selectedPostIds.size}개 게시물이 배정되었습니다.`);
        setSelectedPostIds(new Set());
        await refreshAssignTarget(assignTarget.id);
        // Refresh posts list so issueId is up to date
        const postsRes = await fetch("/api/admin/proposals?limit=200");
        const postsJson = await postsRes.json();
        setPosts(postsJson.data ?? []);
      } else {
        const json = await res.json();
        showMessage(json.error ?? "배정에 실패했습니다.");
      }
    } catch {
      showMessage("네트워크 오류가 발생했습니다.");
    } finally {
      setBulkAssignLoading(false);
    }
  };

  const assignedPostIds = new Set(assignTarget?.assignedPosts?.map((p) => p.id) ?? []);

  const filteredPosts = posts.filter(
    (p) =>
      !assignedPostIds.has(p.id) &&
      (postSearch
        ? (p.title ?? "").toLowerCase().includes(postSearch.toLowerCase()) ||
          p.content.toLowerCase().includes(postSearch.toLowerCase())
        : true)
  );

  // Orphan posts (not assigned to any issue) — already filtered by search above when postSearch is set
  const orphanPosts = posts.filter((p) => !p.issueId && !assignedPostIds.has(p.id));

  // ── AI Functions ──────────────────────────────────────────────────
  const generateAiSummary = async () => {
    if (!editTarget) return;
    setAiSummaryLoading(true);
    try {
      const res = await fetch("/api/ai/summarize-issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issueId: editTarget.id }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.summary) {
          setEditForm((f) => ({ ...f, summary: json.summary }));
          showMessage("AI 요약이 생성되었습니다.");
        } else {
          showMessage("요약을 생성하지 못했습니다.");
        }
      } else {
        showMessage("AI 요약 생성에 실패했습니다.");
      }
    } catch {
      showMessage("AI 요약 생성 중 오류가 발생했습니다.");
    } finally {
      setAiSummaryLoading(false);
    }
  };

  const suggestAiCategory = async () => {
    if (!editTarget) return;
    setAiCategoryLoading(true);
    try {
      const postsText = editTarget.assignedPosts?.map((p) => p.content).join("\n") ?? editTarget.title;
      const res = await fetch("/api/ai/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: `${editTarget.title}\n${editTarget.summary ?? ""}\n${postsText}` }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.category) {
          setEditForm((f) => ({ ...f, category: json.category }));
          showMessage(`AI 추천 카테고리: ${json.category}`);
        }
      } else {
        showMessage("AI 카테고리 추천에 실패했습니다.");
      }
    } catch {
      showMessage("AI 카테고리 추천 중 오류가 발생했습니다.");
    } finally {
      setAiCategoryLoading(false);
    }
  };

  // ── AI Suggest New Issues ────────────────────────────────────────
  const fetchAiSuggestions = async () => {
    setAiSuggestLoading(true);
    setAiSuggestions([]);
    try {
      const res = await fetch("/api/ai/suggest-new-issues", { method: "POST" });
      if (res.ok) {
        const json = await res.json();
        setAiSuggestions(json.suggestions ?? []);
        if ((json.suggestions ?? []).length === 0) {
          showMessage(json.message || "AI가 새 이슈를 추천하지 못했습니다. 미배정 게시물이 부족할 수 있습니다.");
        }
      } else {
        showMessage("AI 이슈 추천에 실패했습니다.");
      }
    } catch {
      showMessage("AI 이슈 추천 중 오류가 발생했습니다.");
    } finally {
      setAiSuggestLoading(false);
    }
  };

  const createFromAiSuggestion = async (idx: number) => {
    const suggestion = aiSuggestions[idx];
    if (!suggestion) return;
    setAiCreateLoading(idx);
    try {
      // 1. Create the issue
      const createRes = await fetch("/api/admin/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: suggestion.title,
          summary: suggestion.summary,
          category: suggestion.category,
          city: suggestion.city,
        }),
      });
      if (!createRes.ok) {
        showMessage("이슈 생성에 실패했습니다.");
        return;
      }
      const { data: newIssue } = await createRes.json();
      if (!newIssue?.id) { showMessage("이슈 ID를 받지 못했습니다."); return; }

      // 2. Assign posts
      if (suggestion.postIds.length > 0) {
        await fetch(`/api/admin/issues/${newIssue.id}/assign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postIds: suggestion.postIds }),
        });
      }

      showMessage(`"${suggestion.title}" 이슈가 생성되고 ${suggestion.postIds.length}개 게시물이 배정되었습니다.`);
      setAiSuggestions((prev) => prev.filter((_, i) => i !== idx));
      fetchIssues();
    } catch {
      showMessage("네트워크 오류가 발생했습니다.");
    } finally {
      setAiCreateLoading(null);
    }
  };

  // ── Helper Components ─────────────────────────────────────────────
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
        return <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded-full">보관됨</span>;
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

  const postTypeBadge = (postType?: string) => {
    if (postType === "민원") return <span className="px-1.5 py-0.5 text-[10px] bg-red-100 text-red-600 rounded-full">민원</span>;
    if (postType === "제안") return <span className="px-1.5 py-0.5 text-[10px] bg-yellow-100 text-yellow-700 rounded-full">제안</span>;
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
        {(["all", "active", "resolved"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              filter === s
                ? "bg-primary text-white border-primary"
                : "border-border text-muted hover:text-foreground"
            }`}
          >
            {s === "all" ? `전체 (${issues.length})` : s}
          </button>
        ))}
      </div>

      {/* AI Suggest New Issues */}
      <div className="mb-4">
        <button
          onClick={fetchAiSuggestions}
          disabled={aiSuggestLoading}
          className="flex items-center gap-2 px-3 py-2 text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-50"
        >
          {aiSuggestLoading ? (
            <><span className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" /> AI 분석 중...</>
          ) : (
            <>🤖 AI 이슈 자동 추천</>
          )}
        </button>
        {aiSuggestions.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-xs font-semibold text-purple-700">AI 추천 이슈 ({aiSuggestions.length}개)</p>
            {aiSuggestions.map((s, idx) => (
              <Card key={idx} className="p-3 border-purple-200 bg-purple-50/50">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {categoryBadge(s.category)}
                      {s.city && <span className="text-xs text-muted">{s.city}</span>}
                      <span className="text-[10px] text-purple-500">{s.postIds.length}개 게시물 포함</span>
                    </div>
                    <p className="text-sm font-semibold text-foreground">{s.title}</p>
                    <p className="text-xs text-muted mt-0.5">{s.summary}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => createFromAiSuggestion(idx)}
                      disabled={aiCreateLoading === idx}
                      className="px-3 py-1.5 text-xs font-semibold bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {aiCreateLoading === idx ? "생성 중..." : "이슈 생성"}
                    </button>
                    <button
                      onClick={() => setAiSuggestions((prev) => prev.filter((_, i) => i !== idx))}
                      className="px-2 py-1.5 text-xs text-muted border border-border rounded-lg hover:bg-background"
                    >
                      무시
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
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
            <div key={issue.id}>
              <Card
                className="p-4 cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all"
                onClick={() => openEdit(issue)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {categoryBadge(issue.category)}
                      {statusLabel(issue.status)}
                      {/* adminStatusBadge removed */}
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

                    {/* Status badge */}
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className={`px-1.5 py-0.5 text-[10px] rounded-full border font-medium ${
                        issue.status === "active" ? "bg-green-50 text-green-700 border-green-200" :
                        issue.status === "resolved" ? "bg-blue-50 text-blue-700 border-blue-200" :
                        "bg-gray-50 text-gray-500 border-gray-200"
                      }`}>{issue.status}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-lg font-bold text-primary">{issue.postCount ?? issue.reportCount ?? 0}</span>
                    <span className="text-[10px] text-muted">게시물 수</span>
                    {/* Action buttons */}
                    <div className="flex gap-1 mt-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedIssueId(expandedIssueId === issue.id ? null : issue.id);
                        }}
                        className="p-1.5 text-[10px] text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                        title="게시물 보기"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                      </button>
                      <button
                        onClick={(e) => deleteIssue(issue.id, e)}
                        disabled={deleteLoading === issue.id}
                        className="p-1.5 text-[10px] text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                        title="삭제"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Inline expanded assigned posts */}
              {expandedIssueId === issue.id && (
                <div className="ml-4 mt-1 mb-2 p-3 border border-border rounded-lg bg-surface/50">
                  <p className="text-xs font-semibold text-muted mb-2">
                    배정된 게시물 ({issue.assignedPosts?.length ?? 0}개)
                  </p>
                  {(!issue.assignedPosts || issue.assignedPosts.length === 0) ? (
                    <p className="text-xs text-muted">배정된 게시물이 없습니다.</p>
                  ) : (
                    <div className="space-y-1">
                      {issue.assignedPosts.map((post) => (
                        <div
                          key={post.id}
                          className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-border bg-background"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {postTypeBadge(post.postType)}
                            <p className="text-xs font-medium text-foreground line-clamp-1">
                              {post.title || post.content.slice(0, 50)}
                            </p>
                            <p className="text-[10px] text-muted shrink-0">{post.authorName}</p>
                          </div>
                          <button
                            onClick={() => unassignPost(post.id, issue.id)}
                            disabled={assignLoading === post.id}
                            className="px-2 py-1 text-[10px] text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 shrink-0"
                          >
                            {assignLoading === post.id ? "..." : "해제"}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
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
                    <option key={c} value={c}>{c}</option>
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
                    <option key={d.code} value={d.name}>{d.name}</option>
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

            {/* Tabs */}
            <div className="flex border-b border-border">
              <button
                onClick={() => setEditTab("info")}
                className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                  editTab === "info"
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted hover:text-foreground"
                }`}
              >
                이슈 정보
              </button>
              <button
                onClick={() => setEditTab("posts")}
                className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                  editTab === "posts"
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted hover:text-foreground"
                }`}
              >
                게시물 관리 ({assignTarget?.assignedPosts?.length ?? 0})
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {editTab === "info" ? (
                /* ── Info Tab ──────────────────────────────────────────── */
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
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-muted">요약</label>
                      <button
                        onClick={generateAiSummary}
                        disabled={aiSummaryLoading}
                        className="text-[10px] px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-full hover:bg-purple-100 transition-colors disabled:opacity-50"
                      >
                        {aiSummaryLoading ? "생성 중..." : "AI 요약 생성"}
                      </button>
                    </div>
                    <textarea
                      value={editForm.summary}
                      onChange={(e) => setEditForm((f) => ({ ...f, summary: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg resize-y bg-background text-foreground"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-muted">카테고리</label>
                        <button
                          onClick={suggestAiCategory}
                          disabled={aiCategoryLoading}
                          className="text-[10px] px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-full hover:bg-purple-100 transition-colors disabled:opacity-50"
                        >
                          {aiCategoryLoading ? "..." : "AI 추천"}
                        </button>
                      </div>
                      <select
                        value={editForm.category}
                        onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground"
                      >
                        <option value="">선택 안 함</option>
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
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
                          <option key={d.code} value={d.name}>{d.name}</option>
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

                  {/* Admin status stepper removed — issues now contain mixed post types */}
                </div>
              ) : (
                /* ── Posts Tab ─────────────────────────────────────────── */
                <div className="space-y-4">
                  {/* Currently assigned posts */}
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-2">
                      배정된 게시물 ({assignTarget?.assignedPosts?.length ?? 0}개)
                    </p>
                    {assignTarget?.assignedPosts && assignTarget.assignedPosts.length > 0 ? (
                      <div className="space-y-1">
                        {assignTarget.assignedPosts.map((post) => (
                          <div
                            key={post.id}
                            className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-border bg-surface"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              {postTypeBadge(post.postType)}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-foreground line-clamp-1">
                                  {post.title || post.content.slice(0, 50)}
                                </p>
                                <p className="text-[10px] text-muted">{post.authorName}</p>
                              </div>
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
                    ) : (
                      <p className="text-xs text-muted py-2">배정된 게시물이 없습니다.</p>
                    )}
                  </div>

                  {/* Bulk action bar */}
                  {selectedPostIds.size > 0 && (
                    <div className="flex items-center gap-3 px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg">
                      <span className="text-xs font-semibold text-primary flex-1">
                        {selectedPostIds.size}개 선택됨
                      </span>
                      <button
                        onClick={() => setSelectedPostIds(new Set())}
                        className="text-xs text-muted hover:text-foreground transition-colors"
                      >
                        선택 해제
                      </button>
                      <button
                        onClick={bulkAssignPosts}
                        disabled={bulkAssignLoading}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        {bulkAssignLoading ? "배정 중..." : `+ ${selectedPostIds.size}개 이슈에 추가`}
                      </button>
                    </div>
                  )}

                  {/* Search posts to assign */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-xs font-semibold text-foreground flex-1">게시물 검색 & 배정</p>
                      {postsLoading && <span className="text-[10px] text-muted">불러오는 중...</span>}
                    </div>
                    <input
                      type="text"
                      placeholder="제목 또는 내용 검색 (비워두면 전체 표시)..."
                      value={postSearch}
                      onChange={(e) => setPostSearch(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground mb-2"
                    />
                    {/* search results */}
                    {(() => {
                      const visible = filteredPosts.slice(0, 50);
                      if (visible.length === 0) return (
                        <p className="text-xs text-muted text-center py-3">
                          {postSearch ? "일치하는 게시물이 없습니다" : "미배정 게시물이 없습니다"}
                        </p>
                      );
                      const allVisibleSelected = visible.every(p => selectedPostIds.has(p.id));
                      return (
                        <>
                          <div className="flex items-center gap-2 mb-1.5">
                            <label className="flex items-center gap-1.5 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={allVisibleSelected}
                                ref={el => { if (el) el.indeterminate = !allVisibleSelected && visible.some(p => selectedPostIds.has(p.id)); }}
                                onChange={() => {
                                  if (allVisibleSelected) {
                                    setSelectedPostIds(prev => { const n = new Set(prev); visible.forEach(p => n.delete(p.id)); return n; });
                                  } else {
                                    setSelectedPostIds(prev => { const n = new Set(prev); visible.forEach(p => n.add(p.id)); return n; });
                                  }
                                }}
                                className="w-3.5 h-3.5 accent-primary"
                              />
                              <span className="text-[11px] text-muted font-medium">전체 선택 ({visible.length}개)</span>
                            </label>
                            {postSearch && filteredPosts.length > 50 && (
                              <span className="text-[10px] text-muted ml-auto">{filteredPosts.length}개 중 50개 표시</span>
                            )}
                          </div>
                          <div className="space-y-1 max-h-56 overflow-y-auto">
                            {visible.map((p) => {
                              const isSelected = selectedPostIds.has(p.id);
                              return (
                                <label
                                  key={p.id}
                                  className={`flex items-start gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-colors select-none ${
                                    isSelected
                                      ? "border-primary bg-primary/5"
                                      : "border-border hover:border-primary/50 hover:bg-background"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => togglePostSelection(p.id)}
                                    className="mt-0.5 w-3.5 h-3.5 accent-primary shrink-0"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {postTypeBadge(p.postType)}
                                      <p className="text-xs font-medium text-foreground line-clamp-1">
                                        {p.title || p.content.slice(0, 50)}
                                      </p>
                                    </div>
                                    <p className="text-[10px] text-muted mt-0.5">
                                      {p.authorName} · {new Date(p.createdAt).toLocaleDateString("ko-KR")}
                                    </p>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center gap-2 px-5 py-4 border-t border-border">
              <button
                onClick={() => deleteIssue(editTarget.id)}
                disabled={deleteLoading === editTarget.id}
                className="px-3 py-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                {deleteLoading === editTarget.id ? "삭제 중..." : "삭제(보관)"}
              </button>
              <div className="flex-1" />
              <button
                onClick={submitEdit}
                disabled={editLoading}
                className="px-4 py-2 text-sm font-semibold bg-primary text-white rounded-lg disabled:opacity-50"
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
