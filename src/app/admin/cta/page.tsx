"use client";

import { useEffect, useState, useCallback } from "react";

interface CtaConfig {
  id: string;
  headline: string;
  subtext: string | null;
  targetPages: string[];
  triggerDelay: number;
  cooldownHours: number;
  maxShows: number;
  showIssues: boolean;
  ctaUrl: string;
  ctaLabel: string;
  isActive: boolean;
  createdAt: string;
}

const PAGE_OPTIONS = [
  { label: "모든 페이지", value: "*" },
  { label: "제보/이슈 (/proposals)", value: "/proposals" },
  { label: "공약지도 (/map)", value: "/map" },
  { label: "후보자 목록 (/candidates)", value: "/candidates" },
  { label: "홈 (/)", value: "/" },
];

const DEFAULT_FORM = {
  headline: "같은 문제를 겪고 있다면?",
  subtext: "주변의 지역 이슈를 확인하고 직접 제보해 주세요",
  targetPages: ["*"],
  triggerDelay: 30,
  cooldownHours: 24,
  maxShows: 3,
  showIssues: true,
  ctaUrl: "/proposals",
  ctaLabel: "나도 제보하러 가기",
  isActive: true,
};

type FormState = typeof DEFAULT_FORM;

export default function AdminCtaPage() {
  const [configs, setConfigs] = useState<CtaConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [targetInput, setTargetInput] = useState("*");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/cta");
      const json = await res.json();
      setConfigs(json.data ?? []);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setTargetInput("*");
    setShowModal(true);
  }

  function openEdit(cfg: CtaConfig) {
    setEditingId(cfg.id);
    setForm({
      headline: cfg.headline,
      subtext: cfg.subtext ?? "",
      targetPages: cfg.targetPages ?? ["*"],
      triggerDelay: cfg.triggerDelay,
      cooldownHours: cfg.cooldownHours,
      maxShows: cfg.maxShows,
      showIssues: cfg.showIssues,
      ctaUrl: cfg.ctaUrl,
      ctaLabel: cfg.ctaLabel,
      isActive: cfg.isActive,
    });
    setTargetInput((cfg.targetPages ?? ["*"]).join(", "));
    setShowModal(true);
  }

  async function handleSave() {
    setSaving(true);
    // Parse targetPages from comma-separated input
    const pages = targetInput
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    const payload = { ...form, targetPages: pages.length ? pages : ["*"] };

    try {
      const url = editingId ? `/api/admin/cta/${editingId}` : "/api/admin/cta";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("저장 실패");
      setShowModal(false);
      load();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(cfg: CtaConfig) {
    await fetch(`/api/admin/cta/${cfg.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !cfg.isActive }),
    });
    load();
  }

  async function handleDelete(cfg: CtaConfig) {
    if (!confirm(`"${cfg.headline}" CTA를 삭제하시겠습니까?`)) return;
    await fetch(`/api/admin/cta/${cfg.id}`, { method: "DELETE" });
    load();
  }

  function formatTrigger(sec: number) {
    if (sec < 60) return `${sec}초`;
    return `${Math.floor(sec / 60)}분 ${sec % 60 ? `${sec % 60}초` : ""}`.trim();
  }

  function formatPages(pages: string[]) {
    if (pages.includes("*")) return "모든 페이지";
    return pages.join(", ");
  }

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">CTA 배너 관리</h1>
          <p className="text-sm text-muted mt-1">
            방문자 체류 시간 기반 제보/이슈 유도 팝업 배너를 관리합니다
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          새 CTA 만들기
        </button>
      </div>

      {/* Info Box */}
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6 text-sm text-orange-800">
        <strong>💡 CTA 배너란?</strong> 방문자가 지정된 시간(체류 임계값) 동안 페이지를 보고 있으면
        자동으로 등록된 이슈 목록과 함께 &quot;제보하러 가기&quot; 팝업을 띄워 참여를 유도하는 기능입니다.
        쿨타임과 최대 노출 횟수로 반복 노출을 조절할 수 있습니다.
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-20 text-muted">불러오는 중...</div>
      ) : configs.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">📢</p>
          <p className="text-muted">등록된 CTA 배너가 없습니다</p>
          <button
            onClick={openCreate}
            className="mt-4 text-primary text-sm hover:underline"
          >
            첫 CTA 배너 만들기 →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {configs.map((cfg) => (
            <div
              key={cfg.id}
              className={`border rounded-xl p-4 transition-colors ${
                cfg.isActive
                  ? "bg-surface border-border"
                  : "bg-background border-border opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        cfg.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {cfg.isActive ? "활성" : "비활성"}
                    </span>
                    <h3 className="font-semibold text-foreground">{cfg.headline}</h3>
                  </div>
                  {cfg.subtext && (
                    <p className="text-sm text-muted truncate mb-2">{cfg.subtext}</p>
                  )}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                    <span title="표출 페이지">
                      📍 {formatPages(cfg.targetPages)}
                    </span>
                    <span title="체류 임계값 (이 시간 이후 배너 표시)">
                      ⏱ {formatTrigger(cfg.triggerDelay)} 후 표시
                    </span>
                    <span title="재노출 쿨타임">
                      🔄 쿨타임 {cfg.cooldownHours}시간
                    </span>
                    <span title="최대 노출 횟수">
                      👁 최대 {cfg.maxShows > 0 ? `${cfg.maxShows}회` : "무제한"}
                    </span>
                    {cfg.showIssues && (
                      <span className="text-orange-600">📋 이슈 목록 표시</span>
                    )}
                    <span title="버튼 URL">
                      🔗 {cfg.ctaUrl}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {/* Toggle */}
                  <button
                    onClick={() => handleToggle(cfg)}
                    title={cfg.isActive ? "비활성화" : "활성화"}
                    className={`relative inline-flex h-6 w-11 rounded-full transition-colors focus:outline-none ${
                      cfg.isActive ? "bg-green-500" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`inline-block w-4 h-4 transform rounded-full bg-white shadow transition-transform mt-1 ${
                        cfg.isActive ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                  {/* Edit */}
                  <button
                    onClick={() => openEdit(cfg)}
                    className="p-1.5 text-muted hover:text-primary hover:bg-primary-light rounded-lg transition-colors"
                    title="편집"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M11.5 2.5a1.414 1.414 0 012 2L5 13l-3 1 1-3 8.5-8.5z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(cfg)}
                    className="p-1.5 text-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="삭제"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9h8l1-9H3z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 p-4">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-surface border-b border-border px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {editingId ? "CTA 배너 편집" : "새 CTA 배너 만들기"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-muted hover:text-foreground text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Headline */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">
                  메인 문구 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.headline}
                  onChange={(e) => setForm((f) => ({ ...f, headline: e.target.value }))}
                  placeholder="같은 문제를 겪고 있다면?"
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Subtext */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">
                  부제 (선택)
                </label>
                <input
                  type="text"
                  value={form.subtext ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, subtext: e.target.value }))}
                  placeholder="지역 이슈를 확인하고 직접 제보해 주세요"
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* CTA Label + URL */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1">
                    버튼 텍스트
                  </label>
                  <input
                    type="text"
                    value={form.ctaLabel}
                    onChange={(e) => setForm((f) => ({ ...f, ctaLabel: e.target.value }))}
                    placeholder="나도 제보하러 가기"
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1">
                    이동 URL
                  </label>
                  <input
                    type="text"
                    value={form.ctaUrl}
                    onChange={(e) => setForm((f) => ({ ...f, ctaUrl: e.target.value }))}
                    placeholder="/proposals"
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Target Pages */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">
                  표출 페이지
                </label>
                <p className="text-xs text-muted mb-2">
                  쉼표로 구분해 입력하세요. <code className="bg-background px-1 rounded">*</code>는 모든 페이지
                </p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {PAGE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setTargetInput(opt.value)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        targetInput === opt.value
                          ? "bg-primary text-white border-primary"
                          : "border-border text-muted hover:border-primary hover:text-primary"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={targetInput}
                  onChange={(e) => setTargetInput(e.target.value)}
                  placeholder="*, /proposals, /map"
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Timing fields */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1">
                    체류 임계값
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={5}
                      max={600}
                      value={form.triggerDelay}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, triggerDelay: Number(e.target.value) }))
                      }
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary pr-8"
                    />
                    <span className="absolute right-2.5 top-2 text-xs text-muted">초</span>
                  </div>
                  <p className="text-xs text-muted mt-0.5">이 시간 후 배너 표시</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1">
                    재노출 쿨타임
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={720}
                      value={form.cooldownHours}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, cooldownHours: Number(e.target.value) }))
                      }
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary pr-10"
                    />
                    <span className="absolute right-2.5 top-2 text-xs text-muted">시간</span>
                  </div>
                  <p className="text-xs text-muted mt-0.5">0 = 항상 재노출</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1">
                    최대 노출 횟수
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={99}
                      value={form.maxShows}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, maxShows: Number(e.target.value) }))
                      }
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary pr-8"
                    />
                    <span className="absolute right-2.5 top-2 text-xs text-muted">회</span>
                  </div>
                  <p className="text-xs text-muted mt-0.5">0 = 무제한</p>
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, showIssues: !f.showIssues }))}
                    className={`relative inline-flex h-6 w-11 rounded-full transition-colors focus:outline-none ${
                      form.showIssues ? "bg-primary" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`inline-block w-4 h-4 transform rounded-full bg-white shadow transition-transform mt-1 ${
                        form.showIssues ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                  <div>
                    <p className="text-sm font-medium">이슈 목록 표시</p>
                    <p className="text-xs text-muted">배너에 상위 이슈 최대 5개를 보여줍니다</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
                    className={`relative inline-flex h-6 w-11 rounded-full transition-colors focus:outline-none ${
                      form.isActive ? "bg-green-500" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`inline-block w-4 h-4 transform rounded-full bg-white shadow transition-transform mt-1 ${
                        form.isActive ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                  <div>
                    <p className="text-sm font-medium">활성화</p>
                    <p className="text-xs text-muted">비활성화하면 배너가 표시되지 않습니다</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-surface border-t border-border px-6 py-4 flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-muted hover:text-foreground border border-border rounded-lg transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.headline.trim()}
                className="px-5 py-2 text-sm font-semibold bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {saving ? "저장 중..." : editingId ? "저장" : "만들기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
