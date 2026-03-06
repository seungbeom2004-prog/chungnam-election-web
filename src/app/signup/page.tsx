"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button, Input } from "@/components/ui";

interface NecDistrict {
  name: string;
  wiwCode: string;
  wOrder: number;
}

interface NecWard {
  wiwCode: string;
  wiwName: string;
  electCode: string;
  electName: string;
  wOrder: number;
}

interface NecElectionType {
  code: string;
  name: string;
}

interface NecCandidate {
  name: string;
  party: string;
  electionType: string;
  ward: string;
  district: string;
  registStatus: string;
}

// District selection depth based on election type
type DistrictLevel = "none" | "gun" | "ward";

function getDistrictLevel(electionTypeName: string): DistrictLevel {
  if (!electionTypeName) return "gun";
  if (
    electionTypeName.includes("도지사") ||
    electionTypeName.includes("교육감") ||
    electionTypeName.includes("광역의원비례")
  )
    return "none";
  if (electionTypeName.includes("의회의원선거") && !electionTypeName.includes("시·도의회"))
    return "ward";
  return "gun";
}

const PROVINCES = [{ value: "충청남도", label: "충청남도" }];

export default function SignupPage() {
  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [electionType, setElectionType] = useState("");
  const [province, setProvince] = useState("충청남도");
  const [district, setDistrict] = useState("");
  const [ward, setWard] = useState("");
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [isNominated, setIsNominated] = useState(false);
  const [isNecRegistered, setIsNecRegistered] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // NEC data
  const [districts, setDistricts] = useState<NecDistrict[]>([]);
  const [loadingDistricts, setLoadingDistricts] = useState(true);
  const [electionTypes, setElectionTypes] = useState<NecElectionType[]>([]);
  const [wards, setWards] = useState<NecWard[]>([]);
  const [loadingWards, setLoadingWards] = useState(false);

  // NEC pre-check step state
  const [necStep, setNecStep] = useState<"electiontype" | "question" | "district" | "candidates" | "form">("electiontype");
  const [necPrefilled, setNecPrefilled] = useState(false);
  const [necDistrict, setNecDistrict] = useState("천안시");
  const [necCandidates, setNecCandidates] = useState<NecCandidate[]>([]);
  const [loadingNecCandidates, setLoadingNecCandidates] = useState(false);
  const [necError, setNecError] = useState("");

  const districtLevel = getDistrictLevel(electionType);

  // Load districts and election types from NEC API
  useEffect(() => {
    fetch("/api/nec?type=districts")
      .then((r) => r.json())
      .then((json) => {
        const data: NecDistrict[] = json.data ?? [];
        data.sort((a, b) => a.wOrder - b.wOrder);
        setDistricts(data);
      })
      .catch(() => {
        import("@/lib/districts").then(({ CHUNGNAM_DISTRICTS }) => {
          setDistricts(
            CHUNGNAM_DISTRICTS.map((d, i) => ({
              name: d.name,
              wiwCode: "",
              wOrder: i + 1,
            }))
          );
        });
      })
      .finally(() => setLoadingDistricts(false));

    fetch("/api/nec?type=elections")
      .then((r) => r.json())
      .then((json) => {
        setElectionTypes(json.data ?? []);
      })
      .catch(() => {
        setElectionTypes([
          { code: "4", name: "구·시·군의 장선거" },
          { code: "6", name: "구·시·군의회의원선거" },
        ]);
      });
  }, []);

  // When district changes and election type is ward-level, fetch wards
  // Uses unified /api/districts/wards endpoint (DB first, NEC API fallback)
  useEffect(() => {
    if (districtLevel !== "ward" || !district) {
      setWards([]);
      setWard("");
      return;
    }

    const selected = districts.find((d) => d.name === district);
    const wiwCode = selected?.wiwCode || "";

    setLoadingWards(true);
    setWard("");

    const params = new URLSearchParams({ parent: district });
    if (wiwCode) params.set("wiwCode", wiwCode);

    fetch(`/api/districts/wards?${params.toString()}`)
      .then((r) => r.json())
      .then((json) => {
        setWards(json.data ?? []);
      })
      .catch(() => setWards([]))
      .finally(() => setLoadingWards(false));
  }, [district, districtLevel, districts]);

  // Reset district/ward when election type changes
  useEffect(() => {
    if (!necPrefilled) {
      setDistrict("");
      setWard("");
      setWards([]);
    }
  }, [electionType, necPrefilled]);

  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setProfileImage(e.target.files[0]);
    }
  };

  function buildDistrictValue(): string {
    if (districtLevel === "none") return province;
    if (districtLevel === "ward" && district && ward) return `${district} ${ward}`;
    return district;
  }

  // NEC candidate lookup
  const fetchNecCandidates = async () => {
    if (!necDistrict) return;
    setLoadingNecCandidates(true);
    setNecError("");
    try {
      const res = await fetch(`/api/nec/candidate?district=${encodeURIComponent(necDistrict)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      const candidates: NecCandidate[] = json.data ?? [];
      setNecCandidates(candidates);
      if (candidates.length === 0) {
        setNecError("해당 지역에서 등록된 후보자 정보를 찾을 수 없습니다.");
      } else {
        setNecStep("candidates");
      }
    } catch {
      setNecError("후보자 정보를 불러오는데 실패했습니다. 잠시 후 다시 시도하세요.");
    }
    setLoadingNecCandidates(false);
  };

  // Pre-fill form from NEC candidate selection
  const selectNecCandidate = (c: NecCandidate) => {
    const isReformParty = c.party === "개혁신당" || c.party.includes("개혁신당");
    if (!isReformParty) {
      setNecError("개혁신당 후보자만 가입할 수 있습니다.");
      return;
    }
    setName(c.name);
    setElectionType(c.electionType);
    setIsNecRegistered(true);
    // Parse ward into district + ward parts
    const wardStr = c.ward || "";
    const spaceIdx = wardStr.indexOf(" ");
    if (spaceIdx > -1) {
      setDistrict(wardStr.slice(0, spaceIdx));
      setWard(wardStr.slice(spaceIdx + 1));
    } else {
      setDistrict(c.district || wardStr);
      setWard("");
    }
    setNecPrefilled(true);
    setNecError("");
    setNecStep("form");
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
    if (districtLevel !== "none" && !district) {
      setError("지역을 선택해주세요.");
      return;
    }
    if (districtLevel === "ward" && !ward) {
      setError("선거구를 선택해주세요.");
      return;
    }
    if (!phone) {
      setError("전화번호를 입력해주세요.");
      return;
    }

    setLoading(true);

    try {
      let profileImageUrl: string | undefined;

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
          district: buildDistrictValue(),
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

  // ── Step 0: Select Election Type ─────────────────────────────────────────────
  if (necStep === "electiontype") {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-xl">개혁</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground">출마자 가입</h1>
            <p className="text-sm text-muted mt-1">출마하실 선거 종류를 선택하세요</p>
          </div>

          <div className="border border-border rounded-2xl p-5 bg-surface space-y-2">
            {electionTypes.length === 0 ? (
              <div className="flex justify-center py-8">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              electionTypes.map((type) => (
                <button
                  key={type.code}
                  type="button"
                  onClick={() => {
                    setElectionType(type.name);
                    setNecStep("question");
                  }}
                  className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl border border-border bg-background hover:bg-primary/5 hover:border-primary text-left transition-colors group"
                >
                  <span className="font-medium text-foreground text-sm">{type.name}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted group-hover:text-primary transition-colors shrink-0">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              ))
            )}
            <p className="text-xs text-muted text-center pt-2">
              출처: 중앙선관위 · 제9회 전국동시지방선거
            </p>
          </div>

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

  // ── Step 1: NEC Registration Question ────────────────────────────────────────
  if (necStep === "question") {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-xl">개혁</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground">출마자 가입</h1>
            {electionType && (
              <span className="inline-block mt-2 px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                {electionType}
              </span>
            )}
          </div>

          <div className="border border-border rounded-2xl p-6 bg-surface text-center space-y-4">
            <p className="text-base font-semibold text-foreground">
              선거관리위원회에 (예비)후보자 등록을 이미 하셨나요?
            </p>
            <p className="text-sm text-muted">
              선관위 등록 후보자는 자동으로 정보를 불러올 수 있습니다.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <Button
                size="lg"
                onClick={() => setNecStep("district")}
                className="w-full"
              >
                예, 이미 등록했습니다
              </Button>
              <Button
                size="lg"
                variant="ghost"
                onClick={() => setNecStep("form")}
                className="w-full"
              >
                아니요, 아직입니다
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between mt-6">
            <button
              type="button"
              onClick={() => setNecStep("electiontype")}
              className="text-xs text-muted hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
              선거 종류 다시 선택
            </button>
            <p className="text-xs text-muted">
              <Link href="/login" className="text-primary hover:underline">로그인</Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 2: Select District ───────────────────────────────────────────────────
  if (necStep === "district") {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-xl">개혁</span>
            </div>
            <h1 className="text-xl font-bold text-foreground">지역 선택</h1>
            <p className="text-sm text-muted mt-1">출마하실 시군구를 선택하세요</p>
          </div>

          <div className="border border-border rounded-2xl p-5 bg-surface space-y-4">
            {/* Election type badge */}
            {electionType && (
              <div className="px-3 py-2 bg-primary/5 rounded-lg border border-primary/20">
                <p className="text-xs text-primary font-medium">{electionType}</p>
              </div>
            )}

            {/* District button grid */}
            {loadingDistricts ? (
              <div className="flex justify-center py-4">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 max-h-52 overflow-y-auto py-1">
                {districts.map((d) => (
                  <button
                    key={d.name}
                    type="button"
                    onClick={() => setNecDistrict(d.name)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      necDistrict === d.name
                        ? "bg-primary text-white border-primary shadow-sm"
                        : "bg-background text-muted border-border hover:text-foreground hover:border-foreground/30"
                    }`}
                  >
                    {d.name}
                  </button>
                ))}
              </div>
            )}

            {necDistrict && (
              <p className="text-xs text-muted">
                선택됨: <span className="font-medium text-foreground">{necDistrict}</span>
              </p>
            )}

            {necError && (
              <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">
                {necError}
              </p>
            )}

            <div className="flex gap-2">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => { setNecStep("question"); setNecError(""); }}
              >
                뒤로
              </Button>
              <Button
                className="flex-1"
                onClick={fetchNecCandidates}
                disabled={!necDistrict || loadingNecCandidates}
              >
                {loadingNecCandidates ? "조회 중..." : "후보자 조회"}
              </Button>
            </div>

            <p className="text-xs text-muted text-center">
              출처: 중앙선관위 · 제9회 전국동시지방선거
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── NEC Pre-check: Step B — Select Candidate ─────────────────────────────────
  if (necStep === "candidates") {
    const reformCandidates = necCandidates.filter(
      (c) => c.party === "개혁신당" || c.party.includes("개혁신당")
    );
    const otherCandidates = necCandidates.filter(
      (c) => c.party !== "개혁신당" && !c.party.includes("개혁신당")
    );

    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-xl">개혁</span>
            </div>
            <h1 className="text-xl font-bold text-foreground">후보자 선택</h1>
            <p className="text-sm text-muted mt-1">
              {necDistrict} · 목록에서 본인을 선택하세요
            </p>
          </div>

          <div className="border border-border rounded-2xl bg-surface overflow-hidden">
            {necError && (
              <div className="px-4 py-3 text-sm text-red-500 bg-red-50 border-b border-border">
                {necError}
              </div>
            )}

            {reformCandidates.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-muted">
                <p className="font-medium text-foreground mb-1">이 지역에 개혁신당 후보자가 없습니다</p>
                <p>다른 지역을 선택하거나, 아래에서 직접 가입하세요.</p>
              </div>
            )}

            {reformCandidates.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-primary/5 border-b border-border">
                  <p className="text-xs font-semibold text-primary">개혁신당</p>
                </div>
                <div className="divide-y divide-border">
                  {reformCandidates.map((c, i) => (
                    <button
                      key={i}
                      onClick={() => selectNecCandidate(c)}
                      className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-background/60 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-primary font-bold text-sm">{c.name[0]}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground">{c.name}</p>
                        <p className="text-xs text-muted truncate">{c.electionType}</p>
                        {c.ward && (
                          <p className="text-xs text-primary truncate">{c.ward}</p>
                        )}
                        {c.registStatus && (
                          <span className="inline-block text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium mt-1">
                            {c.registStatus}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {otherCandidates.length > 0 && (
              <div className="border-t border-border">
                <div className="px-4 py-2 bg-muted/5">
                  <p className="text-xs text-muted">타 정당 (선택 불가)</p>
                </div>
                <div className="divide-y divide-border">
                  {otherCandidates.map((c, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 px-4 py-3 opacity-40"
                    >
                      <div className="w-8 h-8 rounded-full bg-muted/10 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-muted font-bold text-sm">{c.name[0]}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground">{c.name}</p>
                        <p className="text-xs text-muted">{c.party} · {c.electionType}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-4">
            <Button
              variant="ghost"
              className="flex-1"
              onClick={() => { setNecStep("district"); setNecError(""); }}
            >
              뒤로
            </Button>
            <Button
              variant="ghost"
              className="flex-1"
              onClick={() => { setNecStep("form"); setNecPrefilled(false); setNecError(""); }}
            >
              직접 입력하기
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main Signup Form (necStep === "form") ────────────────────────────────────
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

        {/* NEC pre-filled summary */}
        {necPrefilled && (
          <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-xl">
            <div className="flex items-start gap-2">
              <span className="text-green-600 mt-0.5">✓</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-green-700">선관위 등록 확인</p>
                <p className="text-sm text-green-800 font-bold mt-0.5">{name}</p>
                <p className="text-xs text-green-700 truncate">{electionType}</p>
                {(district || ward) && (
                  <p className="text-xs text-green-700 truncate">
                    {district}{ward ? ` ${ward}` : ""}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setNecStep("question")}
                className="text-xs text-green-600 hover:text-green-800 shrink-0"
              >
                변경
              </button>
            </div>
          </div>
        )}

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

          {/* Name — read-only if pre-filled */}
          {necPrefilled ? (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">이름</label>
              <div className="px-3 py-2 border border-border rounded-lg bg-muted/10 text-sm text-foreground">
                {name}
              </div>
            </div>
          ) : (
            <Input
              label="이름"
              type="text"
              placeholder="홍길동"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          )}

          {/* Phone */}
          <Input
            label="전화번호"
            type="tel"
            placeholder="010-1234-5678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />

          {/* Election type, province, district, ward — read-only if NEC pre-filled */}
          {necPrefilled ? (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">선거 정보</label>
              <div className="px-3 py-2 border border-border rounded-lg bg-muted/10 text-sm text-foreground space-y-0.5">
                <p>{electionType}</p>
                <p className="text-muted text-xs">{province} · {district}{ward ? ` ${ward}` : ""}</p>
              </div>
              <p className="text-xs text-muted mt-1">출처: 중앙선관위 · 제9회 전국동시지방선거</p>
            </div>
          ) : (
            <>
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

              {/* District (구시군) */}
              {districtLevel !== "none" && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    시군구{" "}
                    <span className="text-xs text-muted font-normal">(선거구)</span>
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
                      {loadingDistricts ? "불러오는 중..." : "시군구를 선택하세요"}
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
              )}

              {/* Ward */}
              {districtLevel === "ward" && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    선거구{" "}
                    <span className="text-xs text-muted font-normal">(세부 선거구)</span>
                    <span className="text-red-500">*</span>
                  </label>
                  {loadingWards ? (
                    <div className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg bg-surface text-sm text-muted">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
                      선거구 정보를 불러오는 중...
                    </div>
                  ) : !district ? (
                    <div className="px-3 py-2 border border-border rounded-lg bg-surface text-sm text-muted">
                      시군구를 먼저 선택하세요
                    </div>
                  ) : wards.length > 0 ? (
                    <select
                      value={ward}
                      onChange={(e) => setWard(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    >
                      <option value="">선거구를 선택하세요</option>
                      {wards.map((w) => (
                        <option key={w.electCode} value={w.electName}>
                          {w.electName}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="px-3 py-2 border border-border rounded-lg bg-surface text-sm text-muted">
                      선거구 정보를 불러올 수 없습니다. 잠시 후 다시 시도하세요.
                    </div>
                  )}
                  <p className="text-xs text-muted mt-1">
                    출처: 중앙선관위 · 제9회 전국동시지방선거
                  </p>
                </div>
              )}

              {/* Province-level notice */}
              {districtLevel === "none" && electionType && (
                <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-700">
                    선택하신 선거는 <strong>충청남도 전체</strong>를 선거구로 합니다.
                  </p>
                </div>
              )}
            </>
          )}

          {/* Profile Image */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              프로필 이미지{" "}
              <span className="text-xs text-muted font-normal">(선택)</span>
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleProfileImageChange}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            />
            {profileImage && (
              <p className="text-xs text-muted mt-1">선택됨: {profileImage.name}</p>
            )}
          </div>

          {/* Status Section — hidden if NEC pre-filled (isNecRegistered already set) */}
          {!necPrefilled && (
            <div className="border border-border rounded-lg p-4 bg-surface/50">
              <label className="block text-sm font-medium text-foreground mb-3">상태</label>

              <div className="flex items-center mb-3">
                <input
                  type="checkbox"
                  id="isNominated"
                  checked={isNominated}
                  onChange={(e) => setIsNominated(e.target.checked)}
                  className="w-4 h-4 accent-primary rounded"
                />
                <label htmlFor="isNominated" className="ml-2.5 text-sm text-foreground cursor-pointer">
                  당에서 공천을 받았습니다 (공천 여부)
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isNecRegistered"
                  checked={isNecRegistered}
                  onChange={(e) => setIsNecRegistered(e.target.checked)}
                  className="w-4 h-4 accent-primary rounded"
                />
                <label htmlFor="isNecRegistered" className="ml-2.5 text-sm text-foreground cursor-pointer">
                  중앙선관위에 등록되었습니다 (NEC 등록 여부)
                </label>
              </div>
            </div>
          )}

          {/* Nomination checkbox when pre-filled */}
          {necPrefilled && (
            <div className="border border-border rounded-lg p-4 bg-surface/50">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isNominated2"
                  checked={isNominated}
                  onChange={(e) => setIsNominated(e.target.checked)}
                  className="w-4 h-4 accent-primary rounded"
                />
                <label htmlFor="isNominated2" className="ml-2.5 text-sm text-foreground cursor-pointer">
                  당에서 공천을 받았습니다 (공천 여부)
                </label>
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
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
