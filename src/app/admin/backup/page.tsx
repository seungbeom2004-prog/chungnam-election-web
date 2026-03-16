"use client";

import { useEffect, useState, useCallback } from "react";

interface BackupFile {
  filename: string;
  createdAt: string;
  sizeBytes: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(iso: string): string {
  if (!iso) return "-";
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      timeZone: "Asia/Seoul",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function BackupPage() {
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null);

  const loadBackups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/backup");
      const json = await res.json();
      if (json.success) setBackups(json.data ?? []);
      else setStatus({ type: "error", message: json.error ?? "목록 로드 실패" });
    } catch {
      setStatus({ type: "error", message: "백업 목록을 불러올 수 없습니다" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBackups();
  }, [loadBackups]);

  const handleCreate = async () => {
    setCreating(true);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create" }),
      });
      const json = await res.json();
      if (json.success) {
        setStatus({ type: "success", message: json.data?.message ?? "백업 생성 완료" });
        await loadBackups();
      } else {
        setStatus({ type: "error", message: json.error ?? "백업 생성 실패" });
      }
    } catch {
      setStatus({ type: "error", message: "백업 생성 중 오류가 발생했습니다" });
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async (filename: string) => {
    setRestoring(filename);
    setConfirmRestore(null);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore", filename }),
      });
      const json = await res.json();
      if (json.success) {
        setStatus({ type: "success", message: json.data?.message ?? "복구 완료" });
      } else {
        setStatus({ type: "error", message: json.error ?? "복구 실패" });
      }
    } catch {
      setStatus({ type: "error", message: "복구 중 오류가 발생했습니다" });
    } finally {
      setRestoring(null);
    }
  };

  const lastBackup = backups[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">백업 / 복구</h1>
        <p className="text-sm text-muted mt-1">데이터베이스 백업 및 복구 관리</p>
      </div>

      {/* Status message */}
      {status && (
        <div
          className={`rounded-xl px-4 py-3 text-sm font-medium ${
            status.type === "success"
              ? "bg-green-50 border border-green-200 text-green-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          {status.message}
        </div>
      )}

      {/* Info card */}
      <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted">마지막 백업</p>
            <p className="text-base font-semibold text-foreground mt-0.5">
              {lastBackup ? formatDate(lastBackup.createdAt) : "백업 없음"}
            </p>
            {lastBackup && (
              <p className="text-xs text-muted mt-0.5">{lastBackup.filename} · {formatBytes(lastBackup.sizeBytes)}</p>
            )}
          </div>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            {creating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                백업 중...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                지금 백업
              </>
            )}
          </button>
        </div>

        <div className="text-xs text-muted bg-background rounded-lg px-3 py-2.5 border border-border/50">
          자동 백업은 매일 오전 4시(한국 시간)에 실행됩니다. Vercel cron job 또는 외부 스케줄러에서{" "}
          <code className="font-mono bg-border/40 px-1 rounded">/api/admin/backup/scheduled</code>을 호출하도록 설정하세요.
          최대 2개의 백업이 보관되며, 오래된 백업은 자동으로 삭제됩니다.
        </div>
      </div>

      {/* Backup list */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <h2 className="text-base font-semibold text-foreground mb-4">백업 목록</h2>
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-6 h-6 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : backups.length === 0 ? (
          <p className="text-sm text-muted text-center py-8">백업이 없습니다. 지금 백업을 생성해 보세요.</p>
        ) : (
          <div className="space-y-3">
            {backups.map((b) => (
              <div key={b.filename} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border border-border rounded-xl">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate font-mono">{b.filename}</p>
                  <p className="text-xs text-muted mt-0.5">
                    {formatDate(b.createdAt)} · {formatBytes(b.sizeBytes)}
                  </p>
                </div>
                {confirmRestore === b.filename ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-orange-600 font-medium">정말 복구하시겠습니까?</span>
                    <button
                      onClick={() => handleRestore(b.filename)}
                      disabled={!!restoring}
                      className="px-3 py-1.5 bg-orange-500 text-white text-xs font-semibold rounded-lg hover:bg-orange-600 disabled:opacity-60 transition-colors"
                    >
                      {restoring === b.filename ? "복구 중..." : "확인"}
                    </button>
                    <button
                      onClick={() => setConfirmRestore(null)}
                      className="px-3 py-1.5 border border-border text-xs font-semibold rounded-lg hover:bg-background transition-colors text-muted"
                    >
                      취소
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmRestore(b.filename)}
                    disabled={!!restoring || creating}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 border border-border text-xs font-semibold rounded-lg hover:border-primary/40 hover:text-primary transition-colors disabled:opacity-50 text-muted"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                      <path d="M21 3v5h-5" />
                      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                      <path d="M8 16H3v5" />
                    </svg>
                    이 백업으로 복구
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
