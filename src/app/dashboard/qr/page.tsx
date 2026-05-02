"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { QRCodeCanvas } from "qrcode.react";

interface QrCode {
  id: string;
  code: string;
  name: string;
  targetPath: string;
  hitCount: number;
  createdAt: string;
}

export default function QRPage() {
  const { data: session } = useSession();
  const candidateId = (session?.user as { id?: string })?.id;
  const candidateName = session?.user?.name ?? "출마자";

  const [list, setList] = useState<QrCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [targetPath, setTargetPath] = useState("");
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
  }, [fetchList]);

  // Default targetPath = own profile page
  useEffect(() => {
    if (showCreate && !targetPath && candidateId) {
      setTargetPath(`/candidates/${candidateId}`);
    }
  }, [showCreate, targetPath, candidateId]);

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
      setTargetPath("");
      setShowCreate(false);
      fetchList();
    } catch {
      setError("네트워크 오류");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 QR 코드를 삭제하시겠습니까? 인쇄된 QR은 더 이상 작동하지 않습니다.")) return;
    const res = await fetch(`/api/qr?id=${id}`, { method: "DELETE" });
    if (res.ok) fetchList();
    else alert("삭제에 실패했습니다");
  };

  if (!candidateId) {
    return <div className="flex items-center justify-center h-64 text-muted">로딩 중...</div>;
  }

  return (
    <div className="max-w-screen-xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">QR 코드 관리</h1>
          <p className="text-xs text-muted mt-1">
            현수막·전단지 등 매체별로 다른 QR을 만들어 어디서 더 많이 유입됐는지 비교하세요.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="text-xs font-bold bg-primary text-white px-3 py-2 rounded-lg hover:bg-primary/90 transition-colors"
        >
          + 새 QR 만들기
        </button>
      </div>

      {/* Tip box */}
      <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-xs text-amber-800">
          💡 같은 페이지로 가는 QR도 이름을 다르게 만들면 어디서 더 많이 스캔됐는지 비교 가능 (예: &quot;현수막&quot;·&quot;전단지&quot;)
        </p>
      </div>

      {loading ? (
        <p className="text-muted text-sm">불러오는 중...</p>
      ) : list.length === 0 ? (
        <div className="bg-surface border border-dashed border-border rounded-2xl p-8 text-center">
          <p className="text-muted text-sm">아직 생성된 QR이 없습니다.</p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-3 text-xs font-bold bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            첫 QR 만들기
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((qr) => {
            const url = `${origin}/qr/${qr.code}`;
            return (
              <div key={qr.id} className="bg-surface border border-border rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm line-clamp-1">{qr.name}</p>
                    <p className="text-[10px] text-muted font-mono mt-0.5">{qr.targetPath}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(qr.id)}
                    className="shrink-0 text-[10px] text-red-500 hover:text-red-700 px-1.5 py-0.5 border border-red-200 rounded hover:bg-red-50"
                  >
                    삭제
                  </button>
                </div>

                <div className="flex justify-center bg-white rounded-xl p-3 border border-border">
                  <QRCodeCanvas value={url} size={140} level="H" includeMargin={false} />
                </div>

                <div className="text-center">
                  <p className="text-[10px] text-muted break-all">{url}</p>
                  <p className="text-xs font-bold text-primary mt-2">
                    👁️ {qr.hitCount.toLocaleString()} 회 스캔됨
                  </p>
                </div>

                <DownloadQRButton url={url} filename={`${candidateName}-${qr.name}-QR.png`} />
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
              <h2 className="font-bold text-foreground">새 QR 코드 만들기</h2>
              <button type="button" onClick={() => setShowCreate(false)} className="text-muted text-xl leading-none">×</button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">QR 이름 (라벨) *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="예: 현수막, 전단지, 명함"
                  maxLength={50}
                  required
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg"
                />
                <p className="text-[10px] text-muted mt-0.5">통계를 구분하는 데만 쓰입니다 — 사용자에게는 보이지 않습니다.</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">목적지 *</label>
                <input
                  type="text"
                  value={targetPath}
                  onChange={e => setTargetPath(e.target.value)}
                  placeholder="/candidates/내후보ID  또는  https://www.naver.com"
                  maxLength={1000}
                  required
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg font-mono"
                />
                <p className="text-[10px] text-muted mt-0.5">
                  사이트 내부 경로(<code>/</code>로 시작) 또는 외부 URL(<code>https://</code>로 시작) 모두 가능. 기본값: 내 프로필 페이지.
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
        <QRCodeCanvas value={url} size={512} level="H" includeMargin={true} />
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
