"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Button, Input, Card, Modal } from "@/components/ui";

// Preset palette for quick color selection
const COLOR_PRESETS = [
  "#FF5A00", "#EF4444", "#F59E0B", "#22C55E",
  "#3B82F6", "#8B5CF6", "#EC4899", "#6B7280",
  "#10B981", "#14B8A6", "#F97316", "#06B6D4",
];

interface AdminCategory {
  id: string;
  name: string;
  description: string | null;
  emoji: string | null;
  color: string;
  iconImage: string | null;
  visible: boolean;
  sortOrder: number;
  createdAt: string;
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [original, setOriginal] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminCategory | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formEmoji, setFormEmoji] = useState("");
  const [formColor, setFormColor] = useState("#FF5A00");
  const [formIconImage, setFormIconImage] = useState<string | null>(null);
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [saving, setSaving] = useState(false);
  const [publishSaving, setPublishSaving] = useState(false);
  const [published, setPublished] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const iconFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/categories");
      const json = await res.json();
      const data = json.data ?? [];
      setCategories(data);
      setOriginal(data);
    } catch {
      console.error("Failed to fetch categories");
    }
    setLoading(false);
  };

  const openCreate = () => {
    setEditing(null);
    setFormName("");
    setFormDescription("");
    setFormEmoji("");
    setFormColor("#FF5A00");
    setFormIconImage(null);
    setFormSortOrder(categories.length);
    setModalOpen(true);
  };

  const openEdit = (cat: AdminCategory) => {
    setEditing(cat);
    setFormName(cat.name);
    setFormDescription(cat.description || "");
    setFormEmoji(cat.emoji || "");
    setFormColor(cat.color || "#FF5A00");
    setFormIconImage(cat.iconImage || null);
    setFormSortOrder(cat.sortOrder);
    setModalOpen(true);
  };

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingIcon(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      const url = json.data?.url || json.url;
      if (url) setFormIconImage(url);
    } catch {
      alert("아이콘 업로드에 실패했습니다.");
    }
    setUploadingIcon(false);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: formName,
        description: formDescription || null,
        emoji: formEmoji || null,
        color: formColor,
        iconImage: formIconImage || null,
        sortOrder: formSortOrder,
      };

      if (editing) {
        await fetch("/api/admin/categories", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ categoryId: editing.id, ...payload }),
        });
      } else {
        await fetch("/api/admin/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
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

  const handleToggle = (categoryId: string) => {
    setCategories((prev) =>
      prev.map((c) =>
        c.id === categoryId ? { ...c, visible: !c.visible } : c
      )
    );
    setPublished(false);
  };

  const hasVisibilityChanges = categories.some((c) => {
    const orig = original.find((o) => o.id === c.id);
    return orig && orig.visible !== c.visible;
  });

  const handlePublish = async () => {
    setPublishSaving(true);
    setPublished(false);
    try {
      const changed = categories.filter((c) => {
        const orig = original.find((o) => o.id === c.id);
        return orig && orig.visible !== c.visible;
      });
      await Promise.all(
        changed.map((c) =>
          fetch("/api/admin/categories", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ categoryId: c.id, visible: c.visible }),
          })
        )
      );
      setOriginal([...categories]);
      setPublished(true);
    } catch {
      alert("저장에 실패했습니다.");
    }
    setPublishSaving(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-foreground">카테고리 관리</h1>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={openCreate}>
            + 추가
          </Button>
          <Button
            size="sm"
            onClick={handlePublish}
            disabled={publishSaving || !hasVisibilityChanges}
          >
            {publishSaving ? "저장 중..." : "저장"}
          </Button>
        </div>
      </div>

      {published && (
        <div className="mb-4 px-3 py-2 text-sm text-green-600 bg-green-50 rounded-lg">
          변경 사항이 저장되었습니다.
        </div>
      )}

      <p className="text-sm text-muted mb-4">
        공약의 분류 카테고리를 관리합니다. 이모지와 색상은 지도 핀에 표시됩니다.
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
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Icon preview */}
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0 overflow-hidden"
                    style={{ backgroundColor: (cat.color || "#FF5A00") + "20", border: `2px solid ${cat.color || "#FF5A00"}` }}
                  >
                    {cat.iconImage ? (
                      <Image src={cat.iconImage} alt={cat.name} width={36} height={36} className="w-full h-full object-cover" />
                    ) : (
                      cat.emoji || "📌"
                    )}
                  </div>
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
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {/* Toggle */}
                  <button
                    onClick={() => handleToggle(cat.id)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      cat.visible ? "bg-primary" : "bg-gray-300"
                    }`}
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

          {/* Icon Image Upload */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              아이콘 이미지 <span className="text-xs font-normal text-muted">(선택 — 이모지 대신 표시됨)</span>
            </label>
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden shrink-0"
                style={{ backgroundColor: (formColor || "#FF5A00") + "20", border: `2px solid ${formColor || "#FF5A00"}` }}
              >
                {formIconImage ? (
                  <Image src={formIconImage} alt="icon" width={48} height={48} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl">{formEmoji || "📌"}</span>
                )}
              </div>
              <div className="flex-1">
                <input ref={iconFileRef} type="file" accept="image/*" onChange={handleIconUpload} className="hidden" />
                <button
                  type="button"
                  onClick={() => iconFileRef.current?.click()}
                  disabled={uploadingIcon}
                  className="px-3 py-1.5 text-sm border border-dashed border-border rounded-lg text-muted hover:border-primary hover:text-primary transition-colors"
                >
                  {uploadingIcon ? "업로드 중..." : formIconImage ? "이미지 변경" : "이미지 업로드"}
                </button>
                {formIconImage && (
                  <button
                    type="button"
                    onClick={() => setFormIconImage(null)}
                    className="ml-2 text-xs text-red-500 hover:text-red-700"
                  >
                    제거
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Emoji */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              이모지 <span className="text-xs font-normal text-muted">(이미지 없을 때 표시)</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={formEmoji}
                onChange={(e) => setFormEmoji(e.target.value)}
                placeholder="이모지 입력 (예: 📚)"
                maxLength={4}
                className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              색상 (지도 핀 테두리)
            </label>
            <div className="space-y-2">
              {/* Preset colors */}
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setFormColor(c)}
                    className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
                    style={{
                      backgroundColor: c,
                      borderColor: formColor === c ? "#000" : "transparent",
                    }}
                    title={c}
                  />
                ))}
              </div>
              {/* Custom color input */}
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formColor}
                  onChange={(e) => setFormColor(e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer border border-border"
                />
                <input
                  type="text"
                  value={formColor}
                  onChange={(e) => setFormColor(e.target.value)}
                  placeholder="#FF5A00"
                  maxLength={7}
                  className="flex-1 px-3 py-2 border border-border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>

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
