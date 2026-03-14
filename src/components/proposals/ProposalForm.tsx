"use client";

import { useState, useRef } from "react";
import ReCAPTCHA from "react-google-recaptcha";

interface Props {
  candidateId?: string;
  city?: string;
  onSuccess?: () => void;
}

const LEGAL_NOTICE = `[게시물 작성 시 유의사항 및 법적 책임]
본 홈페이지의 게시판, 댓글 등에 글을 작성할 때는 깨끗하고 공정한 선거문화 정착을 위해 다음 사항을 지켜주시기 바랍니다.

1. 허위사실 유포 금지: 당선되거나 되게 하거나 낙선시킬 목적으로 특정 후보자(가족 포함)에 대한 허위사실을 게재하는 행위는 공직선거법 제250조에 따라 엄격히 금지되며 형사처벌의 대상이 될 수 있습니다.

2. 후보자 비방 금지: 공연히 사실을 적시하여 타 후보자나 그 가족을 비방하거나, 특정 지역 및 성별을 비하·모욕하는 행위는 공직선거법 제251조 및 제110조에 따라 금지됩니다.

3. 본 홈페이지의 관리자는 공직선거법을 위반하는 내용(허위사실, 비방, 불법 선거운동 등)이 포함된 게시물이나 댓글을 발견할 경우, 사전 통보 없이 즉시 삭제할 수 있으며, 해당 게시물로 인해 발생하는 모든 민·형사상 법적 책임은 작성자 본인에게 있습니다.`;

export default function ProposalForm({ candidateId, city, onSuccess }: Props) {
  const [authorName, setAuthorName] = useState("");
  const [content, setContent] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  const MAX_CONTENT = 500;
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "6LeAGYosAAAAAK164nVrXIvD6s5d86YxeJRAC95Z";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (honeypot) return;

    if (authorName.length < 2 || authorName.length > 20) {
      setError("이름은 2자 이상 20자 이하로 입력해주세요.");
      return;
    }
    if (content.length < 10 || content.length > MAX_CONTENT) {
      setError(`내용은 10자 이상 ${MAX_CONTENT}자 이하로 입력해주세요.`);
      return;
    }

    const recaptchaToken = recaptchaRef.current?.getValue();
    if (!recaptchaToken) {
      setError("보안 문자를 완료해주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorName,
          content,
          candidateId,
          city,
          captchaToken: recaptchaToken,
        }),
      });

      if (res.status === 429) {
        setError("잠시 후 다시 시도해주세요.");
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
      setAuthorName("");
      setContent("");
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
        <p className="text-sm font-medium text-foreground mb-1">제안이 접수되었습니다!</p>
        <p className="text-xs text-muted mb-3">소중한 의견 감사합니다.</p>
        <button
          onClick={() => setSuccess(false)}
          className="text-xs text-primary hover:underline"
        >
          추가 제안하기
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="p-5 border border-border rounded-xl bg-surface space-y-3"
    >
      <h3 className="text-sm font-semibold text-foreground">제안 작성</h3>

      {/* Legal notice */}
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 leading-relaxed whitespace-pre-line">
        {LEGAL_NOTICE}
      </div>

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

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">이름</label>
        <input
          type="text"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          placeholder="홍길동"
          minLength={2}
          maxLength={20}
          required
          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-surface text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-sm font-medium text-foreground">내용</label>
          <span className={`text-xs ${content.length > MAX_CONTENT ? "text-red-500" : "text-muted"}`}>
            {content.length} / {MAX_CONTENT}
          </span>
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="후보자에게 제안하고 싶은 내용을 작성해주세요."
          minLength={10}
          maxLength={MAX_CONTENT}
          rows={4}
          required
          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-surface text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors resize-none"
        />
      </div>

      {/* reCAPTCHA */}
      {siteKey && (
        <div className="flex justify-center">
          <ReCAPTCHA ref={recaptchaRef} sitekey={siteKey} />
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-60"
      >
        {submitting ? "제출 중..." : "제안 제출"}
      </button>
    </form>
  );
}
