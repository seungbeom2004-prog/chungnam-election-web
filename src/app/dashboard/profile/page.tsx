"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button, Input, Textarea } from "@/components/ui";
import Card from "@/components/ui/Card";

export default function ProfilePage() {
  const { data: session } = useSession();
  const candidateId = (session?.user as { id?: string })?.id;

  const [form, setForm] = useState({
    name: "",
    handle: "",
    slogan: "",
    bio: "",
    phone: "",
  });
  const [district, setDistrict] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [handleStatus, setHandleStatus] = useState<
    "idle" | "checking" | "available" | "taken" | "invalid"
  >("idle");
  const [handleTimer, setHandleTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!candidateId) return;
    fetch(`/api/candidates/${candidateId}`)
      .then((res) => res.json())
      .then((json) => {
        const data = json.data ?? json;
        setForm({
          name: data.name || "",
          handle: data.handle || "",
          slogan: data.slogan || "",
          bio: data.bio || "",
          phone: data.phone || "",
        });
        setDistrict(data.district || "");
      });
  }, [candidateId]);

  /** Debounced handle availability check */
  const checkHandle = useCallback(
    (value: string) => {
      if (handleTimer) clearTimeout(handleTimer);
      if (!value || value.length < 3) {
        setHandleStatus("idle");
        return;
      }
      if (!/^[a-z0-9_-]+$/.test(value)) {
        setHandleStatus("invalid");
        return;
      }
      setHandleStatus("checking");
      const t = setTimeout(async () => {
        const res = await fetch(`/api/candidates/handle/${encodeURIComponent(value)}`);
        if (res.status === 404) {
          setHandleStatus("available");
        } else if (res.ok) {
          const json = await res.json();
          const foundId = json.data?.id ?? json.id;
          setHandleStatus(foundId === candidateId ? "available" : "taken");
        } else {
          setHandleStatus("idle");
        }
      }, 500);
      setHandleTimer(t);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [candidateId]
  );

  const handleHandleChange = (value: string) => {
    const lower = value.toLowerCase().replace(/[^a-z0-9_-]/g, "");
    setForm((f) => ({ ...f, handle: lower }));
    checkHandle(lower);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateId) return;
    if (handleStatus === "taken") {
      setMessage("이미 사용 중인 핸들입니다.");
      return;
    }
    setSaving(true);
    setMessage("");

    const res = await fetch(`/api/candidates/${candidateId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, handle: form.handle || null }),
    });

    setSaving(false);
    if (res.ok) {
      setMessage("저장되었습니다.");
      setHandleStatus("idle");
    } else {
      const json = await res.json().catch(() => ({}));
      setMessage(json.error || "저장에 실패했습니다.");
    }
  };

  const handleStatusText = () => {
    switch (handleStatus) {
      case "checking":
        return <span className="text-xs text-muted">확인 중...</span>;
      case "available":
        return <span className="text-xs text-green-600">✓ 사용 가능한 핸들입니다</span>;
      case "taken":
        return <span className="text-xs text-red-500">✗ 이미 사용 중인 핸들입니다</span>;
      case "invalid":
        return (
          <span className="text-xs text-red-500">
            영어 소문자, 숫자, _, - 만 사용 가능합니다
          </span>
        );
      default:
        return null;
    }
  };

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-foreground mb-4">내 프로필</h1>

      <Card>
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="이름"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              선거구
            </label>
            <p className="text-sm text-muted bg-background rounded-lg px-3 py-2 border border-border">
              {district || "미지정"} (관리자에 의해 설정됨)
            </p>
          </div>

          {/* Vanity Handle */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              핸들 (선택)
            </label>
            <div className="flex items-center border border-border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary">
              <span className="px-3 py-2 bg-background text-muted text-sm border-r border-border select-none whitespace-nowrap">
                {origin}/@
              </span>
              <input
                type="text"
                value={form.handle}
                onChange={(e) => handleHandleChange(e.target.value)}
                placeholder="seungbeom"
                maxLength={30}
                className="flex-1 px-3 py-2 text-sm bg-surface focus:outline-none min-w-0"
              />
            </div>
            <div className="mt-1 min-h-[1.25rem]">{handleStatusText()}</div>
            <p className="text-xs text-muted mt-0.5">
              핸들을 설정하면{" "}
              <span className="font-mono">{origin}/@핸들</span>로 접근할 수 있습니다.
              영어 소문자·숫자·_·- 사용 가능, 3~30자.
            </p>
          </div>

          <Input
            label="슬로건"
            value={form.slogan}
            onChange={(e) => setForm({ ...form, slogan: e.target.value })}
            placeholder="핵심 캠페인 메시지를 입력하세요"
          />

          <Textarea
            label="자기소개"
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            placeholder="후보자 소개를 작성하세요"
          />

          <Input
            label="연락처"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="010-0000-0000"
          />

          {message && (
            <p
              className={`text-sm px-3 py-2 rounded-lg ${
                message.includes("실패") || message.includes("사용 중")
                  ? "text-red-500 bg-red-50"
                  : "text-green-600 bg-green-50"
              }`}
            >
              {message}
            </p>
          )}

          <Button type="submit" disabled={saving || handleStatus === "taken"}>
            {saving ? "저장 중..." : "프로필 저장"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
