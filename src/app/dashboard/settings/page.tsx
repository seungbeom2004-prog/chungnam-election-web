"use client";

import { useState } from "react";
import { Button, Input } from "@/components/ui";
import Card from "@/components/ui/Card";

export default function SettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

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
    // Password change would be implemented via API
    setTimeout(() => {
      setSaving(false);
      setMessage("비밀번호가 변경되었습니다.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }, 1000);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-foreground mb-4">계정 설정</h1>

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
                message.includes("일치하지") || message.includes("이상")
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
    </div>
  );
}
