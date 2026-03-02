"use client";

import { useState, useEffect } from "react";
import { Button, Input, Card, Modal } from "@/components/ui";

interface AdminCategory {
  id: string;
  name: string;
  description: string | null;
  visible: boolean;
  sortOrder: number;
  createdAt: string;
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminCategory | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/categories");
      const json = await res.json();
      setCategories(json.data ?? []);
    } catch {
      console.error("Failed to fetch categories");
    }
    setLoading(false);
  };

  const openCreate = () => {
    setEditing(null);
    setFormName("");
    setFormDescription("");
    setFormSortOrder(categories.length);
    setModalOpen(true);
  };

  const openEdit = (cat: AdminCategory) => {
    setEditing(cat);
    setFormName(cat.name);
    setFormDescription(cat.description || "");
    setFormSortOrder(cat.sortOrder);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        // Update
        await fetch("/api/admin/categories", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            categoryId: editing.id,
            name: formName,
            description: formDescription || null,
            sortOrder: formSortOrder,
          }),
        });
      } else {
        // Create
        await fetch("/api/admin/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName,
            description: formDescription || null,
            sortOrder: formSortOrder,
          }),
        });
      }
      setModalOpen(false);
      await fetchCategories();
    } catch {
      alert("저장에 실패했습니다.");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`정말로 "${name}" 카테고리를 삭제하시겠습니까?`)) return;
    try {
      await fetch(`/api/admin/categories?id=${id}`, { method: "DELETE" });
      await fetchCategories();
    } catch {
      alert("삭제에 실패했습니다.");
    }
  };

  const handleToggle = async (categoryId: string, visible: boolean) => {
    setToggling(categoryId);
    try {
      await fetch("/api/admin/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId, visible }),
      });
      setCategories((prev) =>
        prev.map((c) => (c.id === categoryId ? { ...c, visible } : c))
      );
    } catch {
      alert("변경에 실패했습니다.");
    }
    setToggling(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-foreground">카테고리 관리</h1>
        <Button size="sm" onClick={openCreate}>
          + 추가
        </Button>
      </div>

      <p className="text-sm text-muted mb-4">
        공약의 분류 카테고리를 관리합니다. 후보가 공약을 등록할 때 카테고리를
        선택할 수 있습니다.
      </p>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : categories.length === 0 ? (
        <Card padding="lg">
          <p className="text-center text-muted py-8">
            등록된 카테고리가 없습니다.
          </p>
        </Card>
      ) : (
        <Card padding="none">
          <div className="divide-y divide-border">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">
                      {cat.name}
                    </span>
                    <span className="text-xs text-muted">
                      순서: {cat.sortOrder}
                    </span>
                  </div>
                  {cat.description && (
                    <p className="text-sm text-muted mt-0.5 truncate">
                      {cat.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {/* Toggle */}
                  <button
                    onClick={() => handleToggle(cat.id, !cat.visible)}
                    disabled={toggling === cat.id}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      cat.visible ? "bg-primary" : "bg-gray-300"
                    } ${toggling === cat.id ? "opacity-50" : ""}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        cat.visible ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>

                  <button
                    onClick={() => openEdit(cat)}
                    className="text-sm text-primary hover:text-primary-hover"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => handleDelete(cat.id, cat.name)}
                    className="text-sm text-red-500 hover:text-red-700"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "카테고리 수정" : "카테고리 추가"}
      >
        <div className="space-y-4">
          <Input
            label="카테고리명"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="예: 교육"
            required
          />
          <Input
            label="설명 (선택)"
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            placeholder="카테고리에 대한 설명"
          />
          <Input
            label="정렬 순서"
            type="number"
            value={formSortOrder.toString()}
            onChange={(e) => setFormSortOrder(parseInt(e.target.value) || 0)}
          />
          <div className="flex gap-2 pt-2">
            <Button
              className="flex-1"
              onClick={handleSave}
              disabled={saving || !formName.trim()}
            >
              {saving ? "저장 중..." : editing ? "수정" : "추가"}
            </Button>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              취소
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
