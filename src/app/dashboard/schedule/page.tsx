"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button, Input, Card } from "@/components/ui";
import type { Schedule } from "@/types";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function toLocalDatetimeString(dateStr: string) {
  const d = new Date(dateStr);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function SchedulePage() {
  const { data: session } = useSession();
  const candidateId = (session?.user as { id?: string })?.id;

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    startDate: "",
    endDate: "",
    location: "",
    isPublic: true,
  });

  const fetchSchedules = useCallback(async () => {
    if (!candidateId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/schedules?candidateId=${candidateId}`);
      const json = await res.json();
      setSchedules(json.data ?? []);
    } catch {
      console.error("Failed to fetch schedules");
    }
    setLoading(false);
  }, [candidateId]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const resetForm = () => {
    setForm({ title: "", description: "", startDate: "", endDate: "", location: "", isPublic: true });
    setEditingSchedule(null);
    setShowForm(false);
  };

  const handleEdit = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setForm({
      title: schedule.title,
      description: schedule.description || "",
      startDate: toLocalDatetimeString(schedule.startDate),
      endDate: schedule.endDate ? toLocalDatetimeString(schedule.endDate) : "",
      location: schedule.location || "",
      isPublic: schedule.isPublic,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        description: form.description || null,
        startDate: new Date(form.startDate).toISOString(),
        endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
        location: form.location || null,
        isPublic: form.isPublic,
      };

      if (editingSchedule) {
        await fetch(`/api/schedules/${editingSchedule.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch("/api/schedules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      resetForm();
      await fetchSchedules();
    } catch {
      alert("저장에 실패했습니다.");
    }
    setSaving(false);
  };

  const handleDelete = async (scheduleId: string) => {
    if (!confirm("이 일정을 삭제하시겠습니까?")) return;
    setActionLoading(scheduleId);
    try {
      await fetch(`/api/schedules/${scheduleId}`, { method: "DELETE" });
      await fetchSchedules();
    } catch {
      alert("삭제에 실패했습니다.");
    }
    setActionLoading(null);
  };

  // Group schedules by month
  const groupedSchedules = schedules.reduce<Record<string, Schedule[]>>((acc, s) => {
    const month = new Date(s.startDate).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
    });
    if (!acc[month]) acc[month] = [];
    acc[month].push(s);
    return acc;
  }, {});

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-foreground">일정 관리</h1>
        <Button
          size="sm"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          + 일정 추가
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="mb-6">
          <h2 className="text-base font-semibold text-foreground mb-4">
            {editingSchedule ? "일정 수정" : "새 일정 추가"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              label="일정 제목"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              placeholder="예: 천안시 간담회"
            />
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                설명 (선택)
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="일정에 대한 설명"
                rows={2}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors resize-none"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="시작 일시"
                type="datetime-local"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                required
              />
              <Input
                label="종료 일시 (선택)"
                type="datetime-local"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
            </div>
            <Input
              label="장소 (선택)"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="예: 천안시청 대회의실"
            />
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPublic"
                checked={form.isPublic}
                onChange={(e) => setForm({ ...form, isPublic: e.target.checked })}
                className="w-4 h-4 text-primary border-border rounded"
              />
              <label htmlFor="isPublic" className="text-sm text-foreground">
                공개 일정 (방문자에게 표시됨)
              </label>
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? "저장 중..." : "저장"}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
                취소
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Schedule list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : schedules.length === 0 ? (
        <Card padding="lg">
          <p className="text-center text-muted py-8">등록된 일정이 없습니다.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedSchedules).map(([month, monthSchedules]) => (
            <div key={month}>
              <h3 className="text-sm font-semibold text-muted mb-2">{month}</h3>
              <div className="space-y-2">
                {monthSchedules.map((schedule) => (
                  <Card key={schedule.id} padding="md">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-foreground">
                            {schedule.title}
                          </span>
                          {!schedule.isPublic && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                              비공개
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-muted">
                          {formatDate(schedule.startDate)}
                          {schedule.endDate && ` ~ ${formatDate(schedule.endDate)}`}
                        </p>
                        {schedule.location && (
                          <p className="text-sm text-muted">📍 {schedule.location}</p>
                        )}
                        {schedule.description && (
                          <p className="mt-1 text-sm text-foreground/70">
                            {schedule.description}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(schedule)}
                          disabled={actionLoading === schedule.id}
                        >
                          수정
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleDelete(schedule.id)}
                          disabled={actionLoading === schedule.id}
                        >
                          삭제
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
