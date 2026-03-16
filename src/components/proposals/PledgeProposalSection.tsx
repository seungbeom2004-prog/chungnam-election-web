"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";

const PledgeProposalForm = dynamic(() => import("./PledgeProposalForm"), { ssr: false });

interface PledgeProposalItem {
  id: string;
  title: string;
  content: string;
  authorName: string;
  authorType: string; // "visitor" | "candidate"
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

export default function PledgeProposalSection({
  minwonId,
  minwonTitle,
  isCandidate = false,
  candidateName,
}: Props) {
  const [proposals, setProposals] = useState<PledgeProposalItem[]>([]);
  const [loading, setLoading]     = useState(false);
  const [showForm, setShowForm]   = useState(false);
  const [expanded, setExpanded]   = useState(false);

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
          <svg
            aria-hidden="true"
            className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
          >
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
          {/* Proposal form */}
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

          {/* List */}
          {loading ? (
            <div className="flex justify-center py-3">
              <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : proposals.length === 0 ? (
            <p className="text-xs text-muted text-center py-3">
              아직 공약 제안이 없습니다. 첫 번째 제안을 남겨보세요!
            </p>
          ) : (
            <div className="space-y-2">
              {proposals.map((pp) => (
                <div
                  key={pp.id}
                  className={`rounded-lg px-3 py-2.5 border text-xs ${
                    pp.authorType === "candidate"
                      ? "bg-blue-50 border-blue-200"
                      : "bg-white border-purple-100"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    {pp.authorType === "candidate" ? (
                      <span className="font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded-full text-[10px]">
                        🏛️ 후보자
                      </span>
                    ) : (
                      <span className="font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded-full text-[10px]">
                        🙋 방문자
                      </span>
                    )}
                    <span className="font-semibold text-foreground">
                      {pp.authorType === "candidate" && pp.candidate
                        ? `${pp.candidate.name} (${pp.candidate.district})`
                        : pp.authorName}
                    </span>
                    <time className="text-muted ml-auto">{relativeTime(pp.createdAt)}</time>
                    {pp.status === "accepted" && (
                      <span className="text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full border border-green-200">
                        ✅ 채택됨
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-foreground mb-0.5">{pp.title}</p>
                  <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap line-clamp-4">
                    {pp.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
