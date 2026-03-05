"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { Button, Input, Textarea } from "@/components/ui";
import Card from "@/components/ui/Card";

export default function ProfilePage() {
  const { data: session } = useSession();
  const candidateId = (session?.user as { id?: string })?.id;

  const [form, setForm] = useState({
    handle: "",
    slogan: "",
    bio: "",
    profileImage: "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [handleStatus, setHandleStatus] = useState<
    "idle" | "checking" | "available" | "taken" | "invalid"
  >("idle");
  const [handleTimer, setHandleTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Ward (선거구) selector state
  const [electionType, setElectionType] = useState("");
  const [currentGun, setCurrentGun] = useState(""); // e.g. "천안시동남구"
  const [selectedWard, setSelectedWard] = useState(""); // e.g. "다선거구"
  const [wards, setWards] = useState<{ electCode: string; electName: string }[]>([]);
  const [loadingWards, setLoadingWards] = useState(false);
  const [wardMessage, setWardMessage] = useState("");

  const isWardLevel =
    electionType.includes("의회의원선거") && !electionType.includes("시·도의회");

  useEffect(() => {
    if (!candidateId) return;
    fetch(`/api/candidates/${candidateId}`)
      .then((res) => res.json())
      .then((json) => {
        const data = json.data ?? json;
        setForm({
          handle: data.handle || "",
          slogan: data.slogan || "",
          bio: data.bio || "",
          profileImage: data.profileImage || "",
        });
        setElectionType(data.electionType || "");
        // Parse gun and ward from district (e.g. "천안시동남구 다선거구")
        const district: string = data.district || "";
        const spaceIdx = district.indexOf(" ");
        if (spaceIdx > -1) {
          setCurrentGun(district.slice(0, spaceIdx));
          setSelectedWard(district.slice(spaceIdx + 1));
        } else {
          setCurrentGun(district);
          setSelectedWard("");
        }
      });
  }, [candidateId]);

  // Load wards when gun is known and election type is ward-level
  useEffect(() => {
    if (!isWardLevel || !currentGun) { setWards([]); return; }
    setLoadingWards(true);
    fetch(`/api/nec?type=wards&wiwName=${encodeURIComponent(currentGun)}`)
      .then((r) => r.json())
      .then((json) => setWards(json.data ?? []))
      .catch(() => setWards([]))
      .finally(() => setLoadingWards(false));
  }, [currentGun, isWardLevel]);

  const handleWardSave = async () => {
    if (!candidateId || !selectedWard) return;
    const newDistrict = `${currentGun} ${selectedWard}`;
    setWardMessage("");
    try {
      const res = await fetch(`/api/candidates/${candidateId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ district: newDistrict }),
      });
      setWardMessage(res.ok ? "선거구가 저장되었습니다." : "저장에 실패했습니다.");
    } catch {
      setWardMessage("저장에 실패했습니다.");
    }
  };

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

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
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
        handle: form.handle || null,
        slogan: form.slogan || null,
        bio: form.bio || null,
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
  const profileUrl = form.handle
    ? `${origin}/@${form.handle}`
    : candidateId
    ? `${origin}/candidates/${candidateId}`
    : "";

  return (
    <div className="max-w-2xl mx-auto">
      {/* Top action bar with top save button */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-foreground">내 프로필</h1>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? "편집으로" : "미리보기"}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => handleSave()}
            disabled={saving || handleStatus === "taken"}
          >
            {saving ? "저장 중..." : "저장"}
          </Button>
        </div>
      </div>

      {/* Profile preview panel */}
      {showPreview && (
        <Card className="mb-4">
          <h2 className="text-sm font-semibold text-muted mb-3">프로필 미리보기</h2>
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 shrink-0">
              {form.profileImage ? (
                <Image
                  src={form.profileImage}
                  alt="프로필"
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl text-muted">
                  👤
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-foreground text-lg">
                {session?.user?.name || "이름"}
              </p>
              {form.slogan && (
                <p className="text-sm text-primary mt-0.5">&ldquo;{form.slogan}&rdquo;</p>
              )}
              {form.bio && (
                <p className="text-sm text-muted mt-1 line-clamp-3">{form.bio}</p>
              )}
              {form.handle && (
                <a
                  href={profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary mt-1 block hover:underline"
                >
                  {origin}/@{form.handle}
                </a>
              )}
            </div>
          </div>
        </Card>
      )}

      <form onSubmit={handleSave}>
        <Card>
          <div className="space-y-4">
            {/* Profile picture — TOP */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                프로필 사진
              </label>
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gray-100 shrink-0">
                  {form.profileImage ? (
                    <Image
                      src={form.profileImage}
                      alt="프로필 사진"
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl text-muted">
                      👤
                    </div>
                  )}
                </div>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="px-4 py-2 text-sm border border-dashed border-border rounded-lg text-muted hover:border-primary hover:text-primary transition-colors"
                  >
                    {uploading ? "업로드 중..." : form.profileImage ? "사진 변경" : "사진 업로드"}
                  </button>
                  <p className="text-xs text-muted mt-1">JPG, PNG, GIF 등</p>
                </div>
              </div>
            </div>

            {/* Slogan */}
            <Input
              label="슬로건"
              value={form.slogan}
              onChange={(e) => setForm({ ...form, slogan: e.target.value })}
              placeholder="핵심 캠페인 메시지를 입력하세요"
            />

            {/* Bio / 자기소개 */}
            <Textarea
              label="자기소개"
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="후보자 소개를 작성하세요"
            />

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

            {/* Ward (선거구) re-selector — only for 구시군의회의원선거 */}
            {isWardLevel && currentGun && (
              <div className="border border-border rounded-lg p-3 bg-surface/50">
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  세부 선거구{" "}
                  <span className="text-xs text-muted font-normal">
                    ({currentGun})
                  </span>
                </label>
                <div className="flex gap-2">
                  {loadingWards ? (
                    <p className="text-xs text-muted py-2">불러오는 중...</p>
                  ) : wards.length > 0 ? (
                    <select
                      value={selectedWard}
                      onChange={(e) => setSelectedWard(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      <option value="">선거구를 선택하세요</option>
                      {wards.map((w) => (
                        <option key={w.electCode} value={w.electName}>
                          {w.electName}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={selectedWard}
                      onChange={(e) => setSelectedWard(e.target.value)}
                      placeholder="예: 다선거구, 제3선거구"
                      className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  )}
                  <Button type="button" size="sm" onClick={handleWardSave} disabled={!selectedWard}>
                    저장
                  </Button>
                </div>
                {wardMessage && (
                  <p className={`text-xs mt-1.5 ${wardMessage.includes("실패") ? "text-red-500" : "text-green-600"}`}>
                    {wardMessage}
                  </p>
                )}
                <p className="text-xs text-muted mt-1.5">출처: 중앙선관위 · 제9회 전국동시지방선거</p>
              </div>
            )}

            {/* Pin location notice */}
            <div className="px-3 py-2 bg-muted/10 border border-border rounded-lg">
              <p className="text-xs text-muted">
                📍 핀 위치 변경은 관리자에게 문의하세요.
              </p>
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

            {/* Bottom save button */}
            <Button type="submit" disabled={saving || handleStatus === "taken"}>
              {saving ? "저장 중..." : "프로필 저장"}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
