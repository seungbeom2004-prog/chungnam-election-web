"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { QRCodeCanvas } from "qrcode.react";

interface QrCode {
  id: string;
  code: string;
  name: string;
  targetPath: string;
  ownerType: string;
  ownerId: string | null;
  hitCount: number;
  createdAt: string;
}

interface Candidate {
  id: string;
  name: string;
  district: string;
}

export default function AdminQRPage() {
  const [list, setList] = useState<QrCode[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState("");

  const [filter, setFilter] = useState<"all" | "admin" | "candidate">("all");

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [targetPath, setTargetPath] = useState("/");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchList = useCallback(() => {
    setLoading(true);
    fetch("/api/qr")
      .then(r => r.json())
      .then(json => setList(json.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
    fetchList();
    // load candidates for ownerId display
    fetch("/api/admin/candidates?limit=500")
      .then(r => r.json())
      .then(json => setCandidates(json.data ?? json ?? []))
      .catch(() => {});
  }, [fetchList]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, targetPath }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "생성에 실패했습니다");
        return;
      }
      setName("");
      setTargetPath("/");
      setShowCreate(false);
      fetchList();
    } catch {
      setError("네트워크 오류");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" QR을 삭제하시겠습니까? 인쇄된 QR은 더 이상 작동하지 않습니다.`)) return;
    const res = await fetch(`/api/qr?id=${id}`, { method: "DELETE" });
    if (res.ok) fetchList();
    else alert("삭제에 실패했습니다");
  };

  const filtered = filter === "all"
    ? list
    : list.filter(q => q.ownerType === filter);

  // ── Stats summary ──
  const totalHits = list.reduce((sum, q) => sum + q.hitCount, 0);
  const topQr = [...list].sort((a, b) => b.hitCount - a.hitCount)[0];

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">QR 코드 관리</h1>
          <p className="text-sm text-muted mt-0.5">사이트 내부 페이지에 대한 단축 링크 + 유입 추적 (A/B 테스트 가능)</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="text-sm font-bold bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
        >
          + 새 QR 만들기
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <SummaryCard label="총 QR 개수" value={list.length} />
        <SummaryCard label="총 스캔 수" value={totalHits} highlight />
        <SummaryCard label="관리자 QR" value={list.filter(q => q.ownerType === "admin").length} />
        <SummaryCard label="후보자 QR" value={list.filter(q => q.ownerType === "candidate").length} />
      </div>

      {topQr && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
          <p className="text-xs text-emerald-800">
            🏆 가장 많이 스캔된 QR: <strong>{topQr.name}</strong> ({topQr.hitCount.toLocaleString()}회) → <code className="bg-white px-1 py-0.5 rounded text-[10px] font-mono">{topQr.targetPath}</code>
          </p>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(["all", "admin", "candidate"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              filter === f
                ? "bg-primary text-white border-primary"
                : "border-border text-muted hover:text-foreground"
            }`}
          >
            {f === "all" ? `전체 (${list.length})` : f === "admin" ? `관리자 (${list.filter(q => q.ownerType === "admin").length})` : `후보자 (${list.filter(q => q.ownerType === "candidate").length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted text-sm">불러오는 중...</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted text-sm">QR 코드가 없습니다.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((qr) => {
            const url = `${origin}/qr/${qr.code}`;
            const owner = qr.ownerType === "admin" ? "관리자" : (candidates.find(c => c.id === qr.ownerId)?.name ?? "후보자");
            return (
              <div key={qr.id} className="bg-surface border border-border rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${qr.ownerType === "admin" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                        {qr.ownerType === "admin" ? "관리자" : owner}
                      </span>
                      <span className="text-[10px] text-muted font-mono">{qr.code}</span>
                    </div>
                    <p className="font-semibold text-foreground text-sm line-clamp-1">{qr.name}</p>
                    <p className="text-[10px] text-muted font-mono mt-0.5 truncate">{qr.targetPath}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(qr.id, qr.name)}
                    className="shrink-0 text-[10px] text-red-500 hover:text-red-700 px-1.5 py-0.5 border border-red-200 rounded hover:bg-red-50"
                  >
                    삭제
                  </button>
                </div>

                <div className="flex justify-center bg-white rounded-xl p-3 border border-border">
                  <QRCodeCanvas value={url} size={120} level="H" includeMargin={false} />
                </div>

                <div className="text-center">
                  <p className="text-[10px] text-muted break-all">{url}</p>
                  <p className="text-xs font-bold text-primary mt-2">
                    👁️ {qr.hitCount.toLocaleString()} 회 스캔됨
                  </p>
                </div>

                <DownloadQRButton url={url} filename={`QR-${qr.name}.png`} />
              </div>
            );
          })}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowCreate(false)}>
          <form
            onSubmit={handleCreate}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="font-bold text-foreground">새 QR 코드 만들기 (관리자)</h2>
              <button type="button" onClick={() => setShowCreate(false)} className="text-muted text-xl leading-none">×</button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">QR 이름 (구분 라벨) *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="예: 메인페이지-현수막, 메인페이지-전단지"
                  maxLength={50}
                  required
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg"
                />
                <p className="text-[10px] text-muted mt-0.5">A/B 테스트하려면 같은 경로에 다른 이름의 QR을 만드세요.</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">목적지 *</label>
                <input
                  type="text"
                  value={targetPath}
                  onChange={e => setTargetPath(e.target.value)}
                  placeholder="/  또는  https://www.example.com"
                  maxLength={1000}
                  required
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg font-mono"
                />
                <p className="text-[10px] text-muted mt-0.5">
                  내부: <code>/</code>(메인) · <code>/issues</code> · <code>/candidates/abc123</code><br/>
                  외부: <code>https://www.naver.com</code> · <code>https://youtu.be/xxx</code> 등 모든 URL 지원
                </p>
              </div>
              {error && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            </div>
            <div className="flex gap-2 px-5 py-4 border-t">
              <button
                type="submit"
                disabled={submitting || !name.trim() || !(targetPath.startsWith("/") || /^https?:\/\//i.test(targetPath))}
                className="flex-1 px-4 py-2 text-sm font-bold bg-primary text-white rounded-lg disabled:opacity-50"
              >
                {submitting ? "생성 중..." : "QR 생성"}
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-sm border border-border rounded-lg"
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`border rounded-xl p-4 ${highlight ? "bg-primary/5 border-primary/30" : "bg-surface border-border"}`}>
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${highlight ? "text-primary" : "text-foreground"}`}>{value.toLocaleString()}</p>
    </div>
  );
}

function DownloadQRButton({ url, filename }: { url: string; filename: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const handleDownload = () => {
    const canvas = ref.current?.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = filename;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };
  return (
    <>
      <div ref={ref} className="hidden">
        {/* bgColor를 투명으로 설정 — 다운로드되는 PNG는 알파채널이 살아있어 어떤 배경 위에도 자연스럽게 합성 */}
        <QRCodeCanvas value={url} size={512} level="H" includeMargin={true} bgColor="rgba(0,0,0,0)" />
      </div>
      <button
        onClick={handleDownload}
        className="w-full text-xs font-medium bg-background border border-border text-foreground px-3 py-1.5 rounded-lg hover:bg-primary/5"
      >
        ⬇️ PNG 저장 (고해상도)
      </button>
    </>
  );
}
