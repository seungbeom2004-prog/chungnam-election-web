"use client";

import { useState, useEffect } from "react";
import { Button, Input } from "@/components/ui";
import Card from "@/components/ui/Card";

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

  useEffect(() => {
    fetch("/api/admin/map-settings")
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          setPinEmoji(json.data.emoji ?? "📍");
          setPinColor(json.data.color ?? "#FF5A00");
        }
      })
      .catch(() => {
        // Keep defaults on error
      })
      .finally(() => setPinLoading(false));
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

  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinMessage("");
    setPinSaving(true);
    try {
      const res = await fetch("/api/admin/map-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji: pinEmoji, color: pinColor }),
      });
      const json = await res.json();
      if (!res.ok) {
        setPinMessage(json.error || "저장에 실패했습니다.");
      } else {
        setPinMessage("핀 설정이 저장되었습니다.");
      }
    } catch {
      setPinMessage("네트워크 오류가 발생했습니다.");
    }
    setPinSaving(false);
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

      {/* Pin Settings Card */}
      <Card className="mt-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">핀 설정</h2>

        {pinLoading ? (
          <div className="flex justify-center py-6">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSavePin} className="space-y-4">
            <Input
              label="이모지"
              type="text"
              value={pinEmoji}
              onChange={(e) => setPinEmoji(e.target.value)}
              placeholder="예: 📍 🗳 ✅ 🏛"
              maxLength={8}
            />

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
              {pinSaving ? "저장 중..." : "핀 설정 저장"}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
