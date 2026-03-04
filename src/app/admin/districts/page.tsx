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

const DISTRICT_SECTIONS = [
  { key: "candidates", label: "출마자 목록" },
  { key: "pledges", label: "공약 목록" },
  { key: "schedule", label: "일정" },
  { key: "stats", label: "통계" },
] as const;

type SectionKey = (typeof DISTRICT_SECTIONS)[number]["key"];

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

// ─── Map Picker Modal ────────────────────────────────────────────────────────

interface MapPickerModalProps {
  district: AdminDistrict;
  onConfirm: (lat: number, lng: number) => void;
  onClose: () => void;
}

function MapPickerModal({ district, onConfirm, onClose }: MapPickerModalProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<naver.maps.Map | null>(null);
  const markerRef = useRef<naver.maps.Marker | null>(null);
  const [picked, setPicked] = useState<{ lat: number; lng: number }>({
    lat: district.centerLat,
    lng: district.centerLng,
  });

  useEffect(() => {
    if (!mapRef.current) return;
    // Wait for Naver Maps to be available
    const init = () => {
      if (typeof naver === "undefined" || !mapRef.current) return;

      const center = new naver.maps.LatLng(district.centerLat, district.centerLng);

      const map = new naver.maps.Map(mapRef.current, {
        center,
        zoom: 12,
        zoomControl: true,
        zoomControlOptions: { position: naver.maps.Position.TOP_RIGHT },
      });
      mapInstance.current = map;

      // Initial marker at current center
      const marker = new naver.maps.Marker({
        position: center,
        map,
        icon: {
          content: `<div style="
            width:20px;height:20px;
            background:#FF5A00;
            border:3px solid white;
            border-radius:50%;
            box-shadow:0 2px 6px rgba(0,0,0,0.4);
            cursor:crosshair;
          "></div>`,
          anchor: new naver.maps.Point(10, 10),
        },
      });
      markerRef.current = marker;

      // Click map → move marker + update picked coords
      naver.maps.Event.addListener(map, "click", (e: naver.maps.PointerEvent) => {
        const latlng = e.coord as naver.maps.LatLng;
        marker.setPosition(latlng);
        setPicked({ lat: latlng.lat(), lng: latlng.lng() });
      });
    };

    if (typeof naver !== "undefined") {
      init();
    } else {
      // Naver Maps loads asynchronously — poll until ready
      const interval = setInterval(() => {
        if (typeof naver !== "undefined") {
          clearInterval(interval);
          init();
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [district.centerLat, district.centerLng]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="font-semibold text-foreground">지도에서 중심 좌표 선택</h2>
            <p className="text-xs text-muted mt-0.5">
              <span className="font-medium text-primary">{district.name}</span> —
              지도를 클릭하여 지역 중심점을 설정하세요
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground transition-colors p-1"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Map */}
        <div ref={mapRef} className="w-full" style={{ height: 420 }} />

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border flex items-center justify-between gap-4">
          <div className="text-sm text-muted font-mono">
            <span className="text-foreground font-medium">위도</span>{" "}
            {picked.lat.toFixed(6)}
            {"  "}
            <span className="text-foreground font-medium">경도</span>{" "}
            {picked.lng.toFixed(6)}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              취소
            </Button>
            <Button
              size="sm"
              onClick={() => {
                onConfirm(picked.lat, picked.lng);
                onClose();
              }}
            >
              이 위치로 설정
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AdminDistrictsPage() {
  const [districts, setDistricts] = useState<AdminDistrict[]>([]);
  const [original, setOriginal] = useState<AdminDistrict[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sectionConfig, setSectionConfig] = useState<Record<string, SectionKey[]>>({});
  const [mapPickerDistrict, setMapPickerDistrict] = useState<AdminDistrict | null>(null);

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

  const handleMapPickConfirm = (districtId: string, lat: number, lng: number) => {
    setDistricts((prev) =>
      prev.map((d) =>
        d.id === districtId
          ? { ...d, centerLat: parseFloat(lat.toFixed(6)), centerLng: parseFloat(lng.toFixed(6)) }
          : d
      )
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
        ▲ ▼ 버튼으로 순서 변경 · 📍 버튼으로 지도에서 중심 좌표 선택 · 토글로 표시 여부 설정.
        지역명 클릭 시 섹션 설정이 열립니다. 저장 버튼을 눌러 반영하세요.
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
                    className={`flex items-center gap-2 px-3 py-3 transition-colors ${
                      isChanged ? "bg-primary-light/30" : "hover:bg-background/50"
                    }`}
                  >
                    {/* Up/Down buttons */}
                    <div className="flex flex-col gap-0.5 shrink-0">
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
                    <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                      {/* Row 1: index, name, code, changed badge, section toggle */}
                      <div
                        className="flex items-center gap-2 cursor-pointer"
                        onClick={() => setExpandedId(isExpanded ? null : district.id)}
                      >
                        <span className="text-xs text-muted w-5 text-right shrink-0">
                          {index + 1}
                        </span>
                        <span className="font-medium text-foreground text-sm">
                          {district.name}
                        </span>
                        <span className="text-xs text-muted">{district.code}</span>
                        {isChanged && (
                          <span className="text-xs text-primary font-medium">(변경됨)</span>
                        )}
                        <span className="text-xs text-muted ml-auto">
                          섹션 {enabledSections.length}/{DISTRICT_SECTIONS.length}
                        </span>
                        <span className="text-xs text-muted">{isExpanded ? "▲" : "▼"}</span>
                      </div>

                      {/* Row 2: coordinate inputs + map picker button */}
                      <div
                        className="flex items-center gap-2 ml-7 flex-wrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-xs text-muted shrink-0">위도</span>
                        <input
                          type="number"
                          step="0.000001"
                          min="-90"
                          max="90"
                          value={district.centerLat}
                          onChange={(e) =>
                            handleCoordChange(district.id, "centerLat", e.target.value)
                          }
                          className="w-28 text-xs px-1.5 py-0.5 border border-border rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 font-mono"
                        />
                        <span className="text-xs text-muted shrink-0">경도</span>
                        <input
                          type="number"
                          step="0.000001"
                          min="-180"
                          max="180"
                          value={district.centerLng}
                          onChange={(e) =>
                            handleCoordChange(district.id, "centerLng", e.target.value)
                          }
                          className="w-28 text-xs px-1.5 py-0.5 border border-border rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 font-mono"
                        />
                        {/* Map picker button */}
                        <button
                          onClick={() => setMapPickerDistrict(district)}
                          className="flex items-center gap-1 px-2 py-0.5 text-xs rounded border border-border text-muted hover:border-primary hover:text-primary transition-colors"
                          title="지도에서 중심 좌표 선택"
                        >
                          📍 지도에서 선택
                        </button>
                      </div>
                    </div>

                    {/* Visibility toggle */}
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

      {/* Map Picker Modal */}
      {mapPickerDistrict && (
        <MapPickerModal
          district={mapPickerDistrict}
          onConfirm={(lat, lng) =>
            handleMapPickConfirm(mapPickerDistrict.id, lat, lng)
          }
          onClose={() => setMapPickerDistrict(null)}
        />
      )}
    </div>
  );
}
