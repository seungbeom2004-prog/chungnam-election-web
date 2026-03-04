"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { Button, Input, Textarea } from "@/components/ui";
import Card from "@/components/ui/Card";

interface DistrictOption {
  name: string;
  wOrder?: number;
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
    handle: "",
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
  const [handleStatus, setHandleStatus] = useState<
    "idle" | "checking" | "available" | "taken" | "invalid"
  >("idle");
  const [handleTimer, setHandleTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Districts from NEC API, elections from Supabase
    Promise.all([
      fetch("/api/nec?type=districts").then((r) => r.json()),
      fetch("/api/elections").then((r) => r.json()),
    ]).then(([distJson, elecJson]) => {
      const dists: DistrictOption[] = distJson.data ?? [];
      dists.sort((a, b) => (a.wOrder ?? 0) - (b.wOrder ?? 0));
      setDistricts(dists);
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
          handle: data.handle || "",
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
    if (handleStatus === "taken") {
      setMessage("이미 사용 중인 핸들입니다.");
      return;
    }
    setSaving(true);
    setMessage("");

    const res = await fetch(`/api/candidates/${candidateId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        handle: form.handle || null,
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
      setHandleStatus("idle");
    } else {
      const json = await res.json().catch(() => ({}));
      setMessage(json.error || "저장에 실패했습니다.");
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

          {/* District selection — from NEC API */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              선거구{" "}
              <span className="text-xs text-muted font-normal">
                (출처: 중앙선관위)
              </span>
            </label>
            <select
              value={form.district}
              onChange={(e) => setForm({ ...form, district: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            >
              <option value="">
                {districts.length === 0 ? "불러오는 중..." : "선거구 선택"}
              </option>
              {districts.map((d) => (
                <option key={d.name} value={d.name}>{d.name}</option>
              ))}
            </select>
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
                message.includes("실패") || message.includes("오류") || message.includes("사용 중")
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
