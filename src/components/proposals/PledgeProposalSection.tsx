"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ReCAPTCHA from "react-google-recaptcha";

// ─── 수정 제안 폼 ─────────────────────────────────────────────────────────────
function RevisionForm({
  pledgeProposalId,
  isCandidate,
  candidateName,
  originalTitle,
  originalContent,
  onSuccess,
  onCancel,
}: {
  pledgeProposalId: string;
  isCandidate: boolean;
  candidateName?: string;
  originalTitle: string;
  originalContent: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle]               = useState(originalTitle);
  const [content, setContent]           = useState(originalContent);
  const [authorName, setAuthorName]     = useState(candidateName ?? "");
  const [commitMessage, setCommitMessage] = useState("");
  const [honeypot, setHoneypot]         = useState("");
  const [submitting, setSubmitting]     = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (honeypot) return;
    if (title.trim().length < 2) { setError("제목은 2자 이상 입력해주세요."); return; }
    if (content.trim().length < 10) { setError("내용은 10자 이상 입력해주세요."); return; }
    if (!isCandidate && authorName.trim().length < 2) { setError("이름은 2자 이상 입력해주세요."); return; }

    let captchaToken: string | null = null;
    if (!isCandidate && siteKey) {
      captchaToken = await recaptchaRef.current?.executeAsync() ?? null;
      recaptchaRef.current?.reset();
      // captchaToken이 null이어도 서버에서 검증하지 않으므로 계속 진행
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/pledge-proposals/${pledgeProposalId}/revisions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          authorName: isCandidate ? (candidateName ?? "후보자") : authorName.trim(),
          commitMessage: commitMessage.trim() || undefined,
          captchaToken: captchaToken ?? undefined,
          honeypot,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? json.message ?? "수정 제안 등록에 실패했습니다."); return; }
      onSuccess();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 bg-violet-50 border border-violet-200 rounded-xl p-4 mt-2">
      <input type="text" value={honeypot} onChange={(e) => setHoneypot(e.target.value)}
        tabIndex={-1} aria-hidden="true" className="absolute opacity-0 pointer-events-none h-0 w-0" autoComplete="off" />

      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-bold text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full">✏️ 수정 제안</span>
      </div>

      {!isCandidate && (
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">이름 <span className="text-red-500">*</span></label>
          <input type="text" value={authorName} onChange={(e) => setAuthorName(e.target.value)}
            maxLength={30} required placeholder="작성자 이름"
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-violet-400" />
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-foreground mb-1">제목 <span className="text-red-500">*</span></label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
          maxLength={80} required
          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-violet-400" />
      </div>

      <div>
        <label className="block text-xs font-medium text-foreground mb-1">내용 <span className="text-red-500">*</span></label>
        <textarea value={content} onChange={(e) => setContent(e.target.value)}
          maxLength={1000} required rows={4}
          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-violet-400 resize-none" />
      </div>

      <div>
        <label className="block text-xs font-medium text-foreground mb-1">수정 이유 (선택)</label>
        <input type="text" value={commitMessage} onChange={(e) => setCommitMessage(e.target.value)}
          maxLength={200} placeholder="어떤 점을 수정했는지 간략히 설명해주세요"
          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-violet-400" />
      </div>

      {!isCandidate && siteKey && (
        <ReCAPTCHA ref={recaptchaRef} size="invisible" sitekey={siteKey} />
      )}

      {error && (
        <p role="alert" className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel}
          className="px-4 py-2 text-sm text-muted border border-border rounded-lg hover:bg-background transition-colors">
          취소
        </button>
        <button type="submit" disabled={submitting}
          className="px-4 py-2 text-sm font-semibold text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-60 flex items-center gap-2">
          {submitting && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          {submitting ? "등록 중..." : "수정 제안 등록"}
        </button>
      </div>
    </form>
  );
}

interface PledgeProposalItem {
  id: string;
  title: string;
  content: string;
  authorName: string;
  authorType: string;
  candidateId: string | null;
  status: string;
  createdAt: string;
  candidate?: { id: string; name: string; district: string } | null;
  minwonLinks?: { minwonId: string }[];
}

interface Props {
  minwonId: string;
  minwonTitle: string;
  isCandidate?: boolean;
  candidateName?: string;
}

const relativeTime = (date: string) => {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return "방금 전";
  if (diff < 3600) return Math.floor(diff / 60) + "분 전";
  if (diff < 86400) return Math.floor(diff / 3600) + "시간 전";
  return Math.floor(diff / 86400) + "일 전";
};

// ─── 인라인 공약 제안 폼 ──────────────────────────────────────────────────────
function PledgeProposalForm({
  minwonId,
  minwonTitle,
  isCandidate,
  candidateName,
  onSuccess,
  onCancel,
}: {
  minwonId: string;
  minwonTitle: string;
  isCandidate: boolean;
  candidateName?: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle]           = useState("");
  const [content, setContent]       = useState("");
  const [authorName, setAuthorName] = useState(candidateName ?? "");
  const [honeypot, setHoneypot]     = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  const MAX_TITLE   = 80;
  const MAX_CONTENT = 1000;
  const siteKey     = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (honeypot) return;
    if (title.trim().length < 2)          { setError("제목은 2자 이상 입력해주세요."); return; }
    if (title.trim().length > MAX_TITLE)  { setError(`제목은 ${MAX_TITLE}자 이하로 입력해주세요.`); return; }
    if (content.trim().length < 10)       { setError("내용은 10자 이상 입력해주세요."); return; }
    if (content.trim().length > MAX_CONTENT) { setError(`내용은 ${MAX_CONTENT}자 이하로 입력해주세요.`); return; }
    if (!isCandidate && authorName.trim().length < 2) { setError("이름은 2자 이상 입력해주세요."); return; }

    let captchaToken: string | null = null;
    if (!isCandidate) {
      if (siteKey) {
        captchaToken = await recaptchaRef.current?.executeAsync() ?? null;
        recaptchaRef.current?.reset();
        if (!captchaToken) { setError("보안 문자 인증에 실패했습니다. 다시 시도해주세요."); return; }
      }
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
      if (!res.ok) { setError(json.message ?? "공약 제안 등록에 실패했습니다."); return; }
      onSuccess();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 bg-purple-50 border border-purple-200 rounded-xl p-4 mt-2">
      {/* Honeypot */}
      <input type="text" value={honeypot} onChange={(e) => setHoneypot(e.target.value)}
        tabIndex={-1} aria-hidden="true" className="absolute opacity-0 pointer-events-none h-0 w-0" autoComplete="off" />

      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">📝 공약 제안 작성</span>
        <span className="text-xs text-purple-600 truncate">불편 제보: {minwonTitle}</span>
      </div>

      {!isCandidate && (
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">이름 <span className="text-red-500">*</span></label>
          <input type="text" value={authorName} onChange={(e) => setAuthorName(e.target.value)}
            maxLength={30} required placeholder="작성자 이름"
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-purple-400" />
        </div>
      )}

      {isCandidate && candidateName && (
        <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
          🏛️ <strong>{candidateName}</strong> 후보자로 제안합니다
        </p>
      )}

      <div>
        <label className="block text-xs font-medium text-foreground mb-1">
          제목 <span className="text-red-500">*</span>
          <span className="ml-1 text-muted font-normal">({title.length}/{MAX_TITLE})</span>
        </label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
          maxLength={MAX_TITLE} required placeholder="공약 제안 제목을 입력하세요"
          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-purple-400" />
      </div>

      <div>
        <label className="block text-xs font-medium text-foreground mb-1">
          내용 <span className="text-red-500">*</span>
          <span className="ml-1 text-muted font-normal">({content.length}/{MAX_CONTENT})</span>
        </label>
        <textarea value={content} onChange={(e) => setContent(e.target.value)}
          maxLength={MAX_CONTENT} required rows={4}
          placeholder="불편 제보에 대해 어떤 공약이 필요한지 구체적으로 제안해주세요..."
          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-purple-400 resize-none" />
      </div>

      {!isCandidate && siteKey && (
        <ReCAPTCHA ref={recaptchaRef} size="invisible" sitekey={siteKey} />
      )}

      {error && (
        <p role="alert" className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel}
          className="px-4 py-2 text-sm text-muted border border-border rounded-lg hover:bg-background transition-colors">
          취소
        </button>
        <button type="submit" disabled={submitting}
          className="px-4 py-2 text-sm font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-60 flex items-center gap-2">
          {submitting && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          {submitting ? "등록 중..." : "공약 제안 등록"}
        </button>
      </div>
    </form>
  );
}

// ─── 메인 섹션 컴포넌트 ───────────────────────────────────────────────────────
export default function PledgeProposalSection({
  minwonId,
  minwonTitle,
  isCandidate = false,
  candidateName,
}: Props) {
  const [proposals, setProposals]       = useState<PledgeProposalItem[]>([]);
  const [loading, setLoading]           = useState(false);
  const [showForm, setShowForm]         = useState(false);
  const [expanded, setExpanded]         = useState(false);
  const [revisionTargetId, setRevisionTargetId] = useState<string | null>(null);

  const fetchProposals = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/pledge-proposals?minwonId=${minwonId}&limit=20`);
      const json = await res.json();
      setProposals(json.data ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [minwonId]);

  useEffect(() => {
    if (expanded) fetchProposals();
  }, [expanded, fetchProposals]);

  const handleSuccess = () => {
    setShowForm(false);
    fetchProposals();
  };

  return (
    <div className="mt-3 border-t border-purple-100 pt-3">
      {/* Toggle row */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1.5 text-xs font-medium text-purple-700 hover:text-purple-900 transition-colors"
        >
          <span className="text-base leading-none">💡</span>
          공약 제안
          {!loading && proposals.length > 0 && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
              {proposals.length}
            </span>
          )}
          <svg aria-hidden="true"
            className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <button
          onClick={() => { setExpanded(true); setShowForm((v) => !v); }}
          className="text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded-full transition-colors"
        >
          {showForm ? "✕ 취소" : "✍️ 제안하기"}
        </button>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="mt-2 space-y-2">
          {showForm && (
            <PledgeProposalForm
              minwonId={minwonId}
              minwonTitle={minwonTitle}
              isCandidate={isCandidate}
              candidateName={candidateName}
              onSuccess={handleSuccess}
              onCancel={() => setShowForm(false)}
            />
          )}

          {loading ? (
            <div className="flex justify-center py-3">
              <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : proposals.length === 0 && !showForm ? (
            <p className="text-xs text-muted text-center py-3">
              아직 공약 제안이 없습니다. 첫 번째 제안을 남겨보세요!
            </p>
          ) : (
            <div className="space-y-2">
              {proposals.map((pp) => (
                <div key={pp.id}
                  className={`rounded-lg px-3 py-2.5 border text-xs ${
                    pp.authorType === "candidate"
                      ? "bg-blue-50 border-blue-200"
                      : "bg-white border-purple-100"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    {pp.authorType === "candidate" ? (
                      <span className="font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded-full text-[10px]">🏛️ 후보자의 공약 제안</span>
                    ) : (
                      <span className="font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded-full text-[10px]">🙋 방문자</span>
                    )}
                    <span className="font-semibold text-foreground">
                      {pp.authorType === "candidate" && pp.candidate
                        ? `${pp.candidate.name} (${pp.candidate.district})`
                        : pp.authorName}
                    </span>
                    <time className="text-muted ml-auto">{relativeTime(pp.createdAt)}</time>
                    {pp.status === "accepted" && (
                      <span className="text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full border border-green-200">✅ 채택됨</span>
                    )}
                  </div>
                  <p className="font-semibold text-foreground mb-0.5">{pp.title}</p>
                  <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap line-clamp-4">{pp.content}</p>
                  {/* 수정 제안하기 버튼 */}
                  <button
                    onClick={() => setRevisionTargetId(pp.id === revisionTargetId ? null : pp.id)}
                    className="text-[10px] font-medium text-muted hover:text-purple-700 mt-1.5 flex items-center gap-1 transition-colors"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    수정 제안하기
                  </button>
                  {revisionTargetId === pp.id && (
                    <RevisionForm
                      pledgeProposalId={pp.id}
                      isCandidate={isCandidate}
                      candidateName={candidateName}
                      originalTitle={pp.title}
                      originalContent={pp.content}
                      onSuccess={() => { setRevisionTargetId(null); fetchProposals(); }}
                      onCancel={() => setRevisionTargetId(null)}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
