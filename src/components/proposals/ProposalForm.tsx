"use client";

import { useState, useRef } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import dynamic from "next/dynamic";

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

export default function ProposalForm({ candidateId, city, onSuccess }: Props) {
  const [postType, setPostType] = useState<"민원" | "제안">("제안");
  const [title, setTitle] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [password, setPassword] = useState("");
  const [content, setContent] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [useLocation, setUseLocation] = useState(false);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  const MAX_CONTENT = 500;
  const MAX_TITLE = 50;
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (honeypot) return;

    if (title.trim().length < 2 || title.trim().length > MAX_TITLE) {
      setError(`제목은 2자 이상 ${MAX_TITLE}자 이하로 입력해주세요.`);
      return;
    }
    if (authorName.trim().length < 2 || authorName.trim().length > 20) {
      setError("제안자명은 2자 이상 20자 이하로 입력해주세요.");
      return;
    }
    if (password.length < 4 || password.length > 20) {
      setError("비밀번호는 4자 이상 20자 이하로 입력해주세요.");
      return;
    }
    if (content.trim().length < 10 || content.trim().length > MAX_CONTENT) {
      setError(`내용은 10자 이상 ${MAX_CONTENT}자 이하로 입력해주세요.`);
      return;
    }
    if (useLocation && (latitude == null || longitude == null)) {
      setError("지도에서 위치를 클릭해서 선택해주세요.");
      return;
    }

    const recaptchaToken = recaptchaRef.current?.getValue();
    if (siteKey && !recaptchaToken) {
      setError("보안 문자를 완료해주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        authorName: authorName.trim(),
        password,
        content: content.trim(),
        captchaToken: recaptchaToken ?? "no-captcha",
      };
      body.postType = postType;
      if (candidateId) body.candidateId = candidateId;
      if (city) body.city = city;
      if (useLocation && latitude != null && longitude != null) {
        body.latitude = latitude;
        body.longitude = longitude;
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

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? "제출에 실패했습니다. 다시 시도해주세요.");
        recaptchaRef.current?.reset();
        return;
      }

      setSuccess(true);
      setTitle("");
      setAuthorName("");
      setPassword("");
      setContent("");
      setLatitude(null);
      setLongitude(null);
      setUseLocation(false);
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
      <h2 className="text-sm font-semibold text-foreground">✍️ 민원 / 제안 작성</h2>

      {/* Post type selector */}
      <div className="flex gap-2">
        <button type="button" onClick={() => setPostType("제안")} className={`flex-1 py-2 text-sm font-bold rounded-lg border transition-colors ${postType === "제안" ? "bg-blue-500 text-white border-blue-500" : "bg-background text-muted border-border"}`}>💡 제안</button>
        <button type="button" onClick={() => setPostType("민원")} className={`flex-1 py-2 text-sm font-bold rounded-lg border transition-colors ${postType === "민원" ? "bg-orange-500 text-white border-orange-500" : "bg-background text-muted border-border"}`}>📢 민원</button>
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
          placeholder={`${postType} 제목을 입력해주세요`}
          maxLength={MAX_TITLE}
          required
          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
        />
      </div>

      {/* 제안자명 + Password */}
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
          placeholder={postType === "민원" ? "민원 내용을 구체적으로 작성해주세요." : "공약으로 제안하고 싶은 내용을 구체적으로 작성해주세요."}
          maxLength={MAX_CONTENT}
          rows={4}
          required
          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors resize-none"
        />
      </div>

      {/* Location via Map */}
      <div className="border border-dashed border-border rounded-lg p-3 space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="use-location"
            checked={useLocation}
            onChange={(e) => {
              setUseLocation(e.target.checked);
              if (!e.target.checked) { setLatitude(null); setLongitude(null); }
            }}
            className="w-4 h-4 accent-primary"
          />
          <label htmlFor="use-location" className="text-sm text-foreground cursor-pointer">
            📍 위치 정보 첨부 <span className="text-xs text-muted">(선택, 지도에 표시됩니다)</span>
          </label>
        </div>
        {useLocation && (
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
              <p className="text-xs text-primary text-center font-medium">✅ 위치 선택됨: {latitude.toFixed(5)}, {longitude.toFixed(5)}</p>
            )}
          </div>
        )}
      </div>

      {/* reCAPTCHA — scale down on very small screens to prevent overflow */}
      {siteKey && (
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
        {submitting ? "제출 중..." : `🚀 ${postType} 제출하기`}
      </button>
    </form>
  );
}
