"use client";

import { useRef, useState } from "react";
import ReCAPTCHA from "react-google-recaptcha";

interface Props {
  minwonId: string;
  minwonTitle: string;
  isCandidate: boolean;
  candidateName?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const LEGAL_NOTICE = `[유의사항] 허위사실 유포 및 후보자 비방은 공직선거법에 따라 금지됩니다. 법적 책임은 작성자 본인에게 있습니다.`;

export default function PledgeProposalForm({
  minwonId,
  minwonTitle,
  isCandidate,
  candidateName,
  onSuccess,
  onCancel,
}: Props) {
  const [title, setTitle]           = useState("");
  const [content, setContent]       = useState("");
  const [authorName, setAuthorName] = useState(candidateName ?? "");
  const [honeypot, setHoneypot]     = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  const MAX_TITLE   = 80;
  const MAX_CONTENT = 1000;
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (honeypot) return;

    if (title.trim().length < 2)  { setError("제목은 2자 이상 입력해주세요."); return; }
    if (title.trim().length > MAX_TITLE) { setError(`제목은 ${MAX_TITLE}자 이하로 입력해주세요.`); return; }
    if (content.trim().length < 10) { setError("내용은 10자 이상 입력해주세요."); return; }
    if (content.trim().length > MAX_CONTENT) { setError(`내용은 ${MAX_CONTENT}자 이하로 입력해주세요.`); return; }
    if (!isCandidate && authorName.trim().length < 2) {
      setError("이름은 2자 이상 입력해주세요."); return;
    }

    let captchaToken: string | null = null;
    if (!isCandidate) {
      captchaToken = await recaptchaRef.current?.executeAsync() ?? null;
      recaptchaRef.current?.reset();
      if (!captchaToken) { setError("보안 문자 인증에 실패했습니다. 다시 시도해주세요."); return; }
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/pledge-proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title:        title.trim(),
          content:      content.trim(),
          authorName:   isCandidate ? candidateName : authorName.trim(),
          minwonIds:    [minwonId],
          captchaToken: captchaToken ?? undefined,
          honeypot,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.message ?? "공약 제안 등록에 실패했습니다.");
        return;
      }
      onSuccess();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 bg-purple-50 border border-purple-200 rounded-xl p-4 mt-2">
      {/* Hidden honeypot */}
      <input
        type="text"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        tabIndex={-1}
        aria-hidden="true"
        className="absolute opacity-0 pointer-events-none h-0 w-0"
        autoComplete="off"
      />

      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">📝 공약 제안 작성</span>
        <span className="text-xs text-purple-600 truncate">민원: {minwonTitle}</span>
      </div>

      {/* Author name (visitor only) */}
      {!isCandidate && (
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">이름 <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            maxLength={30}
            required
            placeholder="작성자 이름"
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-purple-400"
          />
        </div>
      )}

      {/* Title */}
      <div>
        <label className="block text-xs font-medium text-foreground mb-1">
          제목 <span className="text-red-500">*</span>
          <span className="ml-1 text-muted font-normal">({title.length}/{MAX_TITLE})</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={MAX_TITLE}
          required
          placeholder="공약 제안 제목을 입력하세요"
          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-purple-400"
        />
      </div>

      {/* Content */}
      <div>
        <label className="block text-xs font-medium text-foreground mb-1">
          내용 <span className="text-red-500">*</span>
          <span className="ml-1 text-muted font-normal">({content.length}/{MAX_CONTENT})</span>
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={MAX_CONTENT}
          required
          rows={4}
          placeholder="민원에 대해 어떤 공약이 필요한지 구체적으로 제안해주세요..."
          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-purple-400 resize-none"
        />
      </div>

      {/* Legal notice */}
      <details className="text-[10px] text-muted">
        <summary className="cursor-pointer hover:text-foreground">⚖️ 법적 유의사항 보기</summary>
        <p className="mt-1 leading-relaxed whitespace-pre-line">{LEGAL_NOTICE}</p>
      </details>

      {/* CAPTCHA (visitors only) */}
      {!isCandidate && siteKey && (
        <ReCAPTCHA ref={recaptchaRef} size="invisible" sitekey={siteKey} />
      )}

      {error && (
        <p role="alert" className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-muted border border-border rounded-lg hover:bg-background transition-colors"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 text-sm font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-60 flex items-center gap-2"
        >
          {submitting && (
            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          {submitting ? "등록 중..." : "공약 제안 등록"}
        </button>
      </div>
    </form>
  );
}
