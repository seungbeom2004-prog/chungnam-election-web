"use client";

import { useState } from "react";
import { Button, Card } from "@/components/ui";

interface SyncResult {
  synced: { districts: number; elections: number };
  errors?: string[];
  message: string;
}

interface PreviewItem {
  name: string;
  code: string;
  wOrder: string;
}

export default function NecSyncPage() {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<PreviewItem[]>([]);
  const [previewTotal, setPreviewTotal] = useState(0);

  const handlePreview = async () => {
    setPreviewing(true);
    setPreview([]);
    try {
      const res = await fetch("/api/admin/nec-sync");
      const json = await res.json();
      if (res.ok) {
        setPreview(json.data?.preview ?? []);
        setPreviewTotal(json.data?.total ?? 0);
      } else {
        alert(json.error || "미리보기 실패");
      }
    } catch {
      alert("네트워크 오류");
    }
    setPreviewing(false);
  };

  const handleSync = async () => {
    if (!confirm("선관위 API에서 충청남도 지방선거 데이터를 가져와 DB에 저장합니다. 계속하시겠습니까?"))
      return;

    setSyncing(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/nec-sync", { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        setResult(json.data);
      } else {
        alert(json.error || "동기화 실패");
      }
    } catch {
      alert("네트워크 오류");
    }
    setSyncing(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">선관위 데이터 동기화</h1>
          <p className="text-sm text-muted mt-1">
            중앙선거관리위원회 API에서 충청남도 지방선거 정보를 가져와 DB에 저장합니다.
            이후 서비스는 빠른 DB 조회를 사용합니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={handlePreview} disabled={previewing || syncing}>
            {previewing ? "조회 중..." : "미리보기"}
          </Button>
          <Button size="sm" onClick={handleSync} disabled={syncing || previewing}>
            {syncing ? "동기화 중..." : "DB 동기화"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card>
          <h3 className="font-semibold text-foreground mb-2">동기화 대상</h3>
          <ul className="text-sm text-muted space-y-1">
            <li>• 충청남도 구시군 목록 (선거구)</li>
            <li>• 제9회 전국동시지방선거 정보 (2026.06.03)</li>
          </ul>
        </Card>
        <Card>
          <h3 className="font-semibold text-foreground mb-2">동기화 효과</h3>
          <ul className="text-sm text-muted space-y-1">
            <li>• 선거구 드롭다운이 DB에서 즉시 로드됩니다</li>
            <li>• 외부 API 호출 없이 빠른 응답</li>
            <li>• 기존 지역 좌표 데이터는 유지됩니다</li>
          </ul>
        </Card>
      </div>

      {/* Result */}
      {result && (
        <Card className="mb-6">
          <div className={`flex items-start gap-3 ${result.errors?.length ? "text-amber-600" : "text-green-600"}`}>
            <span className="text-xl">{result.errors?.length ? "⚠️" : "✅"}</span>
            <div>
              <p className="font-semibold">{result.message}</p>
              {result.errors && result.errors.length > 0 && (
                <ul className="mt-2 text-sm space-y-1">
                  {result.errors.map((err, i) => (
                    <li key={i} className="text-red-500">{err}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Preview */}
      {preview.length > 0 && (
        <Card padding="none">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="font-semibold text-foreground">
              NEC API 미리보기 — 충청남도 ({previewTotal}개 선거구)
            </h3>
          </div>
          <div className="divide-y divide-border max-h-96 overflow-y-auto">
            {preview.map((item, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2 text-sm">
                <span className="font-medium text-foreground">{item.name}</span>
                <div className="flex items-center gap-4 text-muted">
                  <span className="font-mono text-xs">{item.code}</span>
                  <span>순서: {item.wOrder}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {syncing && (
        <div className="flex items-center gap-3 text-sm text-muted py-4">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          선관위 API에서 데이터를 가져오는 중... (수 초 소요될 수 있습니다)
        </div>
      )}
    </div>
  );
}
