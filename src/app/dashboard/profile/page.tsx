"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { Button, Input, Textarea } from "@/components/ui";
import Card from "@/components/ui/Card";

const ELECTION_TYPES = [
  "시도지사선거",
  "교육감선거",
  "시장선거",
  "군수선거",
  "구청장선거",
  "시·도의회의원선거",
  "구·시·군의회의원선거",
  "비례대표시·도의원선거",
  "비례대표구·시·군의원선거",
];

interface NecDistrict {
  name: string;
  wOrder?: number;
}

export default function ProfilePage() {
  const { data: session } = useSession();
  const candidateId = (session?.user as { id?: string })?.id;

  const [form, setForm] = useState({
    handle: "",
    slogan: "",
    bio: "",
    profileImage: "",
  });
  const [socialForm, setSocialForm] = useState({
    youtube: "",
    instagram: "",
    twitter: "",
    facebook: "",
    tiktok: "",
    kakao: "",
    naverBlog: "",
  });
  const [socialSaving, setSocialSaving] = useState(false);
  const [socialMessage, setSocialMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [handleStatus, setHandleStatus] = useState<
    "idle" | "checking" | "available" | "taken" | "invalid"
  >("idle");
  const [handleTimer, setHandleTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Election type selector
  const [electionType, setElectionType] = useState("");
  const [electionTypeSaving, setElectionTypeSaving] = useState(false);
  const [electionTypeMessage, setElectionTypeMessage] = useState("");

  // Cascade district selector
  const [allDistricts, setAllDistricts] = useState<NecDistrict[]>([]);
  const [currentGun, setCurrentGun] = useState(""); // 구시군: e.g. "천안시동남구"
  const [selectedWard, setSelectedWard] = useState(""); // 선거구: e.g. "다선거구"
  const [wards, setWards] = useState<{ electCode: string; electName: string }[]>([]);
  const [loadingWards, setLoadingWards] = useState(false);
  const [districtMessage, setDistrictMessage] = useState("");
  const [manualDistrictMode, setManualDistrictMode] = useState(false);
  const [manualDistrictText, setManualDistrictText] = useState("");

  // Both 구·시·군의회의원선거 (기초의원: 가/나/다선거구) and
  // 시·도의회의원선거 (광역의원: 제1/2/3선거구) have ward-level subdivisions.
  const isWardLevel =
    electionType === "구·시·군의회의원선거" || electionType === "시·도의회의원선거";
  // wiw1 = 광역의원 선거구, wiw2 = 기초의원 선거구 (default)
  const wardApiLevel = electionType === "시·도의회의원선거" ? "wiw1" : "wiw2";

  // Load all NEC districts for the 구시군 dropdown
  useEffect(() => {
    fetch("/api/nec?type=districts")
      .then((r) => r.json())
      .then((json) => {
        const data: NecDistrict[] = json.data ?? [];
        data.sort((a, b) => (a.wOrder ?? 0) - (b.wOrder ?? 0));
        setAllDistricts(data);
      })
      .catch(() => {});
  }, []);

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
        setSocialForm({
          youtube: data.youtube || "",
          instagram: data.instagram || "",
          twitter: data.twitter || "",
          facebook: data.facebook || "",
          tiktok: data.tiktok || "",
          kakao: data.kakao || "",
          naverBlog: data.naverBlog || "",
        });
        setElectionType(data.electionType || "");
        const district: string = data.district || "";
        const spaceIdx = district.indexOf(" ");
        if (spaceIdx > -1) {
          setCurrentGun(district.slice(0, spaceIdx));
          setSelectedWard(district.slice(spaceIdx + 1));
        } else {
          setCurrentGun(district);
          setSelectedWard("");
        }
        setManualDistrictText(district);
      });
  }, [candidateId]);

  // Load wards when currentGun or electionType changes and election is ward-level.
  // Passes level=wiw1 for 시·도의회의원선거, wiw2 (default) for 구·시·군의회의원선거.
  // Uses unified /api/districts/wards endpoint (DB first, NEC API fallback).
  useEffect(() => {
    const wardLevel =
      electionType === "구·시·군의회의원선거" || electionType === "시·도의회의원선거";
    if (!wardLevel || !currentGun) { setWards([]); setSelectedWard(""); return; }
    setLoadingWards(true);

    const level = electionType === "시·도의회의원선거" ? "wiw1" : "wiw2";
    fetch(`/api/districts/wards?parent=${encodeURIComponent(currentGun)}&level=${level}`)
      .then((r) => r.json())
      .then((json) => {
        setWards(json.data ?? []);
      })
      .catch(() => setWards([]))
      .finally(() => setLoadingWards(false));
  }, [currentGun, electionType]);

  // Save district (구시군 + ward combined, or manual text)
  const handleDistrictSave = async () => {
    if (!candidateId) return;
    const newDistrict = manualDistrictMode
      ? manualDistrictText.trim()
      : isWardLevel && selectedWard
        ? `${currentGun} ${selectedWard}`
        : currentGun;
    if (!newDistrict) return;
    setDistrictMessage("");
    try {
      const res = await fetch(`/api/candidates/${candidateId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ district: newDistrict }),
      });
      setDistrictMessage(res.ok ? "선거구가 저장되었습니다." : "저장에 실패했습니다.");
    } catch {
      setDistrictMessage("저장에 실패했습니다.");
    }
  };

  const handleElectionTypeSave = async () => {
    if (!candidateId) return;
    setElectionTypeSaving(true);
    setElectionTypeMessage("");
    try {
      const res = await fetch(`/api/candidates/${candidateId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ electionType: electionType || null }),
      });
      setElectionTypeMessage(res.ok ? "선거 종류가 저장되었습니다." : "저장에 실패했습니다.");
    } catch {
      setElectionTypeMessage("저장에 실패했습니다.");
    }
    setElectionTypeSaving(false);
  };

  const handleSocialSave = async () => {
    if (!candidateId) return;
    setSocialSaving(true);
    setSocialMessage("");
    try {
      const payload = {
        youtube: socialForm.youtube || null,
        instagram: socialForm.instagram || null,
        twitter: socialForm.twitter || null,
        facebook: socialForm.facebook || null,
        tiktok: socialForm.tiktok || null,
        kakao: socialForm.kakao || null,
        naverBlog: socialForm.naverBlog || null,
      };
      const res = await fetch(`/api/candidates/${candidateId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setSocialMessage("소셜 계정이 저장되었습니다.");
      } else {
        const json = await res.json().catch(() => ({}));
        setSocialMessage(json.error || "저장에 실패했습니다.");
      }
    } catch {
      setSocialMessage("저장에 실패했습니다.");
    }
    setSocialSaving(false);
  };

  const checkHandle = useCallback(
    (value: string) => {
      if (handleTimer) clearTimeout(handleTimer);
      if (!value || value.length < 3) { setHandleStatus("idle"); return; }
      if (!/^[a-z0-9_-]+$/.test(value)) { setHandleStatus("invalid"); return; }
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
      case "checking": return <span className="text-xs text-muted">확인 중...</span>;
      case "available": return <span className="text-xs text-green-600">✓ 사용 가능한 핸들입니다</span>;
      case "taken": return <span className="text-xs text-red-500">✗ 이미 사용 중인 핸들입니다</span>;
      case "invalid": return <span className="text-xs text-red-500">영어 소문자, 숫자, _, - 만 사용 가능합니다</span>;
      default: return null;
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
    if (handleStatus === "taken") { setMessage("이미 사용 중인 핸들입니다."); return; }
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
    if (res.ok) { setMessage("저장되었습니다."); setHandleStatus("idle"); }
    else {
      const json = await res.json().catch(() => ({}));
      setMessage(json.error || "저장에 실패했습니다.");
    }
  };

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const profileUrl = form.handle
    ? `${origin}/@${form.handle}`
    : candidateId ? `${origin}/candidates/${candidateId}` : "";

  const openPreview = () => {
    if (profileUrl) window.open(profileUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Top action bar */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-foreground">내 프로필</h1>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="ghost" onClick={openPreview} disabled={!profileUrl}>
            미리보기 ↗
          </Button>
          <Button type="button" size="sm" onClick={() => handleSave()} disabled={saving || handleStatus === "taken"}>
            {saving ? "저장 중..." : "저장"}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSave}>
        <Card>
          <div className="space-y-4">
            {/* Profile picture */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">프로필 사진</label>
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gray-100 shrink-0">
                  {form.profileImage ? (
                    <Image src={form.profileImage} alt="프로필 사진" fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl text-muted">👤</div>
                  )}
                </div>
                <div>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                    className="px-4 py-2 text-sm border border-dashed border-border rounded-lg text-muted hover:border-primary hover:text-primary transition-colors">
                    {uploading ? "업로드 중..." : form.profileImage ? "사진 변경" : "사진 업로드"}
                  </button>
                  <p className="text-xs text-muted mt-1">JPG, PNG, GIF 등</p>
                </div>
              </div>
            </div>

            <Input label="슬로건" value={form.slogan} onChange={(e) => setForm({ ...form, slogan: e.target.value })} placeholder="핵심 캠페인 메시지를 입력하세요" />
            <Textarea label="자기소개" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="후보자 소개를 작성하세요" />

            {/* Handle */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">핸들 (선택)</label>
              <div className="flex items-center border border-border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary">
                <span className="px-3 py-2 bg-background text-muted text-sm border-r border-border select-none whitespace-nowrap">{origin}/@</span>
                <input type="text" value={form.handle} onChange={(e) => handleHandleChange(e.target.value)} placeholder="seungbeom" maxLength={30}
                  className="flex-1 px-3 py-2 text-sm bg-surface focus:outline-none min-w-0" />
              </div>
              <div className="mt-1 min-h-[1.25rem]">{handleStatusText()}</div>
              <p className="text-xs text-muted mt-0.5">영어 소문자·숫자·_·- 사용 가능, 3~30자.</p>
            </div>

            {message && (
              <p className={`text-sm px-3 py-2 rounded-lg ${
                message.includes("실패") || message.includes("오류") || message.includes("사용 중")
                  ? "text-red-500 bg-red-50" : "text-green-600 bg-green-50"}`}>
                {message}
              </p>
            )}
            <Button type="submit" disabled={saving || handleStatus === "taken"}>
              {saving ? "저장 중..." : "프로필 저장"}
            </Button>
          </div>
        </Card>
      </form>

      {/* Election info card */}
      <Card className="mt-4">
        <h2 className="text-sm font-semibold text-foreground mb-3">선거 정보</h2>
        <div className="space-y-4">
          {/* Election type */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">선거 종류</label>
            <div className="flex gap-2">
              <select value={electionType} onChange={(e) => setElectionType(e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                <option value="">선거 종류를 선택하세요</option>
                {ELECTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <Button type="button" size="sm" onClick={handleElectionTypeSave} disabled={electionTypeSaving}>
                {electionTypeSaving ? "저장 중..." : "저장"}
              </Button>
            </div>
            {electionTypeMessage && (
              <p className={`text-xs mt-1 ${electionTypeMessage.includes("실패") ? "text-red-500" : "text-green-600"}`}>{electionTypeMessage}</p>
            )}
          </div>

          {/* NEC cascade district selector: 시도(fixed) → 구시군 → 선거구
              A "직접 입력" toggle switches to a free-text input for manual entry. */}
          <div className="border border-border rounded-lg p-3 bg-surface/50 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">선거구 설정</p>
              <button
                type="button"
                onClick={() => {
                  if (!manualDistrictMode) {
                    // pre-fill with current combined value before switching
                    const cur = isWardLevel && selectedWard
                      ? `${currentGun} ${selectedWard}`
                      : currentGun;
                    setManualDistrictText(cur);
                  }
                  setManualDistrictMode((m) => !m);
                  setDistrictMessage("");
                }}
                className="text-xs text-primary hover:underline"
              >
                {manualDistrictMode ? "드롭다운으로 전환" : "직접 입력"}
              </button>
            </div>

            {manualDistrictMode ? (
              /* ── Manual entry mode ─────────────────────────────────────────── */
              <>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">
                    선거구 직접 입력
                  </label>
                  <input
                    type="text"
                    placeholder="예: 천안시동남구 다선거구, 공주시"
                    value={manualDistrictText}
                    onChange={(e) => setManualDistrictText(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <p className="text-xs text-muted mt-1">
                    선거구 이름을 정확히 입력하세요. 이 값이 지도 후보자 박스와 프로필에 표시됩니다.
                  </p>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-muted">
                    입력: <span className="text-foreground">{manualDistrictText || "—"}</span>
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleDistrictSave}
                    disabled={!manualDistrictText.trim()}
                  >
                    선거구 저장
                  </Button>
                </div>
              </>
            ) : (
              /* ── Cascaded dropdown mode ─────────────────────────────────────── */
              <>
                {/* 시도 — fixed to 충청남도 */}
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">시도</label>
                  <div className="px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground/70 select-none">
                    충청남도
                  </div>
                </div>

                {/* 구시군 dropdown */}
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">구시군</label>
                  <select
                    value={currentGun}
                    onChange={(e) => { setCurrentGun(e.target.value); setSelectedWard(""); }}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="">구시군을 선택하세요</option>
                    {allDistricts.map((d) => <option key={d.name} value={d.name}>{d.name}</option>)}
                  </select>
                </div>

                {/* 선거구 dropdown — only for ward-level elections */}
                {isWardLevel && currentGun && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-muted">
                        선거구 <span className="text-muted/60 font-normal">(출처: 중앙선관위 · 제9회 전국동시지방선거)</span>
                      </label>
                    </div>
                    {loadingWards ? (
                      <div className="px-3 py-2 text-xs text-muted border border-border rounded-lg bg-surface/50">
                        선거구 불러오는 중...
                      </div>
                    ) : wards.length > 0 ? (
                      <select
                        value={selectedWard}
                        onChange={(e) => setSelectedWard(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      >
                        <option value="">선거구를 선택하세요</option>
                        {wards.map((w) => <option key={w.electCode} value={w.electName}>{w.electName}</option>)}
                      </select>
                    ) : (
                      <div className="px-3 py-2 text-xs text-amber-700 border border-amber-200 rounded-lg bg-amber-50/50">
                        선거구 정보 없음 —{" "}
                        <button
                          type="button"
                          onClick={() => {
                            setManualDistrictText(currentGun);
                            setManualDistrictMode(true);
                            setDistrictMessage("");
                          }}
                          className="underline font-medium hover:text-amber-900"
                        >
                          직접 입력하기
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Save district button */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-muted">
                    현재: <span className="text-foreground">{currentGun}{isWardLevel && selectedWard ? ` ${selectedWard}` : ""}</span>
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleDistrictSave}
                    disabled={!currentGun || (isWardLevel && !selectedWard)}
                  >
                    선거구 저장
                  </Button>
                </div>
              </>
            )}

            {districtMessage && (
              <p className={`text-xs ${districtMessage.includes("실패") ? "text-red-500" : "text-green-600"}`}>{districtMessage}</p>
            )}
          </div>

          {/* Pin notice */}
          <div className="px-3 py-2 bg-muted/10 border border-border rounded-lg">
            <p className="text-xs text-muted">📍 핀 위치 변경은 관리자에게 문의하세요.</p>
          </div>
        </div>
      </Card>

      {/* Social accounts card */}
      <Card className="mt-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">소셜 계정</h2>
          <Button type="button" size="sm" onClick={handleSocialSave} disabled={socialSaving}>
            {socialSaving ? "저장 중..." : "저장"}
          </Button>
        </div>
        <div className="space-y-3">
          {([
            { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@채널명" },
            { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/아이디" },
            { key: "twitter", label: "X (Twitter)", placeholder: "https://x.com/아이디" },
            { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/페이지명" },
            { key: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@아이디" },
            { key: "kakao", label: "KakaoTalk", placeholder: "오픈채팅 URL 또는 카카오 ID" },
            { key: "naverBlog", label: "Naver Blog", placeholder: "https://blog.naver.com/아이디" },
          ] as { key: keyof typeof socialForm; label: string; placeholder: string }[]).map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-muted mb-1">{label}</label>
              <input
                type="text"
                value={socialForm[key]}
                onChange={(e) => setSocialForm((f) => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          ))}
          {socialMessage && (
            <p className={`text-xs px-3 py-2 rounded-lg ${
              socialMessage.includes("실패") ? "text-red-500 bg-red-50" : "text-green-600 bg-green-50"
            }`}>
              {socialMessage}
            </p>
          )}
        </div>
      </Card>

      {/* Preview link */}
      {profileUrl && (
        <Card className="mt-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">내 공개 프로필</p>
              <p className="text-xs text-muted truncate mt-0.5">{profileUrl}</p>
            </div>
            <Button type="button" size="sm" variant="ghost" onClick={openPreview}>새 탭 열기 ↗</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
