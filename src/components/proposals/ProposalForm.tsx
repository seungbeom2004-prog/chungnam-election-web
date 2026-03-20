"use client";

import { useState, useRef, useEffect } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { CHUNGNAM_DISTRICTS } from "@/lib/districts";
import { trackProposalSubmit } from "@/lib/analytics";

const LocationPickerMap = dynamic(() => import("./LocationPickerMap"), { ssr: false });

interface Props {
  candidateId?: string;
  city?: string;
  postType?: "민원" | "제안";
  onSuccess?: () => void;
}

const LEGAL_NOTICE = `[게시물 작성 시 유의사항 및 법적 책임]
본 홈페이지의 게시판, 댓글 등에 글을 작성할 때는 깨끗하고 공정한 선거문화 정착을 위해 다음 사항을 지켜주시기 바랍니다.

1. 허위사실 유포 금지: 당선되거나 되게 하거나 낙선시킬 목적으로 특정 후보자(가족 포함)에 대한 허위사실을 게재하는 행위는 공직선거법 제250조에 따라 엄격히 금지되며 형사처벌의 대상이 될 수 있습니다.

2. 후보자 비방 금지: 공연히 사실을 적시하여 타 후보자나 그 가족을 비방하거나, 특정 지역 및 성별을 비하·모욕하는 행위는 공직선거법 제251조 및 제110조에 따라 금지됩니다.

3. 본 홈페이지의 관리자는 공직선거법을 위반하는 내용(허위사실, 비방, 불법 선거운동 등)이 포함된 게시물이나 댓글을 발견할 경우, 사전 통보 없이 즉시 삭제할 수 있으며, 해당 게시물로 인해 발생하는 모든 민·형사상 법적 책임은 작성자 본인에게 있습니다.`;

