"use client";

import { useState } from "react";

interface Props {
  candidateId?: string;
  city?: string;
  onSuccess?: () => void;
}

export default function ProposalForm({ candidateId, city, onSuccess }: Props) {
  const [authorName, setAuthorName] = useState("");
  const [content, setContent] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const MAX_CONTENT = 500;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (honeypot) return; // bot trap

    if (authorName.length < 2 || authorName.length > 20) {
      setError("이름은 2자 이상 20자 이하로 입력해주세요.");
      return;
    }
    if (content.length < 10 || content.length > MAX_CONTENT) {
      setError(`내용은 10자 이상 ${MAX_CONTENT}자 이하로 입력해주세요.`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorName, content, candidateId, city }),
      });

      if (res.status === 429) {
        setError("잠시 후 다시 시도해주세요.");
        return;
      }

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? "제출에 실패했습니다. 다시 시도해주세요.");
        return;
      }

      setSuccess(true);
      setAuthorName("");
      setContent("");
      onSuccess?.();
    } catch {
      setError("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
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

      {/* Honeypot — hidden from real users */}
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
        <label className="block text-sm font-medium text-foreground mb-1.5">
          이름
        </label>
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
          <span
            className={`text-xs ${
              content.length > MAX_CONTENT ? "text-red-500" : "text-muted"
            }`}
          >
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

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

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
