"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button, Card } from "@/components/ui";

interface AdminDistrict {
  id: string;
  name: string;
  code: string;
  centerLat: number;
  centerLng: number;
  visible: boolean;
  sortOrder: number;
}

export default function AdminDistrictsPage() {
  const [districts, setDistricts] = useState<AdminDistrict[]>([]);
  const [original, setOriginal] = useState<AdminDistrict[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const fetchDistricts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/districts");
      const json = await res.json();
      const data = json.data ?? [];
      setDistricts(data);
      setOriginal(data);
    } catch {
      console.error("Failed to fetch districts");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDistricts();
  }, [fetchDistricts]);

  const handleToggle = (districtId: string) => {
    setDistricts((prev) =>
      prev.map((d) => (d.id === districtId ? { ...d, visible: !d.visible } : d))
    );
    setSaved(false);
  };

  // Drag-and-drop handlers
  const handleDragStart = (index: number) => {
    dragItem.current = index;
  };

  const handleDragEnter = (index: number) => {
    dragOverItem.current = index;
    if (dragItem.current === null || dragItem.current === index) return;

    setDistricts((prev) => {
      const next = [...prev];
      const dragged = next.splice(dragItem.current!, 1)[0];
      next.splice(index, 0, dragged);
      // Reassign sortOrder based on new position
      return next.map((d, i) => ({ ...d, sortOrder: i + 1 }));
    });
    dragItem.current = index;
    setSaved(false);
  };

  const handleDragEnd = () => {
    dragItem.current = null;
    dragOverItem.current = null;
  };

  // Check if there are unsaved changes
  const hasChanges = districts.some((d) => {
    const orig = original.find((o) => o.id === d.id);
    return orig && (orig.visible !== d.visible || orig.sortOrder !== d.sortOrder);
  });

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      // Collect all changes
      const visibilityChanges = districts.filter((d) => {
        const orig = original.find((o) => o.id === d.id);
        return orig && orig.visible !== d.visible;
      });

      const sortOrderChanges = districts.filter((d) => {
        const orig = original.find((o) => o.id === d.id);
        return orig && orig.sortOrder !== d.sortOrder;
      });

      // Save visibility changes individually
      await Promise.all(
        visibilityChanges.map((d) =>
          fetch("/api/admin/districts", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ districtId: d.id, visible: d.visible }),
          })
        )
      );

      // Save sortOrder changes in bulk
      if (sortOrderChanges.length > 0) {
        await fetch("/api/admin/districts", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            sortOrderChanges.map((d) => ({ id: d.id, sortOrder: d.sortOrder }))
          ),
        });
      }

      setOriginal([...districts]);
      setSaved(true);
    } catch {
      alert("저장에 실패했습니다.");
    }
    setSaving(false);
  };

  const visibleCount = districts.filter((d) => d.visible).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-foreground">지역 관리</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted">
            {visibleCount}/{districts.length}개 표시 중
          </span>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !hasChanges}
          >
            {saving ? "저장 중..." : "저장"}
          </Button>
        </div>
      </div>

      {saved && (
        <div className="mb-4 px-3 py-2 text-sm text-green-600 bg-green-50 rounded-lg">
          변경 사항이 저장되었습니다.
        </div>
      )}

      <p className="text-sm text-muted mb-4">
        드래그하여 지역 순서를 변경하고, 토글로 표시 여부를 설정하세요.
        변경 후 &quot;저장&quot; 버튼을 눌러주세요.
      </p>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <Card padding="none">
          <div className="divide-y divide-border">
            {districts.map((district, index) => {
              const orig = original.find((o) => o.id === district.id);
              const isChanged =
                orig &&
                (orig.visible !== district.visible ||
                  orig.sortOrder !== district.sortOrder);

              return (
                <div
                  key={district.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragEnter={() => handleDragEnter(index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                  className={`flex items-center justify-between px-4 py-3 cursor-grab active:cursor-grabbing select-none transition-colors ${
                    isChanged ? "bg-primary-light/30" : "hover:bg-background/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Drag handle */}
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      className="text-muted shrink-0"
                    >
                      <path
                        d="M5 4h1v1H5V4zm4 0h1v1H9V4zM5 7h1v1H5V7zm4 0h1v1H9V7zM5 10h1v1H5v-1zm4 0h1v1H9v-1z"
                        fill="currentColor"
                      />
                    </svg>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted w-5 text-right">
                        {index + 1}
                      </span>
                      <span className="font-medium text-foreground">
                        {district.name}
                      </span>
                      <span className="text-xs text-muted">{district.code}</span>
                      {isChanged && (
                        <span className="text-xs text-primary font-medium">
                          (변경됨)
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggle(district.id)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
                      district.visible ? "bg-primary" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        district.visible ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
