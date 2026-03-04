"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button, Input } from "@/components/ui";

interface NecDistrict {
  name: string;
  wOrder: number;
}

interface NecElectionType {
  code: string;
  name: string;
}

const PROVINCES = [{ value: "충청남도", label: "충청남도" }];

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [electionType, setElectionType] = useState("");
  const [province, setProvince] = useState("충청남도");
  const [district, setDistrict] = useState("");
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [isNominated, setIsNominated] = useState(false);
  const [isNecRegistered, setIsNecRegistered] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [districts, setDistricts] = useState<NecDistrict[]>([]);
  const [loadingDistricts, setLoadingDistricts] = useState(true);
  const [electionTypes, setElectionTypes] = useState<NecElectionType[]>([]);

  // Load districts and election types from NEC API
  useEffect(() => {
    // Load districts
    fetch("/api/nec?type=districts")
      .then((r) => r.json())
      .then((json) => {
        const data: NecDistrict[] = json.data ?? [];
        data.sort((a, b) => a.wOrder - b.wOrder);
        setDistricts(data);
      })
      .catch(() => {
        // Fallback: static list
        import("@/lib/districts").then(({ CHUNGNAM_DISTRICTS }) => {
          setDistricts(
            CHUNGNAM_DISTRICTS.map((d, i) => ({ name: d.name, wOrder: i + 1 }))
          );
        });
      })
      .finally(() => setLoadingDistricts(false));

    // Load election types
    fetch("/api/nec?type=elections")
      .then((r) => r.json())
      .then((json) => {
        setElectionTypes(json.data ?? []);
      })
      .catch(() => {
        // Fallback: static list
        setElectionTypes([
          { code: "4", name: "구·시·군의 장선거" },
          { code: "6", name: "구·시·군의회의원선거" },
        ]);
      });
  }, []);

  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setProfileImage(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    if (password.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (!electionType) {
      setError("선거 종류를 선택해주세요.");
      return;
    }
    if (!province) {
      setError("시도를 선택해주세요.");
      return;
    }
    if (!district) {
      setError("지역을 선택해주세요.");
      return;
    }
    if (!phone) {
      setError("전화번호를 입력해주세요.");
      return;
    }

    setLoading(true);

    try {
      let profileImageUrl: string | undefined;

      // Upload profile image if provided
      if (profileImage) {
        const formData = new FormData();
        formData.append("file", profileImage);

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          setLoading(false);
          setError("프로필 이미지 업로드에 실패했습니다.");
          return;
        }

        const uploadJson = await uploadRes.json();
        profileImageUrl = uploadJson.url;
      }

      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          name,
          phone,
          electionType,
          province,
          district,
          profileImage: profileImageUrl,
          isNominated,
          isNecRegistered,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "회원가입에 실패했습니다.");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    }

    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 13l4 4L19 7"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            가입이 완료되었습니다
          </h1>
          <p className="text-sm text-muted mb-6">
            관리자 승인 후 로그인이 가능합니다.
            <br />
            승인까지 다소 시간이 걸릴 수 있습니다.
          </p>
          <Link href="/login">
            <Button className="w-full" size="lg">
              로그인 페이지로
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-xl">개혁</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">출마자 가입</h1>
          <p className="text-sm text-muted mt-1">
            출마자 계정을 등록하세요
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <Input
            label="이메일"
            type="email"
            placeholder="example@reform.kr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          {/* Password */}
          <Input
            label="비밀번호"
            type="password"
            placeholder="8자 이상"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {/* Password Confirm */}
          <Input
            label="비밀번호 확인"
            type="password"
            placeholder="비밀번호를 다시 입력"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            required
          />

          {/* Name */}
          <Input
            label="이름"
            type="text"
            placeholder="홍길동"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          {/* Phone (now required) */}
          <Input
            label="전화번호"
            type="tel"
            placeholder="010-1234-5678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />

          {/* Election Type */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              선거 종류 <span className="text-red-500">*</span>
            </label>
            <select
              value={electionType}
              onChange={(e) => setElectionType(e.target.value)}
              required
              disabled={electionTypes.length === 0}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors disabled:opacity-60"
            >
              <option value="">
                {electionTypes.length === 0 ? "불러오는 중..." : "선택하세요"}
              </option>
              {electionTypes.map((type) => (
                <option key={type.code} value={type.name}>
                  {type.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted mt-1">
              출처: 중앙선관위 · 제9회 전국동시지방선거
            </p>
          </div>

          {/* Province */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              시도 <span className="text-red-500">*</span>
            </label>
            <select
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            >
              {PROVINCES.map((prov) => (
                <option key={prov.value} value={prov.value}>
                  {prov.label}
                </option>
              ))}
            </select>
          </div>

          {/* District */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              지역 <span className="text-xs text-muted font-normal">(선거구)</span>
              <span className="text-red-500">*</span>
            </label>
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              required
              disabled={loadingDistricts}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors disabled:opacity-60"
            >
              <option value="">
                {loadingDistricts ? "불러오는 중..." : "지역을 선택하세요"}
              </option>
              {districts.map((d) => (
                <option key={d.name} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted mt-1">
              출처: 중앙선관위 · 제9회 전국동시지방선거
            </p>
          </div>

          {/* Profile Image (optional) */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              프로필 이미지 <span className="text-xs text-muted font-normal">(선택)</span>
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleProfileImageChange}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            />
            {profileImage && (
              <p className="text-xs text-muted mt-1">
                선택됨: {profileImage.name}
              </p>
            )}
          </div>

          {/* Status Section */}
          <div className="border border-border rounded-lg p-4 bg-surface/50">
            <label className="block text-sm font-medium text-foreground mb-3">
              상태
            </label>

            {/* Nominated by Party */}
            <div className="flex items-center mb-3">
              <input
                type="checkbox"
                id="isNominated"
                checked={isNominated}
                onChange={(e) => setIsNominated(e.target.checked)}
                className="w-4 h-4 accent-primary rounded"
              />
              <label
                htmlFor="isNominated"
                className="ml-2.5 text-sm text-foreground cursor-pointer"
              >
                당에서 공천을 받았습니다 (공천 여부)
              </label>
            </div>

            {/* NEC Registered */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isNecRegistered"
                checked={isNecRegistered}
                onChange={(e) => setIsNecRegistered(e.target.checked)}
                className="w-4 h-4 accent-primary rounded"
              />
              <label
                htmlFor="isNecRegistered"
                className="ml-2.5 text-sm text-foreground cursor-pointer"
              >
                중앙선관위에 등록되었습니다 (NEC 등록 여부)
              </label>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? "가입 중..." : "회원가입"}
          </Button>
        </form>

        <p className="text-xs text-muted text-center mt-6">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="text-primary hover:underline">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
