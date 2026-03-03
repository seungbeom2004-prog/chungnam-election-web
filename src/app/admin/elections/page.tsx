"use client";

import { useState, useEffect, useCallback } from "react";
import { Button, Input, Card } from "@/components/ui";

interface Election {
  id: string;
  name: string;
  type: string;
  description: string | null;
  visible: boolean;
  sortOrder: number;
}

export default function AdminElectionsPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingElection, setEditingElection] = useState<Election | null>(null);
  const [form, setForm] = useState({ name: "", type: "구·시·군의회의원선거", description: "", sortOrder: 0 });
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchElections = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/elections");
      const json = await res.json();
      setElections(json.data ?? []);
    } catch {
      console.error("Failed to fetch elections");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchElections();
  }, [fetchElections]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingElection) {
        await fetch("/api/admin/elections", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ electionId: editingElection.id, ...form }),
        });
      } else {
        await fetch("/api/admin/elections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      }
      setShowForm(false);
      setEditingElection(null);
      setForm({ name: "", type: "지방선거", description: "", sortOrder: 0 });
      await fetchElections();
    } catch {
      alert("저장에 실패했습니다.");
    }
    setSaving(false);
  };

  const handleEdit = (election: Election) => {
    setEditingElection(election);
    setForm({
      name: election.name,
      type: election.type,
      description: election.description || "",
      sortOrder: election.sortOrder,
    });
    setShowForm(true);
  };

  const handleToggleVisible = async (election: Election) => {
    setActionLoading(election.id);
    try {
      await fetch("/api/admin/elections", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ electionId: election.id, visible: !election.visible }),
      });
      await fetchElections();
    } catch {
      alert("상태 변경에 실패했습니다.");
    }
    setActionLoading(null);
  };

  const handleDelete = async (election: Election) => {
    if (!confirm(`"${election.name}"을(를) 삭제하시겠습니까?`)) return;
    setActionLoading(election.id);
    try {
      await fetch(`/api/admin/elections?id=${election.id}`, { method: "DELETE" });
      await fetchElections();
    } catch {
      alert("삭제에 실패했습니다.");
    }
    setActionLoading(null);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingElection(null);
    setForm({ name: "", type: "구·시·군의회의원선거", description: "", sortOrder: 0 });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-foreground">선거 관리</h1>
        <Button size="sm" onClick={() => { handleCancel(); setShowForm(true); }}>
          + 선거 추가
        </Button>
      </div>

      {showForm && (
        <Card className="mb-4">
          <h2 className="text-base font-semibold text-foreground mb-4">
            {editingElection ? "선거 수정" : "새 선거 추가"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              label="선거명"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              placeholder="예: 제9회 전국동시지방선거"
            />
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">선거 종류</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              >
                <option value="시·도지사선거">시·도지사선거</option>
                <option value="구·시·군의 장선거">구·시·군의 장선거</option>
                <option value="시·도의회의원선거">시·도의회의원선거</option>
                <option value="구·시·군의회의원선거">구·시·군의회의원선거</option>
                <option value="광역의원비례대표선거">광역의원비례대표선거</option>
                <option value="기초의원비례대표선거">기초의원비례대표선거</option>
                <option value="교육감선거">교육감선거</option>
              </select>
              <p className="text-xs text-muted mt-1">출처: 중앙선관위 · 제9회 전국동시지방선거</p>
            </div>
            <Input
              label="설명 (선택)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="선거에 대한 간단한 설명"
            />
            <Input
              label="정렬 순서"
              type="number"
              value={String(form.sortOrder)}
              onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
            />
            <div className="flex gap-2 pt-1">
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? "저장 중..." : "저장"}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={handleCancel}>
                취소
              </Button>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : elections.length === 0 ? (
        <Card padding="lg">
          <p className="text-center text-muted py-8">등록된 선거가 없습니다.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {elections.map((election) => (
            <Card key={election.id} padding="md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground">{election.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-background text-muted border border-border">
                      {election.type}
                    </span>
                    {!election.visible && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                        숨김
                      </span>
                    )}
                  </div>
                  {election.description && (
                    <p className="mt-1 text-sm text-muted">{election.description}</p>
                  )}
                  <p className="text-xs text-muted mt-0.5">정렬 순서: {election.sortOrder}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleToggleVisible(election)}
                    disabled={actionLoading === election.id}
                  >
                    {election.visible ? "숨기기" : "표시"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEdit(election)}
                    disabled={actionLoading === election.id}
                  >
                    수정
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleDelete(election)}
                    disabled={actionLoading === election.id}
                  >
                    삭제
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
