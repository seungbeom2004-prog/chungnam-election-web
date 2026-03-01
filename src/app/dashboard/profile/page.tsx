"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button, Input, Textarea } from "@/components/ui";
import Card from "@/components/ui/Card";

export default function ProfilePage() {
  const { data: session } = useSession();
  const candidateId = (session?.user as { id?: string })?.id;

  const [form, setForm] = useState({
    name: "",
    slogan: "",
    bio: "",
    phone: "",
  });
  const [district, setDistrict] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!candidateId) return;
    fetch(`/api/candidates/${candidateId}`)
      .then((res) => res.json())
      .then((json) => {
        const data = json.data ?? json;
        setForm({
          name: data.name || "",
          slogan: data.slogan || "",
          bio: data.bio || "",
          phone: data.phone || "",
        });
        setDistrict(data.district || "");
      });
  }, [candidateId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateId) return;
    setSaving(true);
    setMessage("");

    const res = await fetch(`/api/candidates/${candidateId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setSaving(false);
    if (res.ok) {
      setMessage("저장되었습니다.");
    } else {
      setMessage("저장에 실패했습니다.");
    }
  };

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
                message.includes("실패")
                  ? "text-red-500 bg-red-50"
                  : "text-green-600 bg-green-50"
              }`}
            >
              {message}
            </p>
          )}

          <Button type="submit" disabled={saving}>
            {saving ? "저장 중..." : "프로필 저장"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
