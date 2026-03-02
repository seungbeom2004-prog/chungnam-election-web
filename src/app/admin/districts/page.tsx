"use client";

import { useState, useEffect, useCallback } from "react";
import { Button, Card } from "@/components/ui";

interface AdminDistrict {
  id: string;
  name: string;
  code: string;
  centerLat: number;
  centerLng: number;
  visible: boolean;
}

export default function AdminDistrictsPage() {
  const [districts, setDistricts] = useState<AdminDistrict[]>([]);
  const [original, setOriginal] = useState<AdminDistrict[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
      prev.map((d) =>
        d.id === districtId ? { ...d, visible: !d.visible } : d
      )
    );
    setSaved(false);
  };

  // Check if there are unsaved changes
  const hasChanges = districts.some((d) => {
    const orig = original.find((o) => o.id === d.id);
    return orig && orig.visible !== d.visible;
  });

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const changed = districts.filter((d) => {
        const orig = original.find((o) => o.id === d.id);
        return orig && orig.visible !== d.visible;
      });

      await Promise.all(
        changed.map((d) =>
          fetch("/api/admin/districts", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ districtId: d.id, visible: d.visible }),
          })
        )
      );

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
        메인 페이지 상단에 표시될 지역 탭을 관리합니다. 변경 후
        &quot;저장&quot; 버튼을 눌러주세요.
      </p>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <Card padding="none">
          <div className="divide-y divide-border">
            {districts.map((district) => {
              const orig = original.find((o) => o.id === district.id);
              const isChanged = orig && orig.visible !== district.visible;

              return (
                <div
                  key={district.id}
                  className={`flex items-center justify-between px-4 py-3 ${
                    isChanged ? "bg-primary-light/30" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">
                      {district.name}
                    </span>
                    <span className="text-xs text-muted">
                      {district.code}
                    </span>
                    {isChanged && (
                      <span className="text-xs text-primary font-medium">
                        (변경됨)
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => handleToggle(district.id)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
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
