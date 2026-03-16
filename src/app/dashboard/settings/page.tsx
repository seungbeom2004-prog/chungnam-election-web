"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { Button, Input } from "@/components/ui";
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

// ─── Web Push Notification Card ──────────────────────────────────────────────

function PushNotificationCard() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("unsupported");
    } else {
      setPermission(Notification.permission);
    }
  }, []);

  const handleRequest = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    setRequesting(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
    } catch {
      // ignore
    } finally {
      setRequesting(false);
    }
  };

  return (
    <Card className="mt-6">
      <h2 className="text-base font-semibold text-foreground mb-1">웹 푸시 알림</h2>
      <p className="text-sm text-muted mb-4">
        공약에 댓글이 달리거나 관리자 알림이 있을 때 알림을 받을 수 있습니다.
      </p>
      {permission === "unsupported" && (
        <div className="flex items-center gap-2 text-sm text-muted bg-background rounded-lg px-3 py-2">
          <span>⚠️</span>
          <span>이 브라우저는 웹 푸시 알림을 지원하지 않습니다.</span>
        </div>
      )}
      {permission === "granted" && (
        <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2">
          <span>✓</span>
          <span>알림이 허용되어 있습니다.</span>
        </div>
      )}
      {permission === "denied" && (
        <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
          <span>⚠️</span>
          <span>알림이 차단되어 있습니다. 브라우저 설정에서 알림을 허용해 주세요.</span>
        </div>
      )}
      {permission === "default" && (
        <button
          onClick={handleRequest}
          disabled={requesting}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {requesting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              요청 중...
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              알림 허용
            </>
          )}
        </button>
      )}
    </Card>
  );
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const candidateId = (session?.user as { id?: string })?.id;

  // PW gate
  const [unlocked, setUnlocked] = useState(false);
  const [gatePassword, setGatePassword] = useState("");
  const [gateError, setGateError] = useState("");
  const [gateChecking, setGateChecking] = useState(false);

  // Personal info form
  const [form, setForm] = useState({
    name: "",
    phone: "",
    district: "",
    electionId: "",
    candidateStatus: "출마예정자" as string,
    caucusStatus: "공천 미확정" as string,
  });
  const [districts, setDistricts] = useState<DistrictOption[]>([]);
  const [elections, setElections] = useState<ElectionOption[]>([]);
  const [infoSaving, setInfoSaving] = useState(false);
  const [infoMessage, setInfoMessage] = useState("");

  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwMessage, setPwMessage] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  // Account deletion
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteMessage, setDeleteMessage] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!unlocked || !candidateId) return;
    Promise.all([
      fetch("/api/districts").then((r) => r.json()),
      fetch("/api/elections").then((r) => r.json()),
      fetch(`/api/candidates/${candidateId}`).then((r) => r.json()),
    ]).then(([distJson, elecJson, candJson]) => {
      const dists: DistrictOption[] = (distJson.data ?? []).map(
        (d: { name: string; sortOrder?: number }) => ({ name: d.name, wOrder: d.sortOrder })
      );
      setDistricts(dists);
      setElections(elecJson.data ?? []);

      const data = candJson.data ?? candJson;
      setForm({
        name: data.name || "",
        phone: data.phone || "",
        district: data.district || "",
        electionId: data.electionId || "",
        candidateStatus: data.candidateStatus || "출마예정자",
        caucusStatus: data.caucusStatus || "공천 미확정",
      });
    });
  }, [unlocked, candidateId]);

  const handleGateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGateError("");
    setGateChecking(true);
    try {
      const res = await fetch("/api/account/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: gatePassword }),
      });
      if (res.ok) {
        setUnlocked(true);
      } else {
        const json = await res.json().catch(() => ({}));
        setGateError(json.error || "비밀번호가 틀렸습니다.");
      }
    } catch {
      setGateError("인증에 실패했습니다.");
    }
    setGateChecking(false);
  };

  const handleInfoSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateId) return;
    setInfoSaving(true);
    setInfoMessage("");

    const res = await fetch(`/api/candidates/${candidateId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        phone: form.phone || null,
        district: form.district,
        electionId: form.electionId || null,
        candidateStatus: form.candidateStatus,
        caucusStatus: form.caucusStatus,
      }),
    });

    setInfoSaving(false);
    if (res.ok) {
      setInfoMessage("저장되었습니다.");
    } else {
      const json = await res.json().catch(() => ({}));
      setInfoMessage(json.error || "저장에 실패했습니다.");
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMessage("");

    if (newPassword !== confirmPassword) {
      setPwMessage("새 비밀번호가 일치하지 않습니다.");
      return;
    }
    if (newPassword.length < 8) {
      setPwMessage("비밀번호는 8자 이상이어야 합니다.");
      return;
    }

    setPwSaving(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const json = await res.json();
      if (!res.ok) {
        setPwMessage(json.error || "비밀번호 변경에 실패했습니다.");
      } else {
        setPwMessage("비밀번호가 변경되었습니다.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      setPwMessage("네트워크 오류가 발생했습니다.");
    }
    setPwSaving(false);
  };

  const handleDeleteAccount = async () => {
    if (!candidateId || deleteConfirmText !== "삭제") return;
    setDeleting(true);
    setDeleteMessage("");
    try {
      const res = await fetch(`/api/candidates/${candidateId}`, { method: "DELETE" });
      if (res.ok) {
        await signOut({ callbackUrl: "/" });
      } else {
        const json = await res.json().catch(() => ({}));
        setDeleteMessage(json.error || "계정 삭제에 실패했습니다.");
      }
    } catch {
      setDeleteMessage("네트워크 오류가 발생했습니다.");
    }
    setDeleting(false);
  };

  // Password gate screen
  if (!unlocked) {
    return (
      <div className="max-w-md mx-auto">
        <h1 className="text-xl font-bold text-foreground mb-4">개인 정보 관리</h1>
        <Card>
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-primary-light rounded-full flex items-center justify-center mx-auto mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  stroke="#FF5A00"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h2 className="font-semibold text-foreground">개인 정보 접근 확인</h2>
            <p className="text-sm text-muted mt-1">
              개인 정보를 수정하려면 비밀번호를 입력하세요.
            </p>
          </div>
          <form onSubmit={handleGateSubmit} className="space-y-4">
            <Input
              label="비밀번호"
              type="password"
              value={gatePassword}
              onChange={(e) => setGatePassword(e.target.value)}
              required
              autoFocus
            />
            {gateError && (
              <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">
                {gateError}
              </p>
            )}
            <Button type="submit" disabled={gateChecking} className="w-full">
              {gateChecking ? "확인 중..." : "확인"}
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-foreground">개인 정보 관리</h1>
        <button
          onClick={() => setUnlocked(false)}
          className="text-xs text-muted hover:text-foreground transition-colors flex items-center gap-1"
        >
          🔒 잠금
        </button>
      </div>

      {/* Personal info section */}
      <Card className="mb-6">
        <h2 className="text-base font-semibold text-foreground mb-4">기본 정보</h2>
        <form onSubmit={handleInfoSave} className="space-y-4">
          <Input
            label="이름"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />

          <Input
            label="연락처"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="010-0000-0000"
          />

          {/* District selection */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              선거구
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

          {infoMessage && (
            <p
              className={`text-sm px-3 py-2 rounded-lg ${
                infoMessage.includes("실패") || infoMessage.includes("오류")
                  ? "text-red-500 bg-red-50"
                  : "text-green-600 bg-green-50"
              }`}
            >
              {infoMessage}
            </p>
          )}

          <Button type="submit" disabled={infoSaving}>
            {infoSaving ? "저장 중..." : "정보 저장"}
          </Button>
        </form>
      </Card>

      {/* Password change section */}
      <Card>
        <h2 className="text-base font-semibold text-foreground mb-4">비밀번호 변경</h2>
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

          {pwMessage && (
            <p
              className={`text-sm px-3 py-2 rounded-lg ${
                pwMessage.includes("일치하지") || pwMessage.includes("이상") || pwMessage.includes("실패") || pwMessage.includes("오류")
                  ? "text-red-500 bg-red-50"
                  : "text-green-600 bg-green-50"
              }`}
            >
              {pwMessage}
            </p>
          )}

          <Button type="submit" disabled={pwSaving}>
            {pwSaving ? "변경 중..." : "비밀번호 변경"}
          </Button>
        </form>
      </Card>

      {/* Web Push Notifications */}
      <PushNotificationCard />

      {/* Account deletion danger zone */}
      <Card className="mt-6 border-red-200 bg-red-50/30">
        <h2 className="text-base font-semibold text-red-600 mb-1">계정 삭제</h2>
        <p className="text-sm text-muted mb-4">
          계정을 삭제하면 모든 공약, 프로필 정보가 영구적으로 삭제되며 복구할 수 없습니다.
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              확인을 위해 <span className="font-bold text-red-600">삭제</span>를 입력하세요
            </label>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="삭제"
              className="w-full px-3 py-2 text-sm border border-red-200 rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 transition-colors"
            />
          </div>
          {deleteMessage && (
            <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{deleteMessage}</p>
          )}
          <button
            type="button"
            onClick={handleDeleteAccount}
            disabled={deleting || deleteConfirmText !== "삭제"}
            className="w-full px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {deleting ? "삭제 중..." : "계정 영구 삭제"}
          </button>
        </div>
      </Card>
    </div>
  );
}
