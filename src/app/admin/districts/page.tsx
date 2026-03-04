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
  sortOrder: number;
}

// Sections that can be shown per district on the public-facing page
const DISTRICT_SECTIONS = [
  { key: "candidates", label: "출마자 목록" },
  { key: "pledges", label: "공약 목록" },
  { key: "schedule", label: "일정" },
  { key: "stats", label: "통계" },
] as const;

type SectionKey = (typeof DISTRICT_SECTIONS)[number]["key"];

// Per-district section visibility — stored in localStorage (UI-only, no DB change)
function getSectionConfig(): Record<string, SectionKey[]> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem("districtSections") || "{}");
  } catch {
    return {};
  }
}

function saveSectionConfig(config: Record<string, SectionKey[]>) {
  if (typeof window === "undefined") return;
  localStorage.setItem("districtSections", JSON.stringify(config));
}

export default function AdminDistrictsPage() {
  const [districts, setDistricts] = useState<AdminDistrict[]>([]);
  const [original, setOriginal] = useState<AdminDistrict[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sectionConfig, setSectionConfig] = useState<Record<string, SectionKey[]>>({});

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
    setSectionConfig(getSectionConfig());
  }, [fetchDistricts]);

  const handleToggle = (districtId: string) => {
    setDistricts((prev) =>
      prev.map((d) => (d.id === districtId ? { ...d, visible: !d.visible } : d))
    );
    setSaved(false);
  };

  const handleCoordChange = (
    districtId: string,
    field: "centerLat" | "centerLng",
    rawValue: string
  ) => {
    const value = parseFloat(rawValue);
    if (isNaN(value)) return;
    setDistricts((prev) =>
      prev.map((d) => (d.id === districtId ? { ...d, [field]: value } : d))
    );
    setSaved(false);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setDistricts((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next.map((d, i) => ({ ...d, sortOrder: i + 1 }));
    });
    setSaved(false);
  };

  const handleMoveDown = (index: number) => {
    setDistricts((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next.map((d, i) => ({ ...d, sortOrder: i + 1 }));
    });
    setSaved(false);
  };

  const handleSectionToggle = (districtId: string, sectionKey: SectionKey) => {
    setSectionConfig((prev) => {
      const current: SectionKey[] = prev[districtId] ?? DISTRICT_SECTIONS.map((s) => s.key);
      const next = current.includes(sectionKey)
        ? current.filter((k) => k !== sectionKey)
        : [...current, sectionKey];
      const updated = { ...prev, [districtId]: next };
      saveSectionConfig(updated);
      return updated;
    });
  };

  const hasChanges = districts.some((d) => {
    const orig = original.find((o) => o.id === d.id);
    if (!orig) return false;
    return (
      orig.visible !== d.visible ||
      orig.sortOrder !== d.sortOrder ||
      orig.centerLat !== d.centerLat ||
      orig.centerLng !== d.centerLng
    );
  });

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const visibilityChanges = districts.filter((d) => {
        const orig = original.find((o) => o.id === d.id);
        return orig && orig.visible !== d.visible;
      });
      const sortOrderChanges = districts.filter((d) => {
        const orig = original.find((o) => o.id === d.id);
        return orig && orig.sortOrder !== d.sortOrder;
      });
      const coordinateChanges = districts.filter((d) => {
        const orig = original.find((o) => o.id === d.id);
        return orig && (orig.centerLat !== d.centerLat || orig.centerLng !== d.centerLng);
      });

      await Promise.all(
        visibilityChanges.map((d) =>
          fetch("/api/admin/districts", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ districtId: d.id, visible: d.visible }),
          })
        )
      );

      if (sortOrderChanges.length > 0) {
        await fetch("/api/admin/districts", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            sortOrderChanges.map((d) => ({ id: d.id, sortOrder: d.sortOrder }))
          ),
        });
      }

      await Promise.all(
        coordinateChanges.map((d) =>
          fetch("/api/admin/districts", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              districtId: d.id,
              centerLat: d.centerLat,
              centerLng: d.centerLng,
            }),
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
          <Button size="sm" onClick={handleSave} disabled={saving || !hasChanges}>
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
        ▲ ▼ 버튼으로 순서를 변경하고, 토글로 표시 여부를 설정하세요.
        지역명을 클릭하면 표시할 섹션을 선택할 수 있습니다. 섹션 설정은 브라우저에 저장됩니다.
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
                  orig.sortOrder !== district.sortOrder ||
                  orig.centerLat !== district.centerLat ||
                  orig.centerLng !== district.centerLng);

              const isExpanded = expandedId === district.id;
              const enabledSections: SectionKey[] =
                sectionConfig[district.id] ?? DISTRICT_SECTIONS.map((s) => s.key);

              return (
                <div key={district.id}>
                  <div
                    className={`flex items-center justify-between px-4 py-3 transition-colors ${
                      isChanged ? "bg-primary-light/30" : "hover:bg-background/50"
                    }`}
                  >
                    {/* Up/Down buttons */}
                    <div className="flex flex-col gap-0.5 mr-3 shrink-0">
                      <button
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                        className="w-6 h-6 flex items-center justify-center rounded text-muted hover:text-foreground hover:bg-background disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-xs font-bold"
                        title="위로"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => handleMoveDown(index)}
                        disabled={index === districts.length - 1}
                        className="w-6 h-6 flex items-center justify-center rounded text-muted hover:text-foreground hover:bg-background disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-xs font-bold"
                        title="아래로"
                      >
                        ▼
                      </button>
                    </div>

                    {/* Name + coordinates */}
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      <div
                        className="flex items-center gap-2 cursor-pointer"
                        onClick={() => setExpandedId(isExpanded ? null : district.id)}
                      >
                        <span className="text-xs text-muted w-5 text-right shrink-0">
                          {index + 1}
                        </span>
                        <span className="font-medium text-foreground">{district.name}</span>
                        <span className="text-xs text-muted">{district.code}</span>
                        {isChanged && (
                          <span className="text-xs text-primary font-medium">(변경됨)</span>
                        )}
                        <span className="text-xs text-muted ml-auto">
                          섹션 {enabledSections.length}/{DISTRICT_SECTIONS.length}
                        </span>
                        <span className="text-xs text-muted">
                          {isExpanded ? "▲" : "▼"}
                        </span>
                      </div>

                      <div
                        className="flex items-center gap-2 ml-7"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-xs text-muted shrink-0">위도</span>
                        <input
                          type="number"
                          step="0.001"
                          min="-90"
                          max="90"
                          value={district.centerLat}
                          onChange={(e) =>
                            handleCoordChange(district.id, "centerLat", e.target.value)
                          }
                          className="w-24 text-xs px-1.5 py-0.5 border border-border rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                        />
                        <span className="text-xs text-muted shrink-0">경도</span>
                        <input
                          type="number"
                          step="0.001"
                          min="-180"
                          max="180"
                          value={district.centerLng}
                          onChange={(e) =>
                            handleCoordChange(district.id, "centerLng", e.target.value)
                          }
                          className="w-24 text-xs px-1.5 py-0.5 border border-border rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                        />
                      </div>
                    </div>

                    {/* Visibility toggle */}
                    <button
                      onClick={() => handleToggle(district.id)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ml-4 ${
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

                  {/* Expanded section controls */}
                  {isExpanded && (
                    <div className="px-4 pb-3 pt-2 bg-background/60 border-t border-border/50">
                      <p className="text-xs font-semibold text-muted mb-2">
                        이 지역 페이지에서 표시할 섹션:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {DISTRICT_SECTIONS.map((section) => {
                          const enabled = enabledSections.includes(section.key);
                          return (
                            <button
                              key={section.key}
                              onClick={() => handleSectionToggle(district.id, section.key)}
                              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                                enabled
                                  ? "bg-primary text-white border-primary"
                                  : "bg-surface text-muted border-border hover:border-primary hover:text-primary"
                              }`}
                            >
                              {enabled ? "✓ " : ""}{section.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
