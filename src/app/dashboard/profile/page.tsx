"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { Button, Input, Textarea } from "@/components/ui";
import Card from "@/components/ui/Card";

interface DistrictOption {
  id: string;
  name: string;
}

interface ElectionOption {
  id: string;
  name: string;
  type: string;
}

const CANDIDATE_STATUSES = ["출마예정자", "예비후보자", "후보자"] as const;
const CAUCUS_STATUSES = ["공천 미확정", "공천 확정"] as const;

export default function ProfilePage() {
  const { data: session } = useSession();
  const candidateId = (session?.user as { id?: string })?.id;

  const [form, setForm] = useState({
    name: "",
    slogan: "",
    bio: "",
    phone: "",
    district: "",
    electionId: "",
    candidateStatus: "출마예정자" as string,
    caucusStatus: "공천 미확정" as string,
    profileImage: "",
  });
  const [districts, setDistricts] = useState<DistrictOption[]>([]);
  const [elections, setElections] = useState<ElectionOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/districts").then((r) => r.json()),
      fetch("/api/elections").then((r) => r.json()),
    ]).then(([distJson, elecJson]) => {
      setDistricts(distJson.data ?? []);
      setElections(elecJson.data ?? []);
    });
  }, []);

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
          district: data.district || "",
          electionId: data.electionId || "",
          candidateStatus: data.candidateStatus || "출마예정자",
          caucusStatus: data.caucusStatus || "공천 미확정",
          profileImage: data.profileImage || "",
        });
      });
  }, [candidateId]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.data?.url || data.url) {
        setForm((prev) => ({ ...prev, profileImage: data.data?.url || data.url }));
        setMessage("이미지가 업로드되었습니다.");
      } else {
        setMessage(data.error || "이미지 업로드에 실패했습니다.");
      }
    } catch {
      setMessage("이미지 업로드에 실패했습니다.");
    }
    setUploading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateId) return;
    setSaving(true);
    setMessage("");

    const res = await fetch(`/api/candidates/${candidateId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        slogan: form.slogan || null,
        bio: form.bio || null,
        phone: form.phone || null,
        district: form.district,
        electionId: form.electionId || null,
        candidateStatus: form.candidateStatus,
        caucusStatus: form.caucusStatus,
        profileImage: form.profileImage || null,
      }),
    });

    setSaving(false);
    if (res.ok) {
      setMessage("저장되었습니다.");
    } else {
      const json = await res.json();
      setMessage(json.error || "저장에 실패했습니다.");
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

          {/* District selection */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              선거구
            </label>
            {districts.length > 0 ? (
              <select
                value={form.district}
                onChange={(e) => setForm({ ...form, district: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              >
                <option value="">선거구 선택</option>
                {districts.map((d) => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-muted bg-background rounded-lg px-3 py-2 border border-border">
                {form.district || "미지정"}
              </p>
            )}
          </div>

          {/* Election selection */}
          {elections.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                선거
              </label>
              <select
                value={form.electionId}
                onChange={(e) => setForm({ ...form, electionId: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              >
                <option value="">선거 선택</option>
                {elections.map((el) => (
                  <option key={el.id} value={el.id}>
                    {el.name} ({el.type})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Candidate status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                후보 상태
              </label>
              <select
                value={form.candidateStatus}
                onChange={(e) => setForm({ ...form, candidateStatus: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              >
                {CANDIDATE_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Caucus status */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                공천 상태
              </label>
              <select
                value={form.caucusStatus}
                onChange={(e) => setForm({ ...form, caucusStatus: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              >
                {CAUCUS_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
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

          {/* Profile image upload */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              프로필 사진
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            {form.profileImage && (
              <div className="mb-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={form.profileImage}
                  alt="프로필 사진"
                  className="w-24 h-24 object-cover rounded-full border border-border"
                />
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-4 py-2 text-sm border border-dashed border-border rounded-lg text-muted hover:border-primary hover:text-primary transition-colors"
            >
              {uploading ? "업로드 중..." : form.profileImage ? "사진 변경" : "사진 업로드"}
            </button>
          </div>

          {message && (
            <p
              className={`text-sm px-3 py-2 rounded-lg ${
                message.includes("실패") || message.includes("오류")
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
