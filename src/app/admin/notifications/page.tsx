"use client";

import { useState, useEffect, useCallback } from "react";
import { Button, Card } from "@/components/ui";

interface Candidate {
  id: string;
  name: string;
  district: string;
  verified: boolean;
}

interface Notification {
  id: string;
  targetId: string | null;
  title: string;
  message: string;
  level: "info" | "warning" | "urgent";
  isRead: boolean;
  createdAt: string;
}

const LEVEL_LABELS: Record<string, string> = {
  info: "일반",
  warning: "경고",
  urgent: "긴급",
};
const LEVEL_COLORS: Record<string, string> = {
  info: "bg-blue-50 text-blue-800 border-blue-200",
  warning: "bg-amber-50 text-amber-800 border-amber-200",
  urgent: "bg-red-50 text-red-800 border-red-200",
};
const LEVEL_BADGE: Record<string, string> = {
  info: "bg-blue-100 text-blue-700",
  warning: "bg-amber-100 text-amber-700",
  urgent: "bg-red-100 text-red-700",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금";
  if (mins < 60) return `${mins}분 전`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}시간 전`;
  return new Date(dateStr).toLocaleDateString("ko-KR");
}

export default function AdminNotificationsPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [migrationNeeded, setMigrationNeeded] = useState(false);

  // Form state
  const [targetId, setTargetId] = useState<string>(""); // "" = broadcast
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [level, setLevel] = useState<"info" | "warning" | "urgent">("info");
  const [formMsg, setFormMsg] = useState("");
  const [formMsgType, setFormMsgType] = useState<"success" | "error">("success");

  const fetchData = useCallback(async () => {
    try {
      const [candRes, notiRes] = await Promise.all([
        fetch("/api/admin/candidates"),
        fetch("/api/admin/notifications?limit=50"),
      ]);
      const candJson = await candRes.json();
      const notiJson = await notiRes.json();

      const cands: Candidate[] = (candJson.data ?? []).filter(
        (c: { role: string }) => c.role !== "admin"
      );
      setCandidates(cands);

      if (notiJson.success === false && notiJson.message?.includes("v11")) {
        setMigrationNeeded(true);
        setNotifications([]);
      } else {
        setNotifications(notiJson.data?.data ?? []);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;
    setSending(true);
    setFormMsg("");

    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetId: targetId || null,
          title: title.trim(),
          message: message.trim(),
          level,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setFormMsgType("success");
        setFormMsg(
          targetId
            ? `${candidates.find((c) => c.id === targetId)?.name ?? "후보"}에게 알림을 보냈습니다.`
            : `전체 후보자(${candidates.length}명)에게 알림을 보냈습니다.`
        );
        setTitle("");
        setMessage("");
        setLevel("info");
        await fetchData();
      } else if (json.message?.includes("v11")) {
        setMigrationNeeded(true);
        setFormMsgType("error");
        setFormMsg("알림 테이블이 없습니다. Supabase SQL Editor에서 migration v11을 실행해주세요.");
      } else {
        setFormMsgType("error");
        setFormMsg(json.message ?? "전송에 실패했습니다.");
      }
    } catch {
      setFormMsgType("error");
      setFormMsg("오류가 발생했습니다.");
    }
    setSending(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 알림을 삭제하시겠습니까?")) return;
    await fetch(`/api/admin/notifications?id=${id}`, { method: "DELETE" });
    await fetchData();
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">알림 관리</h1>
        <p className="text-sm text-muted mt-0.5">후보자에게 알림을 보내고 관리합니다</p>
      </div>

      {/* Migration notice */}
      {migrationNeeded && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-300 rounded-xl">
          <p className="text-sm font-semibold text-amber-800 mb-1">⚠️ 데이터베이스 마이그레이션 필요</p>
          <p className="text-xs text-amber-700 mb-2">
            알림 기능을 사용하려면 Supabase SQL Editor에서 아래 파일을 실행해주세요:
          </p>
          <code className="block text-xs bg-amber-100 px-3 py-2 rounded font-mono text-amber-900">
            prisma/supabase-migration-v11.sql
          </code>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Send form */}
        <Card padding="lg">
          <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <span className="text-primary">📣</span> 알림 보내기
          </h2>
          <form onSubmit={handleSend} className="space-y-3">
            {/* Target */}
            <div>
              <label className="block text-xs font-medium text-muted mb-1">수신 대상</label>
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="">📢 전체 후보자 ({candidates.length}명)</option>
                {candidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.district || "선거구 미지정"}
                    {!c.verified ? " (미승인)" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Level */}
            <div>
              <label className="block text-xs font-medium text-muted mb-1">알림 레벨</label>
              <div className="flex gap-2">
                {(["info", "warning", "urgent"] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLevel(l)}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                      level === l
                        ? LEVEL_COLORS[l] + " border-2 font-semibold"
                        : "bg-background text-muted border-border hover:border-foreground/30"
                    }`}
                  >
                    {l === "info" ? "ℹ️" : l === "warning" ? "⚠️" : "🚨"} {LEVEL_LABELS[l]}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-muted mb-1">제목 *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="알림 제목을 입력하세요"
                maxLength={80}
                required
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-xs font-medium text-muted mb-1">내용 *</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="알림 내용을 입력하세요"
                rows={4}
                maxLength={500}
                required
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              />
              <p className="text-xs text-muted text-right mt-0.5">{message.length}/500</p>
            </div>

            {formMsg && (
              <p className={`text-xs px-3 py-2 rounded-lg border ${
                formMsgType === "success"
                  ? "bg-green-50 text-green-700 border-green-200"
                  : "bg-red-50 text-red-700 border-red-200"
              }`}>
                {formMsgType === "success" ? "✓ " : "✗ "}{formMsg}
              </p>
            )}

            <Button
              type="submit"
              disabled={sending || !title.trim() || !message.trim()}
              className="w-full"
            >
              {sending ? "전송 중..." : targetId ? "선택 후보자에게 전송" : "전체 후보자에게 전송"}
            </Button>
          </form>
        </Card>

        {/* Sent notifications */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <span>📋</span> 전송된 알림
              <span className="text-xs font-normal text-muted">({notifications.length}건)</span>
            </h2>
            <button
              onClick={fetchData}
              className="text-xs text-primary hover:underline"
            >
              새로고침
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <Card padding="lg">
              <p className="text-center text-muted text-sm py-4">전송된 알림이 없습니다</p>
            </Card>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {notifications.map((n) => {
                const target = candidates.find((c) => c.id === n.targetId);
                return (
                  <div
                    key={n.id}
                    className={`p-3 rounded-xl border text-sm ${LEVEL_COLORS[n.level]}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${LEVEL_BADGE[n.level]}`}>
                          {LEVEL_LABELS[n.level]}
                        </span>
                        <span className="text-[10px] text-muted">
                          {n.targetId ? `→ ${target?.name ?? n.targetId}` : "→ 전체 브로드캐스트"}
                        </span>
                        <span className="text-[10px] text-muted">{timeAgo(n.createdAt)}</span>
                      </div>
                      <button
                        onClick={() => handleDelete(n.id)}
                        className="shrink-0 text-muted hover:text-red-500 transition-colors"
                        title="삭제"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>
                    <p className="font-semibold leading-snug">{n.title}</p>
                    <p className="text-xs mt-0.5 leading-snug opacity-80">{n.message}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
