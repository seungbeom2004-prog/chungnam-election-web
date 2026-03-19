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

const IconGrip = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="9" y1="6" x2="15" y2="6"/>
    <line x1="9" y1="12" x2="15" y2="12"/>
    <line x1="9" y1="18" x2="15" y2="18"/>
  </svg>
);

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

  // Drag-and-drop state
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [sortSaving, setSortSaving] = useState(false);
  const [sortSaved, setSortSaved] = useState(false);

  // ── 일괄 색상 변경 state ──────────────────────────────────────────────────
  const [bulkColorMode, setBulkColorMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkColor, setBulkColor] = useState("#FF5A00");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkSaved, setBulkSaved] = useState(false);
  // ──────────────────────────────────────────────────────────────────────────

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

  const hasSortChanges = categories.some((c, i) => {
    const orig = original.find((o) => o.id === c.id);
    return orig && orig.sortOrder !== i;
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

  const handleSaveSort = async () => {
    setSortSaving(true);
    setSortSaved(false);
    try {
      await Promise.all(
        categories.map((c, i) =>
          fetch("/api/admin/categories", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ categoryId: c.id, sortOrder: i }),
          })
        )
      );
      const updated = categories.map((c, i) => ({ ...c, sortOrder: i }));
      setCategories(updated);
      setOriginal(updated);
      setSortSaved(true);
    } catch {
      alert("순서 저장에 실패했습니다.");
    }
    setSortSaving(false);
  };

  // ── 일괄 색상 변경 핸들러 ─────────────────────────────────────────────────
  const toggleBulkColorMode = () => {
    setBulkColorMode((v) => !v);
    setSelectedIds(new Set());
    setBulkSaved(false);
  };

  const toggleSelectId = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === categories.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(categories.map((c) => c.id)));
    }
  };

  const handleBulkColorApply = async () => {
    if (selectedIds.size === 0) return;
    if (!/^#[0-9A-Fa-f]{6}$/.test(bulkColor)) {
      alert("올바른 색상 코드를 입력하세요 (예: #FF5A00)");
      return;
    }
    setBulkSaving(true);
    setBulkSaved(false);
    try {
      await Promise.all(
        [...selectedIds].map((id) =>
          fetch("/api/admin/categories", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ categoryId: id, color: bulkColor }),
          })
        )
      );
      // 로컬 상태 즉시 반영
      setCategories((prev) =>
        prev.map((c) => (selectedIds.has(c.id) ? { ...c, color: bulkColor } : c))
      );
      setOriginal((prev) =>
        prev.map((c) => (selectedIds.has(c.id) ? { ...c, color: bulkColor } : c))
      );
      setBulkSaved(true);
      setSelectedIds(new Set());
      setBulkColorMode(false);
    } catch {
      alert("색상 일괄 변경에 실패했습니다.");
    }
    setBulkSaving(false);
  };
  // ──────────────────────────────────────────────────────────────────────────

  // Drag-and-drop handlers
  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const newCategories = [...categories];
    const [removed] = newCategories.splice(dragIndex, 1);
    newCategories.splice(dropIndex, 0, removed);
    setCategories(newCategories);
    setDragIndex(null);
    setDragOverIndex(null);
    setSortSaved(false);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-foreground">카테고리 관리</h1>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={openCreate}>
            + 추가
          </Button>
          {categories.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={toggleBulkColorMode}
              className={bulkColorMode ? "ring-2 ring-primary" : ""}
            >
              🎨 색상 일괄 변경
            </Button>
          )}
          {hasSortChanges && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleSaveSort}
              disabled={sortSaving}
            >
              {sortSaving ? "저장 중..." : "순서 저장"}
            </Button>
          )}
          <Button
            size="sm"
            onClick={handlePublish}
            disabled={publishSaving || !hasVisibilityChanges}
          >
            {publishSaving ? "저장 중..." : "저장"}
          </Button>
        </div>
      </div>

      {/* 일괄 색상 변경 패널 */}
      {bulkColorMode && (
        <div className="mb-4 rounded-xl border-2 border-primary/30 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">카테고리 색상 일괄 변경</span>
              <span className="text-xs text-muted">
                {selectedIds.size > 0
                  ? `${selectedIds.size}개 선택됨`
                  : "변경할 카테고리를 선택하세요"}
              </span>
            </div>
            <button
              onClick={toggleSelectAll}
              className="text-xs text-primary hover:underline"
            >
              {selectedIds.size === categories.length ? "전체 해제" : "전체 선택"}
            </button>
          </div>

          {/* 색상 선택 */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted">적용할 색상</p>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setBulkColor(c)}
                  className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c,
                    borderColor: bulkColor === c ? "#000" : "transparent",
                    boxShadow: bulkColor === c ? "0 0 0 2px #fff, 0 0 0 3px #000" : "none",
                  }}
                  title={c}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={bulkColor}
                onChange={(e) => setBulkColor(e.target.value)}
                className="w-10 h-10 rounded cursor-pointer border border-border"
              />
              <input
                type="text"
                value={bulkColor}
                onChange={(e) => setBulkColor(e.target.value)}
                placeholder="#FF5A00"
                maxLength={7}
                className="w-32 px-3 py-2 border border-border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary bg-white"
              />
              {/* 미리보기 */}
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0"
                style={{
                  backgroundColor: bulkColor + "20",
                  border: `2px solid ${bulkColor}`,
                }}
                title="미리보기"
              >
                {categories.find((c) => selectedIds.has(c.id))?.emoji || "📌"}
              </div>
              <span className="text-xs text-muted">미리보기</span>
            </div>
          </div>

          {/* 적용 버튼 */}
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              onClick={handleBulkColorApply}
              disabled={bulkSaving || selectedIds.size === 0}
            >
              {bulkSaving
                ? "적용 중..."
                : selectedIds.size > 0
                  ? `선택한 ${selectedIds.size}개에 적용`
                  : "카테고리를 선택하세요"}
            </Button>
            <Button size="sm" variant="ghost" onClick={toggleBulkColorMode}>
              취소
            </Button>
          </div>
        </div>
      )}

      {published && (
        <div className="mb-4 px-3 py-2 text-sm text-green-600 bg-green-50 rounded-lg">
          변경 사항이 저장되었습니다.
        </div>
      )}

      {bulkSaved && !bulkColorMode && (
        <div className="mb-4 px-3 py-2 text-sm text-green-600 bg-green-50 rounded-lg">
          색상이 일괄 변경되었습니다.
        </div>
      )}

      {sortSaved && (
        <div className="mb-4 px-3 py-2 text-sm text-green-600 bg-green-50 rounded-lg">
          순서가 저장되었습니다.
        </div>
      )}

      <p className="text-sm text-muted mb-4">
        공약의 분류 카테고리를 관리합니다. 이모지와 색상은 지도 핀에 표시됩니다. ≡ 아이콘을 드래그하여 순서를 변경할 수 있습니다.
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
            {categories.map((cat, index) => (
              <div
                key={cat.id}
                draggable={!bulkColorMode}
                onDragStart={() => !bulkColorMode && handleDragStart(index)}
                onDragOver={(e) => !bulkColorMode && handleDragOver(e, index)}
                onDrop={(e) => !bulkColorMode && handleDrop(e, index)}
                onDragEnd={() => !bulkColorMode && handleDragEnd()}
                className={`flex items-center justify-between px-4 py-3 transition-colors ${
                  dragIndex === index ? "opacity-40" : "opacity-100"
                } ${
                  dragOverIndex === index && dragIndex !== index
                    ? "bg-primary/5 border-t-2 border-t-primary"
                    : ""
                } ${
                  bulkColorMode && selectedIds.has(cat.id)
                    ? "bg-primary/5"
                    : ""
                }`}
              >
                {/* 일괄 변경 모드: 체크박스 / 일반 모드: 드래그 핸들 */}
                {bulkColorMode ? (
                  <button
                    onClick={() => toggleSelectId(cat.id)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mr-2 transition-colors ${
                      selectedIds.has(cat.id)
                        ? "bg-primary border-primary text-white"
                        : "border-gray-300 bg-white"
                    }`}
                    aria-label={selectedIds.has(cat.id) ? "선택 해제" : "선택"}
                  >
                    {selectedIds.has(cat.id) && (
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>
                ) : (
                  <div className="mr-2 text-muted cursor-grab active:cursor-grabbing shrink-0">
                    <IconGrip />
                  </div>
                )}

                <div
                  className={`flex items-center gap-3 flex-1 min-w-0 ${bulkColorMode ? "cursor-pointer" : ""}`}
                  onClick={() => bulkColorMode && toggleSelectId(cat.id)}
                >
                  {/* Emoji chip — always shown */}
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0 transition-all"
                    style={{
                      backgroundColor: (bulkColorMode && selectedIds.has(cat.id) ? bulkColor : cat.color || "#FF5A00") + "20",
                      border: `2px solid ${bulkColorMode && selectedIds.has(cat.id) ? bulkColor : cat.color || "#FF5A00"}`,
                    }}
                    title="이모지 (지도 핀 기본)"
                  >
                    {cat.emoji || "📌"}
                  </div>
                  {/* Icon image — shown in parallel when uploaded */}
                  {cat.iconImage && (
                    <div
                      className="w-9 h-9 rounded-lg shrink-0 overflow-hidden border-2"
                      style={{ borderColor: cat.color || "#FF5A00" }}
                      title="아이콘 이미지"
                    >
                      <Image src={cat.iconImage} alt={cat.name} width={36} height={36} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">
                        {cat.name}
                      </span>
                      <span className="text-xs text-muted">
                        #{index + 1}
                      </span>
                      {/* 현재 색상 칩 */}
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded-full"
                        style={{
                          backgroundColor: (cat.color || "#FF5A00") + "20",
                          color: cat.color || "#FF5A00",
                        }}
                      >
                        <span
                          className="w-2 h-2 rounded-full inline-block"
                          style={{ backgroundColor: cat.color || "#FF5A00" }}
                        />
                        {cat.color || "#FF5A00"}
                      </span>
                    </div>
                    {cat.description && (
                      <p className="text-sm text-muted mt-0.5 truncate">
                        {cat.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className={`flex items-center gap-3 shrink-0 ${bulkColorMode ? "pointer-events-none opacity-40" : ""}`}>
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
