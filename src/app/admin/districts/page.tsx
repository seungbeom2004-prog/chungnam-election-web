"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui";

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
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    fetchDistricts();
  }, []);

  const fetchDistricts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/districts");
      const json = await res.json();
      setDistricts(json.data ?? []);
    } catch {
      console.error("Failed to fetch districts");
    }
    setLoading(false);
  };

  const handleToggle = async (districtId: string, visible: boolean) => {
    setToggling(districtId);
    try {
      await fetch("/api/admin/districts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ districtId, visible }),
      });
      setDistricts((prev) =>
        prev.map((d) => (d.id === districtId ? { ...d, visible } : d))
      );
    } catch {
      alert("변경에 실패했습니다.");
    }
    setToggling(null);
  };

  const visibleCount = districts.filter((d) => d.visible).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-foreground">지역 관리</h1>
        <span className="text-sm text-muted">
          {visibleCount}/{districts.length}개 표시 중
        </span>
      </div>

      <p className="text-sm text-muted mb-4">
        메인 페이지 상단에 표시될 지역 탭을 관리합니다. 비활성화하면 해당 지역이
        탭 목록에서 숨겨집니다.
      </p>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <Card padding="none">
          <div className="divide-y divide-border">
            {districts.map((district) => (
              <div
                key={district.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div>
                  <span className="font-medium text-foreground">
                    {district.name}
                  </span>
                  <span className="text-xs text-muted ml-2">
                    {district.code}
                  </span>
                </div>

                {/* Toggle switch */}
                <button
                  onClick={() => handleToggle(district.id, !district.visible)}
                  disabled={toggling === district.id}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    district.visible ? "bg-primary" : "bg-gray-300"
                  } ${toggling === district.id ? "opacity-50" : ""}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      district.visible ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