export default function ProposalForm({ candidateId, city: propCity, onSuccess }: Props) {
  const { data: session } = useSession();
  const isCandidate = (session?.user as { role?: string })?.role === "candidate";
  const isAdmin = (session?.user as { role?: string })?.role === "admin";

  const [postType, setPostType] = useState<"민원" | "제안">("제안");
  const [selectedCity, setSelectedCity] = useState<string>(propCity ?? "");
  const [title, setTitle] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [password, setPassword] = useState("");
  const [content, setContent] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [useDetailedLocation, setUseDetailedLocation] = useState(false);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  const MAX_CONTENT = 500;
  const MAX_TITLE = 50;
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "";

  // Set default authorName for admin
  useEffect(() => {
    if (isAdmin && !authorName) {
      setAuthorName("익명");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  // When city changes, update lat/lng to city center (unless detailed location enabled)
  const handleCityChange = (cityName: string) => {
    setSelectedCity(cityName);
    if (!useDetailedLocation) {
      setLatitude(null);
      setLongitude(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (honeypot) return;

    if (!selectedCity) {
      setError("지역을 선택해주세요.");
      return;
    }

    if (title.trim().length < 2 || title.trim().length > MAX_TITLE) {
      setError(`제목은 2자 이상 ${MAX_TITLE}자 이하로 입력해주세요.`);
      return;
    }

    // Guest-only validation
    if (!isCandidate && !isAdmin) {
      if (authorName.trim().length < 2 || authorName.trim().length > 20) {
        setError("작성자명은 2자 이상 20자 이하로 입력해주세요.");
        return;
      }
      if (password.length < 4 || password.length > 20) {
        setError("비밀번호는 4자 이상 20자 이하로 입력해주세요.");
        return;
      }
      // Reserved name check (guest only)
      const RESERVED_NAMES = ["관리자", "admin", "administrator", "운영자", "개혁신당", "후보자", "candidate"];
      const lowerName = authorName.trim().toLowerCase();
      if (RESERVED_NAMES.some((n) => lowerName.includes(n.toLowerCase()))) {
        setError("사용할 수 없는 이름입니다.");
        return;
      }
    }

    if (content.trim().length < 10 || content.trim().length > MAX_CONTENT) {
      setError(`내용은 10자 이상 ${MAX_CONTENT}자 이하로 입력해주세요.`);
      return;
    }
    if (useDetailedLocation && (latitude == null || longitude == null)) {
      setError("지도에서 세부 위치를 클릭해서 선택해주세요.");
      return;
    }

    // reCAPTCHA for guests only (not candidate, not admin)
    if (!isCandidate && !isAdmin) {
      const recaptchaToken = recaptchaRef.current?.getValue();
      if (siteKey && !recaptchaToken) {
        setError("보안 문자를 완료해주세요.");
        return;
      }
    }

    setSubmitting(true);
    try {
      // Resolve lat/lng: if detailed location, use picked pin; else use city center
      const cityData = CHUNGNAM_DISTRICTS.find((d) => d.name === selectedCity);
      const resolvedLat = useDetailedLocation && latitude != null ? latitude : (cityData?.centerLat ?? null);
      const resolvedLng = useDetailedLocation && longitude != null ? longitude : (cityData?.centerLng ?? null);

      const body: Record<string, unknown> = {
        title: title.trim(),
        content: content.trim(),
        postType,
        city: selectedCity,
      };

      if (resolvedLat != null) body.latitude = resolvedLat;
      if (resolvedLng != null) body.longitude = resolvedLng;
      if (candidateId) body.candidateId = candidateId;

      if (isAdmin) {
        body.authorName = authorName.trim() || "익명";
      } else if (!isCandidate) {
        const recaptchaToken = recaptchaRef.current?.getValue();
        body.authorName = authorName.trim();
        body.password = password;
        body.captchaToken = recaptchaToken ?? "no-captcha";
      }

      const res = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.status === 429) {
        setError("1시간에 최대 5개의 제안만 작성할 수 있습니다. 잠시 후 다시 시도해주세요.");
        recaptchaRef.current?.reset();
        return;
      }

      // 451: banned word detected — redirect to the configured URL
      if (res.status === 451) {
        const json = await res.json().catch(() => ({}));
        const redirectUrl = json.redirectUrl ?? "https://check.junseok.kr/";
        window.location.href = redirectUrl;
        return;
      }

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? "제출에 실패했습니다. 다시 시도해주세요.");
        recaptchaRef.current?.reset();
        return;
      }

      setSuccess(true);
      trackProposalSubmit(postType as "민원" | "제안", selectedCity || undefined);
      setTitle("");
      setAuthorName("");
      setPassword("");
      setContent("");
      setLatitude(null);
      setLongitude(null);
      setUseDetailedLocation(false);
      recaptchaRef.current?.reset();
      onSuccess?.();
    } catch {
      setError("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
      recaptchaRef.current?.reset();
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="p-5 border border-border rounded-xl bg-surface text-center">
        <p className="text-sm font-medium text-foreground mb-1">🎉 {postType}이 접수되었습니다!</p>
        <p className="text-xs text-muted mb-3">소중한 의견 감사합니다. 검토 후 게시됩니다.</p>
        <button
          onClick={() => setSuccess(false)}
          className="px-4 py-2 text-sm font-semibold bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
        >
          ✍️ 추가 작성하기
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="p-5 border border-border rounded-xl bg-surface space-y-3"
    >
      <h2 className="text-sm font-semibold text-foreground">✍️ 불편 제보 / 공약 제안 작성</h2>

      {/* Post type selector */}
      <div className="flex gap-2">
        <button type="button" onClick={() => setPostType("제안")} className={`flex-1 py-2 text-sm font-bold rounded-lg border transition-colors ${postType === "제안" ? "bg-yellow-400 text-gray-900 border-yellow-400" : "bg-background text-muted border-border"}`}>💡 공약 제안</button>
        <button type="button" onClick={() => setPostType("민원")} className={`flex-1 py-2 text-sm font-bold rounded-lg border transition-colors ${postType === "민원" ? "bg-red-500 text-white border-red-500" : "bg-background text-muted border-border"}`}>📢 불편 제보</button>
      </div>

      {/* Legal notice */}
      <details className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <summary className="text-xs font-semibold text-amber-800 cursor-pointer select-none">
          📋 게시물 작성 시 유의사항 및 법적 책임 (펼치기)
        </summary>
        <div className="mt-2 text-xs text-amber-800 leading-relaxed whitespace-pre-line">
          {LEGAL_NOTICE}
        </div>
      </details>

      <p className="text-xs text-muted -mt-1 mb-1">* 표시는 필수 항목입니다</p>

      {/* Honeypot */}
      <input
        type="text"
        name="website"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        style={{ display: "none" }}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />

      {/* City selector (required) */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          📍 지역 선택<span aria-hidden="true"> *</span>
        </label>
        <select
          value={selectedCity}
          onChange={(e) => handleCityChange(e.target.value)}
          required
          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
        >
          <option value="">-- 지역을 선택하세요 --</option>
          {CHUNGNAM_DISTRICTS.map((d) => (
            <option key={d.name} value={d.name}>{d.name}</option>
          ))}
        </select>
        {selectedCity && !useDetailedLocation && (
          <p className="text-[11px] text-muted mt-1">
            📌 {selectedCity} 전체 지역으로 등록됩니다. 세부 위치를 추가하려면 아래 체크박스를 선택하세요.
          </p>
        )}
      </div>

      {/* Title */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-sm font-medium text-foreground">제목<span aria-hidden="true"> *</span></label>
          <span className={`text-xs ${title.length > MAX_TITLE ? "text-red-500" : "text-muted"}`}>
            {title.length}/{MAX_TITLE}
          </span>
        </div>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={`${postType === "민원" ? "불편 제보" : "공약 제안"} 제목을 입력해주세요`}
          maxLength={MAX_TITLE}
          required
          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
        />
      </div>

      {/* 작성자명 + Password — hidden for logged-in candidates and admin */}
      {!isCandidate && !isAdmin && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">작성자명<span aria-hidden="true"> *</span></label>
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="홍길동"
              maxLength={20}
              required
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              비밀번호<span aria-hidden="true"> *</span> <span className="text-xs text-muted font-normal">(삭제용)</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="4~20자"
              minLength={4}
              maxLength={20}
              required
              aria-required="true"
              autoComplete="new-password"
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            />
          </div>
        </div>
      )}

      {/* Admin section */}
      {isAdmin && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
            <span>🛡️</span>
            <p className="text-xs text-blue-700 font-medium">관리자로 작성됩니다 (이름을 &quot;익명&quot;으로 설정하거나 변경할 수 있습니다)</p>
          </div>
          <input
            type="text"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder="익명"
            maxLength={20}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
          />
        </div>
      )}

      {/* Candidate badge */}
      {isCandidate && (
        <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg">
          <span className="text-sm">🏛️</span>
          <p className="text-xs text-primary font-medium">
            후보자 계정으로 작성됩니다 · <strong>{session?.user?.name}</strong>
          </p>
        </div>
      )}

      {/* Content */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-sm font-medium text-foreground">내용<span aria-hidden="true"> *</span></label>
          <span className={`text-xs ${content.length > MAX_CONTENT ? "text-red-500" : "text-muted"}`}>
            {content.length} / {MAX_CONTENT}
          </span>
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={postType === "민원" ? "불편 사항을 구체적으로 작성해주세요." : "공약으로 제안하고 싶은 내용을 구체적으로 작성해주세요."}
          maxLength={MAX_CONTENT}
          rows={4}
          required
          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors resize-none"
        />
      </div>

      {/* Detailed location (optional) — only available after city is selected */}
      {selectedCity && (
        <div className="border border-dashed border-border rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="use-detailed-location"
              checked={useDetailedLocation}
              onChange={(e) => {
                setUseDetailedLocation(e.target.checked);
                if (!e.target.checked) { setLatitude(null); setLongitude(null); }
              }}
              className="w-4 h-4 accent-primary"
            />
            <label htmlFor="use-detailed-location" className="text-sm text-foreground cursor-pointer">
              📍 세부 위치 추가 <span className="text-xs text-muted">(선택, 지도에 정확한 위치로 표시됩니다)</span>
            </label>
          </div>
          {useDetailedLocation && (
            <div className="space-y-2">
              <LocationPickerMap
                lat={latitude}
                lng={longitude}
                onChange={(lat, lng) => { setLatitude(lat); setLongitude(lng); }}
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="lat-input" className="block text-xs text-muted mb-1">위도 (직접입력)</label>
                  <input id="lat-input" type="number" value={latitude ?? ""} onChange={e => setLatitude(e.target.value ? parseFloat(e.target.value) : null)} placeholder="36.5184" step="0.000001" className="w-full px-2 py-1.5 text-xs border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30" />
                </div>
                <div>
                  <label htmlFor="lng-input" className="block text-xs text-muted mb-1">경도 (직접입력)</label>
                  <input id="lng-input" type="number" value={longitude ?? ""} onChange={e => setLongitude(e.target.value ? parseFloat(e.target.value) : null)} placeholder="126.8000" step="0.000001" className="w-full px-2 py-1.5 text-xs border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30" />
                </div>
              </div>
              {latitude != null && longitude != null && (
                <p className="text-xs text-primary text-center font-medium">✅ 세부 위치 선택됨: {latitude.toFixed(5)}, {longitude.toFixed(5)}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* reCAPTCHA — guests only (not candidate, not admin) */}
      {!isCandidate && !isAdmin && siteKey && (
        <div className="flex justify-center overflow-hidden">
          <div className="scale-[0.82] origin-left sm:scale-100 sm:origin-center">
            <ReCAPTCHA ref={recaptchaRef} sitekey={siteKey} />
          </div>
        </div>
      )}

      {error && (
        <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full px-4 py-2.5 text-sm font-semibold bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-60"
      >
        {submitting ? "제출 중..." : `🚀 ${postType === "민원" ? "불편 제보" : "공약 제안"} 제출하기`}
      </button>
    </form>
  );
}
