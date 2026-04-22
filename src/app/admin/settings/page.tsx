"use client";

import { useState, useEffect } from "react";
import { Button, Input } from "@/components/ui";
import Card from "@/components/ui/Card";
import { type UITexts, DEFAULT_UI_TEXTS } from "@/lib/ui-texts";
import { invalidateUITextsCache } from "@/hooks/useUITexts";

// Zoom level descriptions (Naver Maps zoom values — 5=province-wide, 16=street)
const ZOOM_LABELS: Record<number, string> = {
  5:  "전국 수준 (매우 넓게)",
  6:  "도 전체",
  7:  "광역 지역",
  8:  "시군 전체",
  9:  "시군 (권장 기본값)",
  10: "읍면동 수준",
  11: "상세 지역",
  12: "동네 수준",
  13: "상세 동네",
  14: "골목 수준",
  15: "건물 수준",
  16: "매우 상세",
};

interface DistrictItem {
  name: string;
  centerLat: number;
  centerLng: number;
}

function WarmCacheButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");

  const handleWarm = async () => {
    setLoading(true);
    setResult("");
    try {
      const res = await fetch("/api/admin/warm-cache", {
        method: "POST",
        headers: { "x-admin-secret": process.env.NEXT_PUBLIC_ADMIN_SECRET ?? "" },
      });
      const json = await res.json();
      if (res.ok) {
        setResult(`✅ 완료: ${json.ok}/${json.total}건 캐시 생성 (실패: ${json.failed}건)`);
      } else {
        setResult(`❌ 오류: ${json.error ?? "알 수 없는 오류"}`);
      }
    } catch (e) {
      setResult(`❌ 네트워크 오류: ${e}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <Button type="button" onClick={handleWarm} disabled={loading}>
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              캐시 생성 중... (최대 60초)
            </span>
          ) : (
            "📊 현황판 캐시 워밍 실행"
          )}
        </Button>
        <span className="text-xs text-muted">3월 1일부터 현재까지 캐시 생성</span>
      </div>
      {result && (
        <p className={`text-sm px-3 py-2 rounded-lg ${result.startsWith("✅") ? "text-green-600 bg-green-50" : "text-red-500 bg-red-50"}`}>
          {result}
        </p>
      )}
    </div>
  );
}

export default function AdminSettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  // Pin settings
  const [pinEmoji, setPinEmoji] = useState("📍");
  const [pinColor, setPinColor] = useState("#FF5A00");
  const [pinSaving, setPinSaving] = useState(false);
  const [pinMessage, setPinMessage] = useState("");
  const [pinLoading, setPinLoading] = useState(true);

  // Map default layer visibility
  const [mapDefaultMinwon, setMapDefaultMinwon] = useState(true);
  const [mapDefaultProposal, setMapDefaultProposal] = useState(true);
  const [mapDefaultPledge, setMapDefaultPledge] = useState(true);
  const [mapDefaultSaving, setMapDefaultSaving] = useState(false);
  const [mapDefaultMessage, setMapDefaultMessage] = useState("");

  // Default zoom (map scale)
  const [defaultZoom, setDefaultZoom] = useState(9);

  // Default district
  const [defaultDistrict, setDefaultDistrict] = useState<string | null>(null);
  const [districts, setDistricts] = useState<DistrictItem[]>([]);

  // UI texts customization
  const [uiTexts, setUITexts] = useState<UITexts>(DEFAULT_UI_TEXTS);
  const [uiTextsLoading, setUITextsLoading] = useState(true);
  const [uiTextsSaving, setUITextsSaving] = useState(false);
  const [uiTextsMessage, setUITextsMessage] = useState("");

  // Banned words state
  const [bannedWords, setBannedWords] = useState<string[]>([]);
  const [bannedWordInput, setBannedWordInput] = useState("");
  const [bannedRedirectUrl, setBannedRedirectUrl] = useState("https://check.junseok.kr/");
  const [bannedLoading, setBannedLoading] = useState(true);
  const [bannedSaving, setBannedSaving] = useState(false);
  const [bannedMessage, setBannedMessage] = useState("");

  // NEC sync state
  const [syncingDistricts, setSyncingDistricts] = useState(false);
  const [syncingWards, setSyncingWards] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");

  const handleAddBannedWord = () => {
    const word = bannedWordInput.trim();
    if (!word || bannedWords.includes(word)) { setBannedWordInput(""); return; }
    setBannedWords((prev) => [...prev, word]);
    setBannedWordInput("");
  };

  const handleRemoveBannedWord = (word: string) => {
    setBannedWords((prev) => prev.filter((w) => w !== word));
  };

  const handleSaveBannedWords = async () => {
    setBannedMessage("");
    setBannedSaving(true);
    try {
      const res = await fetch("/api/admin/banned-words", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bannedWords, redirectUrl: bannedRedirectUrl }),
      });
      const json = await res.json();
      if (!res.ok) {
        setBannedMessage(json.error || "저장에 실패했습니다.");
      } else {
        setBannedMessage("금지어 설정이 저장되었습니다.");
        setBannedWords(json.data?.bannedWords ?? bannedWords);
      }
    } catch {
      setBannedMessage("네트워크 오류가 발생했습니다.");
    }
    setBannedSaving(false);
  };

  const handleSyncDistricts = async () => {
    setSyncingDistricts(true);
    setSyncMessage("");
    try {
      const res = await fetch("/api/admin/nec-sync", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setSyncMessage(json.error || "시군구 동기화 실패");
      } else {
        setSyncMessage(json.data?.message || `시군구 ${json.data?.synced}건 동기화 완료`);
        // Refresh district list
        const distRes = await fetch("/api/districts");
        const distJson = await distRes.json();
        setDistricts((distJson.data ?? []).map(
          (d: { name: string; centerLat: number; centerLng: number }) => ({
            name: d.name, centerLat: d.centerLat, centerLng: d.centerLng,
          })
        ));
      }
    } catch {
      setSyncMessage("네트워크 오류가 발생했습니다.");
    }
    setSyncingDistricts(false);
  };

  const handleSyncWards = async () => {
    setSyncingWards(true);
    setSyncMessage("");
    try {
      const res = await fetch("/api/admin/nec-sync/wards", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setSyncMessage(json.error || "선거구 동기화 실패");
      } else {
        setSyncMessage(json.data?.message || `선거구 ${json.data?.synced}건 동기화 완료`);
      }
    } catch {
      setSyncMessage("네트워크 오류가 발생했습니다.");
    }
    setSyncingWards(false);
  };

  useEffect(() => {
    // Fetch current map settings
    fetch("/api/admin/map-settings")
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          const data = json.data;
          setPinEmoji(data.emoji ?? "📍");
          setPinColor(data.color ?? "#FF5A00");
          setDefaultZoom(data.defaultZoom ?? 9);
          setDefaultDistrict(data.defaultDistrict ?? null);
          if (typeof data.defaultShowMinwon === "boolean") setMapDefaultMinwon(data.defaultShowMinwon);
          if (typeof data.defaultShowProposal === "boolean") setMapDefaultProposal(data.defaultShowProposal);
          if (typeof data.defaultShowPledge === "boolean") setMapDefaultPledge(data.defaultShowPledge);
        }
      })
      .catch(() => {
        // Keep defaults on error
      })
      .finally(() => setPinLoading(false));

    // Fetch current UI text overrides
    fetch("/api/admin/site-texts")
      .then((r) => r.json())
      .then((json) => { if (json.data) setUITexts(json.data); })
      .catch(() => {})
      .finally(() => setUITextsLoading(false));

    // Fetch banned words config
    fetch("/api/admin/banned-words")
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          setBannedWords(json.data.bannedWords ?? []);
          setBannedRedirectUrl(json.data.redirectUrl ?? "https://check.junseok.kr/");
        }
      })
      .catch(() => {})
      .finally(() => setBannedLoading(false));

    // Fetch district list for the district picker
    fetch("/api/districts")
      .then((r) => r.json())
      .then((json) => {
        const data: DistrictItem[] = (json.data ?? []).map(
          (d: { name: string; centerLat: number; centerLng: number }) => ({
            name: d.name,
            centerLat: d.centerLat,
            centerLng: d.centerLng,
          })
        );
        setDistricts(data);
      })
      .catch(() => {});
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    if (newPassword !== confirmPassword) {
      setMessage("새 비밀번호가 일치하지 않습니다.");
      return;
    }

    if (newPassword.length < 8) {
      setMessage("비밀번호는 8자 이상이어야 합니다.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage(json.error || "비밀번호 변경에 실패했습니다.");
      } else {
        setMessage("비밀번호가 변경되었습니다.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      setMessage("네트워크 오류가 발생했습니다.");
    }
    setSaving(false);
  };

  const handleSaveUITexts = async (e: React.FormEvent) => {
    e.preventDefault();
    setUITextsMessage("");
    setUITextsSaving(true);
    try {
      const res = await fetch("/api/admin/site-texts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(uiTexts),
      });
      const json = await res.json();
      if (!res.ok) {
        setUITextsMessage(json.error || "저장에 실패했습니다.");
      } else {
        invalidateUITextsCache();
        setUITextsMessage("UI 텍스트가 저장되었습니다.");
      }
    } catch {
      setUITextsMessage("네트워크 오류가 발생했습니다.");
    }
    setUITextsSaving(false);
  };

  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinMessage("");
    setPinSaving(true);
    try {
      const res = await fetch("/api/admin/map-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji: pinEmoji, color: pinColor, defaultZoom, defaultDistrict }),
      });
      const json = await res.json();
      if (!res.ok) {
        setPinMessage(json.error || "저장에 실패했습니다.");
      } else {
        setPinMessage("지도 설정이 저장되었습니다.");
      }
    } catch {
      setPinMessage("네트워크 오류가 발생했습니다.");
    }
    setPinSaving(false);
  };

  const handleSaveMapDefaults = async () => {
    setMapDefaultSaving(true);
    setMapDefaultMessage("");
    try {
      const res = await fetch("/api/admin/map-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultShowMinwon: mapDefaultMinwon,
          defaultShowProposal: mapDefaultProposal,
          defaultShowPledge: mapDefaultPledge,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setMapDefaultMessage(json.error ?? "저장에 실패했습니다."); return; }
      setMapDefaultMessage("지도 기본 설정이 저장되었습니다.");
    } catch {
      setMapDefaultMessage("네트워크 오류가 발생했습니다.");
    } finally {
      setMapDefaultSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-foreground mb-4">관리자 설정</h1>

      <Card>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          비밀번호 변경
        </h2>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <Input
            label="현재 비밀번호"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
          <Input
            label="새 비밀번호"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="8자 이상"
            required
          />
          <Input
            label="새 비밀번호 확인"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          {message && (
            <p
              className={`text-sm px-3 py-2 rounded-lg ${
                message.includes("실패") || message.includes("일치하지") || message.includes("이상") || message.includes("오류")
                  ? "text-red-500 bg-red-50"
                  : "text-green-600 bg-green-50"
              }`}
            >
              {message}
            </p>
          )}

          <Button type="submit" disabled={saving}>
            {saving ? "변경 중..." : "비밀번호 변경"}
          </Button>
        </form>
      </Card>

      {/* Map Settings Card */}
      <Card className="mt-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">지도 설정</h2>

        {pinLoading ? (
          <div className="flex justify-center py-6">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSavePin} className="space-y-5">
            {/* Default district */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                기본 지역{" "}
                <span className="text-xs font-normal text-muted">
                  (홈페이지 처음 열릴 때 자동 선택될 지역)
                </span>
              </label>
              {districts.length === 0 ? (
                <p className="text-xs text-muted">지역 목록을 불러오는 중...</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDefaultDistrict(null)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      defaultDistrict === null
                        ? "bg-primary text-white border-primary"
                        : "bg-background text-muted border-border hover:text-foreground hover:border-foreground/30"
                    }`}
                  >
                    전체 (기본값 없음)
                  </button>
                  {districts.map((d) => (
                    <button
                      type="button"
                      key={d.name}
                      onClick={() => setDefaultDistrict(d.name)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        defaultDistrict === d.name
                          ? "bg-primary text-white border-primary"
                          : "bg-background text-muted border-border hover:text-foreground hover:border-foreground/30"
                      }`}
                    >
                      {d.name}
                    </button>
                  ))}
                </div>
              )}
              {defaultDistrict && (
                <p className="text-xs text-muted mt-1.5">
                  선택됨: <span className="text-foreground font-medium">{defaultDistrict}</span>
                </p>
              )}
            </div>

            {/* Default zoom level */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                기본 지도 배율{" "}
                <span className="text-xs font-normal text-muted">
                  (홈페이지 처음 열릴 때 기본 줌 수준)
                </span>
              </label>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={5}
                    max={16}
                    step={1}
                    value={defaultZoom}
                    onChange={(e) => setDefaultZoom(Number(e.target.value))}
                    className="flex-1 accent-primary"
                  />
                  <span className="w-8 text-center text-sm font-mono font-semibold text-foreground">
                    {defaultZoom}
                  </span>
                </div>
                <p className="text-xs text-muted">
                  현재: <span className="text-foreground">{ZOOM_LABELS[defaultZoom] ?? `레벨 ${defaultZoom}`}</span>
                </p>
                <div className="flex justify-between text-[10px] text-muted px-0.5">
                  <span>넓게 (5)</span>
                  <span>자세히 (16)</span>
                </div>
              </div>
            </div>

            {/* Pin emoji */}
            <Input
              label="이모지"
              type="text"
              value={pinEmoji}
              onChange={(e) => setPinEmoji(e.target.value)}
              placeholder="예: 📍 🗳 ✅ 🏛"
              maxLength={8}
            />

            {/* Pin color */}
            <div className="w-full">
              <label className="block text-sm font-medium text-foreground mb-1.5">
                배경 색상
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={pinColor}
                  onChange={(e) => setPinColor(e.target.value)}
                  className="h-10 w-16 rounded-lg border border-border cursor-pointer p-0.5 bg-surface"
                />
                <input
                  type="text"
                  value={pinColor}
                  onChange={(e) => {
                    if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) {
                      setPinColor(e.target.value);
                    }
                  }}
                  className="w-28 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  placeholder="#FF5A00"
                  maxLength={7}
                />
              </div>
            </div>

            {/* Live preview */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                미리보기
              </label>
              <div className="flex items-center gap-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="44"
                  height="44"
                  viewBox="0 0 44 44"
                >
                  <circle
                    cx="22"
                    cy="22"
                    r="20"
                    fill={pinColor}
                    stroke="white"
                    strokeWidth="2.5"
                  />
                  <text x="22" y="29" fontSize="22" textAnchor="middle">
                    {pinEmoji}
                  </text>
                </svg>
                <span className="text-sm text-muted">지도에 표시될 핀 모양입니다</span>
              </div>
            </div>

            {pinMessage && (
              <p
                className={`text-sm px-3 py-2 rounded-lg ${
                  pinMessage.includes("실패") || pinMessage.includes("오류")
                    ? "text-red-500 bg-red-50"
                    : "text-green-600 bg-green-50"
                }`}
              >
                {pinMessage}
              </p>
            )}

            <Button type="submit" disabled={pinSaving}>
              {pinSaving ? "저장 중..." : "지도 설정 저장"}
            </Button>
          </form>
        )}
      </Card>

      {/* Map Layer Defaults Card */}
      <Card className="mt-6 p-6 space-y-4">
        <h2 className="text-base font-bold text-foreground">🗺️ 공약지도 기본 레이어 설정</h2>
        <p className="text-xs text-muted">사용자가 처음 지도를 열 때 어떤 레이어가 활성화되어 있을지 설정합니다.</p>
        <div className="space-y-3">
          {[
            { label: "📢 불편 제보 핀", value: mapDefaultMinwon, set: setMapDefaultMinwon },
            { label: "💡 공약 제안 핀", value: mapDefaultProposal, set: setMapDefaultProposal },
            { label: "📌 정식 공약 핀", value: mapDefaultPledge, set: setMapDefaultPledge },
          ].map(({ label, value, set }) => (
            <label key={label} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={value}
                onChange={e => set(e.target.checked)}
                className="w-4 h-4 accent-primary"
              />
              <span className="text-sm font-medium text-foreground">{label}</span>
              <span className={`ml-auto text-xs font-semibold ${value ? "text-green-600" : "text-muted"}`}>
                {value ? "기본 활성" : "기본 비활성"}
              </span>
            </label>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleSaveMapDefaults} disabled={mapDefaultSaving}>
            {mapDefaultSaving ? "저장 중..." : "저장"}
          </Button>
          {mapDefaultMessage && (
            <span className={`text-xs ${mapDefaultMessage.startsWith("지도") ? "text-green-600" : "text-red-500"}`}>
              {mapDefaultMessage}
            </span>
          )}
        </div>
      </Card>

      {/* UI Text Customization Card */}
      <Card className="mt-6">
        <h2 className="text-lg font-semibold text-foreground mb-1">UI 텍스트 설정</h2>
        <p className="text-xs text-muted mb-4">
          홈페이지 곳곳에 표시되는 텍스트를 변경합니다. 비워두면 기본값이 사용됩니다.
        </p>

        {uiTextsLoading ? (
          <div className="flex justify-center py-6">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSaveUITexts} className="space-y-4">
            <p className="text-xs font-semibold text-muted uppercase tracking-wide">네비게이션</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(
                [
                  ["logoSubText",        "로고 부제 (로고 옆 텍스트)",    DEFAULT_UI_TEXTS.logoSubText],
                  ["navMapLink",         "지도 링크",                   DEFAULT_UI_TEXTS.navMapLink],
                  ["navLoginButton",     "로그인 버튼",                  DEFAULT_UI_TEXTS.navLoginButton],
                  ["navAdminButton",     "관리자 버튼",                  DEFAULT_UI_TEXTS.navAdminButton],
                  ["navDashboardButton", "대시보드 버튼",                DEFAULT_UI_TEXTS.navDashboardButton],
                ] as [keyof UITexts, string, string][]
              ).map(([key, label, placeholder]) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-muted mb-1">{label}</label>
                  <input
                    type="text"
                    value={uiTexts[key]}
                    placeholder={placeholder}
                    onChange={(e) => setUITexts((prev) => ({ ...prev, [key]: e.target.value }))}
                    className="w-full px-2.5 py-1.5 text-sm border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20"
                  />
                </div>
              ))}
            </div>

            <p className="text-xs font-semibold text-muted uppercase tracking-wide pt-1">지도 페이지 사이드바</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(
                [
                  ["sidebarAllCandidates", "전체 후보자 라벨",   DEFAULT_UI_TEXTS.sidebarAllCandidates],
                  ["sidebarNoCandidate",   "후보 없음 안내 문구", DEFAULT_UI_TEXTS.sidebarNoCandidate],
                ] as [keyof UITexts, string, string][]
              ).map(([key, label, placeholder]) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-muted mb-1">{label}</label>
                  <input
                    type="text"
                    value={uiTexts[key]}
                    placeholder={placeholder}
                    onChange={(e) => setUITexts((prev) => ({ ...prev, [key]: e.target.value }))}
                    className="w-full px-2.5 py-1.5 text-sm border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20"
                  />
                </div>
              ))}
            </div>

            <p className="text-xs font-semibold text-muted uppercase tracking-wide pt-1">기타</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(
                [
                  ["footerCredit", "푸터 저작권 텍스트", DEFAULT_UI_TEXTS.footerCredit],
                ] as [keyof UITexts, string, string][]
              ).map(([key, label, placeholder]) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-muted mb-1">{label}</label>
                  <input
                    type="text"
                    value={uiTexts[key]}
                    placeholder={placeholder}
                    onChange={(e) => setUITexts((prev) => ({ ...prev, [key]: e.target.value }))}
                    className="w-full px-2.5 py-1.5 text-sm border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20"
                  />
                </div>
              ))}
            </div>

            {uiTextsMessage && (
              <p className={`text-sm px-3 py-2 rounded-lg ${
                uiTextsMessage.includes("실패") || uiTextsMessage.includes("오류")
                  ? "text-red-500 bg-red-50"
                  : "text-green-600 bg-green-50"
              }`}>
                {uiTextsMessage}
              </p>
            )}

            <Button type="submit" disabled={uiTextsSaving}>
              {uiTextsSaving ? "저장 중..." : "텍스트 설정 저장"}
            </Button>
          </form>
        )}
      </Card>

      {/* Banned Words Card */}
      <Card className="mt-6">
        <h2 className="text-lg font-semibold text-foreground mb-1">금지어 설정</h2>
        <p className="text-xs text-muted mb-4">
          일반 방문자가 이 단어가 포함된 글을 제출하면 등록이 차단되고 지정된 URL로 이동됩니다.
          후보자·관리자는 금지어 적용에서 제외됩니다.
        </p>

        {bannedLoading ? (
          <div className="flex justify-center py-6">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Redirect URL */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                금지어 감지 시 이동 URL
              </label>
              <input
                type="url"
                value={bannedRedirectUrl}
                onChange={(e) => setBannedRedirectUrl(e.target.value)}
                placeholder="https://check.junseok.kr/"
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors font-mono"
              />
              <p className="text-xs text-muted mt-1">금지어 포함 글 제출 시 이 URL로 즉시 이동됩니다</p>
            </div>

            {/* Add word input */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">금지어 추가</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={bannedWordInput}
                  onChange={(e) => setBannedWordInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddBannedWord(); } }}
                  placeholder="금지어 입력 후 Enter 또는 추가"
                  className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                />
                <button
                  type="button"
                  onClick={handleAddBannedWord}
                  className="px-4 py-2 text-sm font-semibold bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors whitespace-nowrap"
                >
                  추가
                </button>
              </div>
            </div>

            {/* Word list */}
            {bannedWords.length === 0 ? (
              <p className="text-sm text-muted py-3 text-center border border-dashed border-border rounded-lg">
                등록된 금지어가 없습니다
              </p>
            ) : (
              <div className="flex flex-wrap gap-2 p-3 border border-border rounded-lg bg-background min-h-[48px]">
                {bannedWords.map((word) => (
                  <span
                    key={word}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200"
                  >
                    🚫 {word}
                    <button
                      type="button"
                      onClick={() => handleRemoveBannedWord(word)}
                      className="text-red-400 hover:text-red-700 leading-none font-bold transition-colors"
                      aria-label={`${word} 삭제`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {bannedMessage && (
              <p className={`text-sm px-3 py-2 rounded-lg ${
                bannedMessage.includes("실패") || bannedMessage.includes("오류")
                  ? "text-red-500 bg-red-50"
                  : "text-green-600 bg-green-50"
              }`}>
                {bannedMessage}
              </p>
            )}

            <Button type="button" onClick={handleSaveBannedWords} disabled={bannedSaving}>
              {bannedSaving ? "저장 중..." : "금지어 설정 저장"}
            </Button>
          </div>
        )}
      </Card>

      {/* Stats Cache Card */}
      <Card className="mt-6">
        <h2 className="text-lg font-semibold text-foreground mb-2">
          현황판 캐시 워밍
        </h2>
        <p className="text-xs text-muted mb-3">
          2026-03-01부터 현재까지의 주간·일간 현황판 데이터를 미리 로딩합니다.
          Supabase에 <code className="bg-gray-100 px-1 rounded">StatsCache</code> 테이블이 있어야 합니다.
          (<code className="bg-gray-100 px-1 rounded">supabase/migrations/20260326_stats_cache.sql</code> 실행 후 사용)
        </p>
        <WarmCacheButton />
      </Card>

      {/* NEC Sync Card */}
      <Card className="mt-6">
        <h2 className="text-lg font-semibold text-foreground mb-2">
          선관위 데이터 동기화
        </h2>
        <p className="text-xs text-muted mb-4">
          중앙선관위 API에서 시군구 및 세부 선거구 정보를 불러와 저장합니다.
          선거구 동기화 시 &quot;천안시 가선거구&quot; 등 상세 선거구가 자동으로 등록되어
          후보자의 세부 지역이 지도에 표시됩니다.
        </p>

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              onClick={handleSyncDistricts}
              disabled={syncingDistricts || syncingWards}
            >
              {syncingDistricts ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  시군구 동기화 중...
                </span>
              ) : (
                "시군구 동기화"
              )}
            </Button>
            <span className="text-xs text-muted">충남 시군구 목록 업데이트</span>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              onClick={handleSyncWards}
              disabled={syncingDistricts || syncingWards}
            >
              {syncingWards ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  선거구 동기화 중...
                </span>
              ) : (
                "세부 선거구 동기화"
              )}
            </Button>
            <span className="text-xs text-muted">가·나·다선거구 등 상세 선거구</span>
          </div>

          {syncMessage && (
            <p
              className={`text-sm px-3 py-2 rounded-lg ${
                syncMessage.includes("실패") || syncMessage.includes("오류")
                  ? "text-red-500 bg-red-50"
                  : "text-green-600 bg-green-50"
              }`}
            >
              {syncMessage}
            </p>
          )}

          <p className="text-xs text-muted mt-1">
            출처: 중앙선관위 · 제9회 전국동시지방선거 (2026.06.03)
          </p>
        </div>
      </Card>
    </div>
  );
}
