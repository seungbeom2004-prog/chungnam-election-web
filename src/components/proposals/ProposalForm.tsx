"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import ReCAPTCHA from "react-google-recaptcha";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { CHUNGNAM_DISTRICTS } from "@/lib/districts";
import { trackProposalSubmit } from "@/lib/analytics";
import IssueSimilarSuggestion from "@/components/issues/IssueSimilarSuggestion";

const LocationPickerMap = dynamic(() => import("./LocationPickerMap"), { ssr: false });

interface AiSuggestion {
  issueId: string;
  title: string;
  confidence: number;
}

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
  const [cityCenter, setCityCenter] = useState<{ lat: number; lng: number } | null>(() => {
    const d = CHUNGNAM_DISTRICTS.find((d) => d.name === (propCity ?? ""));
    return d ? { lat: d.centerLat, lng: d.centerLng } : null;
  });
  const [title, setTitle] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [password, setPassword] = useState("");
  const [content, setContent] = useState("");
  const [honeypot, setHoneypot] = useState("");
  // skipLocation: false = 지도에서 위치 선택 (기본), true = 위치 지정 안 함
  const [skipLocation, setSkipLocation] = useState(false);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [relatedPostInput, setRelatedPostInput] = useState("");
  const [issueId, setIssueId] = useState<string | null>(null);
  const [issueName, setIssueName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Confirmation modal before submit
  const [showLocationConfirm, setShowLocationConfirm] = useState(false);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  // AI
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestion[]>([]);
  const [aiSuggestLoading, setAiSuggestLoading] = useState(false);

  // Similar posts
  const [similarPosts, setSimilarPosts] = useState<{ id: string; title: string; content: string }[]>([]);
  const [showNoSimilar, setShowNoSimilar] = useState(false);

  const searchParams = useSearchParams();

  const MAX_CONTENT = 500;
  const MAX_TITLE = 50;
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "";

  // Read issueId from URL params on mount
  useEffect(() => {
    const urlIssueId = searchParams.get("issueId");
    if (urlIssueId) {
      setIssueId(urlIssueId);
      fetch(`/api/issues/${urlIssueId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((json) => {
          const title = json?.data?.title ?? json?.title;
          if (title) setIssueName(title);
        })
        .catch(() => {});
    }
  }, [searchParams]);

  // Set default authorName for admin
  useEffect(() => {
    if (isAdmin && !authorName) {
      setAuthorName("익명");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const handleCityChange = (cityName: string) => {
    setSelectedCity(cityName);
    const district = CHUNGNAM_DISTRICTS.find((d) => d.name === cityName);
    if (district) {
      setCityCenter({ lat: district.centerLat, lng: district.centerLng });
    } else {
      setCityCenter(null);
    }
    // Reset picked coords when city changes
    setLatitude(null);
    setLongitude(null);
  };

  // Validate form fields; sets error and returns false on failure
  const validate = (): boolean => {
    setError(null);

    if (honeypot) return false;

    if (!selectedCity) {
      setError("지역을 선택해주세요.");
      return false;
    }

    if (title.trim().length < 2 || title.trim().length > MAX_TITLE) {
      setError(`제목은 2자 이상 ${MAX_TITLE}자 이하로 입력해주세요.`);
      return false;
    }

    // Guest-only validation
    if (!isCandidate && !isAdmin) {
      if (authorName.trim().length < 2 || authorName.trim().length > 20) {
        setError("작성자명은 2자 이상 20자 이하로 입력해주세요.");
        return false;
      }
      if (password.length < 4 || password.length > 20) {
        setError("비밀번호는 4자 이상 20자 이하로 입력해주세요.");
        return false;
      }
      const RESERVED_NAMES = ["관리자", "admin", "administrator", "운영자", "개혁신당", "후보자", "candidate"];
      const lowerName = authorName.trim().toLowerCase();
      if (RESERVED_NAMES.some((n) => lowerName.includes(n.toLowerCase()))) {
        setError("사용할 수 없는 이름입니다.");
        return false;
      }
    }

    if (content.trim().length < 10 || content.trim().length > MAX_CONTENT) {
      setError(`내용은 10자 이상 ${MAX_CONTENT}자 이하로 입력해주세요.`);
      return false;
    }

    // reCAPTCHA for guests only
    if (!isCandidate && !isAdmin) {
      const recaptchaToken = recaptchaRef.current?.getValue();
      if (siteKey && !recaptchaToken) {
        setError("보안 문자를 완료해주세요.");
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    // If location is selected, show "이곳이 맞나요?" confirmation first
    if (!skipLocation && latitude != null && longitude != null) {
      setShowLocationConfirm(true);
      return;
    }

    await doSubmit();
  };

  const doSubmit = async () => {
    setShowLocationConfirm(false);
    setSubmitting(true);
    try {
      const cityData = CHUNGNAM_DISTRICTS.find((d) => d.name === selectedCity);
      // If skipLocation, fall back to city center; otherwise use map pin position
      const resolvedLat = skipLocation
        ? (cityData?.centerLat ?? null)
        : (latitude ?? cityData?.centerLat ?? null);
      const resolvedLng = skipLocation
        ? (cityData?.centerLng ?? null)
        : (longitude ?? cityData?.centerLng ?? null);

      const body: Record<string, unknown> = {
        title: title.trim(),
        content: content.trim(),
        postType,
        city: selectedCity,
      };

      if (resolvedLat != null) body.latitude = resolvedLat;
      if (resolvedLng != null) body.longitude = resolvedLng;
      if (candidateId) body.candidateId = candidateId;
      if (issueId) body.issueId = issueId;

      if (relatedPostInput.trim()) {
        const trimmed = relatedPostInput.trim();
        const urlMatch = trimmed.match(/\/proposals\/([^/?#]+)/);
        body.parentId = urlMatch ? urlMatch[1] : trimmed;
      }

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
      setSkipLocation(false);
      setRelatedPostInput("");
      setIssueId(null);
      setIssueName(null);
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
    <>
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

        {/* ===== LOCATION SECTION (map first) ===== */}
        <div className="border border-border rounded-lg overflow-hidden">
          {/* Header: city selector + skip option */}
          <div className="px-3 py-2.5 bg-surface border-b border-border space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm font-medium text-foreground shrink-0">
                📍 지역 선택<span aria-hidden="true"> *</span>
              </label>
              <select
                value={selectedCity}
                onChange={(e) => handleCityChange(e.target.value)}
                required
                className="flex-1 px-2.5 py-1.5 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              >
                <option value="">-- 지역 선택 --</option>
                {CHUNGNAM_DISTRICTS.map((d) => (
                  <option key={d.name} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>
            {/* Skip location toggle */}
            <label className="flex items-center gap-2 cursor-pointer group w-fit">
              <input
                type="checkbox"
                checked={skipLocation}
                onChange={(e) => {
                  setSkipLocation(e.target.checked);
                  if (e.target.checked) {
                    setLatitude(null);
                    setLongitude(null);
                  }
                }}
                className="w-3.5 h-3.5 accent-muted"
              />
              <span className="text-xs text-muted group-hover:text-foreground transition-colors">
                위치를 지정하지 않겠습니다
              </span>
            </label>
          </div>

          {/* Map — shown by default, hidden only when skipLocation is true */}
          {!skipLocation ? (
            <div className="p-0">
              <LocationPickerMap
                lat={latitude}
                lng={longitude}
                onChange={(lat, lng) => { setLatitude(lat); setLongitude(lng); }}
                cityCenter={cityCenter}
                height={250}
              />
              {latitude != null && longitude != null && (
                <p className="text-[11px] text-primary text-center py-1.5 bg-primary/5 border-t border-primary/10 font-medium">
                  ✅ 위치 선택됨: {latitude.toFixed(5)}, {longitude.toFixed(5)}
                </p>
              )}
            </div>
          ) : (
            <div className="px-3 py-4 text-center">
              <p className="text-xs text-muted">
                {selectedCity
                  ? `${selectedCity} 전체 지역으로 등록됩니다.`
                  : "지역 전체로 등록됩니다."}
              </p>
            </div>
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

        {/* Issue suggestion / badge */}
        {!issueId && title.length > 3 && (
          <IssueSimilarSuggestion
            query={title}
            onSelectIssue={(id: string, name: string) => {
              setIssueId(id);
              setIssueName(name);
            }}
          />
        )}
        {issueId && issueName && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg">
            <span className="text-xs text-indigo-700 font-medium truncate">
              🏷️ 이슈: {issueName}
            </span>
            <button
              type="button"
              onClick={() => { setIssueId(null); setIssueName(null); }}
              className="ml-auto text-indigo-400 hover:text-indigo-700 text-sm leading-none"
              aria-label="이슈 연결 해제"
            >
              ✕
            </button>
          </div>
        )}

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

        {/* AI Issue Suggest */}
        {!issueId && content.length > 20 && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={async () => {
                setAiSuggestLoading(true);
                setAiSuggestions([]);
                try {
                  const res = await fetch("/api/ai/suggest-issue", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ content: `${title}\n${content}`, city: selectedCity || undefined }),
                  });
                  if (res.ok) {
                    const json = await res.json();
                    setAiSuggestions(json.suggestions ?? []);
                  }
                } catch { /* silent */ }
                finally { setAiSuggestLoading(false); }
              }}
              disabled={aiSuggestLoading}
              className="px-3 py-1.5 text-xs bg-purple-50 text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-50"
            >
              {aiSuggestLoading ? "AI 분석 중..." : "🤖 AI 이슈 추천"}
            </button>
            {aiSuggestions.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {aiSuggestions.map((s) => (
                  <button
                    key={s.issueId}
                    type="button"
                    onClick={() => { setIssueId(s.issueId); setIssueName(s.title); setAiSuggestions([]); }}
                    className="px-2 py-1 text-[11px] bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full hover:bg-indigo-100 transition-colors"
                  >
                    {s.title} ({s.confidence}%)
                  </button>
                ))}
              </div>
            )}
            {aiSuggestions.length === 0 && !aiSuggestLoading && content.length > 20 && (
              <span className="text-[10px] text-muted">내용을 바탕으로 관련 이슈를 AI가 추천합니다</span>
            )}
          </div>
        )}

        {/* Similar posts */}
        {content.length > 20 && !relatedPostInput && (
          <div className="border border-dashed border-blue-200 bg-blue-50/30 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-blue-700">💡 비슷한 기존 게시물이 있나요?</p>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const res = await fetch(`/api/proposals?limit=5&search=${encodeURIComponent(title || content.slice(0, 30))}`);
                    if (res.ok) {
                      const json = await res.json();
                      const results = (json.data ?? []) as { id: string; title: string; content: string }[];
                      if (results.length > 0) {
                        setSimilarPosts(results);
                      } else {
                        setSimilarPosts([]);
                        setShowNoSimilar(true);
                        setTimeout(() => setShowNoSimilar(false), 3000);
                      }
                    }
                  } catch { /* silent */ }
                }}
                className="px-2 py-1 text-[10px] bg-blue-100 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-200 transition-colors"
              >
                🔍 비슷한 글 찾기
              </button>
            </div>
            {showNoSimilar && (
              <p className="text-[10px] text-blue-500">비슷한 게시물을 찾지 못했습니다.</p>
            )}
            {similarPosts.length > 0 && (
              <div className="space-y-1.5">
                {similarPosts.map((sp) => (
                  <button
                    key={sp.id}
                    type="button"
                    onClick={() => { setRelatedPostInput(sp.id); setSimilarPosts([]); }}
                    className="w-full text-left px-3 py-2 bg-white rounded-lg border border-blue-100 hover:border-blue-300 transition-colors"
                  >
                    <p className="text-xs font-medium text-foreground line-clamp-1">{sp.title}</p>
                    <p className="text-[10px] text-muted line-clamp-1">{sp.content.slice(0, 80)}</p>
                  </button>
                ))}
              </div>
            )}
            <p className="text-[10px] text-muted">
              같은 내용의 글이 이미 있다면 연결하면 관리자가 이슈로 묶기 쉬워져요.
            </p>
          </div>
        )}
        {relatedPostInput && (
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
            <span className="text-xs text-blue-700 font-medium">🔗 관련 게시물 연결됨</span>
            <button
              type="button"
              onClick={() => setRelatedPostInput("")}
              className="ml-auto text-blue-400 hover:text-blue-700 text-sm leading-none"
            >
              ✕
            </button>
          </div>
        )}

        {/* reCAPTCHA — guests only */}
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

      {/* ===== 위치 확인 모달 ===== */}
      {showLocationConfirm && latitude != null && longitude != null && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setShowLocationConfirm(false); }}
        >
          <div className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl">
            {/* Modal header */}
            <div className="px-5 pt-5 pb-3 border-b border-gray-100">
              <p className="text-base font-bold text-gray-900 text-center">📍 이곳이 맞나요?</p>
              <p className="text-xs text-gray-500 text-center mt-1">
                제보 위치를 한 번 더 확인해주세요
              </p>
            </div>

            {/* Read-only confirmation map */}
            <div className="p-3">
              <LocationPickerMap
                lat={latitude}
                lng={longitude}
                readOnly
                height={220}
              />
              <p className="text-[11px] text-gray-400 text-center mt-1.5">
                {selectedCity} · {latitude.toFixed(5)}, {longitude.toFixed(5)}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 px-4 pb-5">
              <button
                type="button"
                onClick={() => setShowLocationConfirm(false)}
                className="flex-1 py-2.5 text-sm font-medium border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors"
              >
                다시 선택할게요
              </button>
              <button
                type="button"
                onClick={doSubmit}
                disabled={submitting}
                className="flex-1 py-2.5 text-sm font-bold bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors disabled:opacity-60"
              >
                {submitting ? "제출 중..." : "네, 이곳입니다!"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
