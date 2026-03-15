"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui";
import type { Pledge, PledgeCollaboration } from "@/types";

interface CollaborationModalProps {
  pledge: Pledge;
  currentCandidateId: string;
  onClose: () => void;
}

interface PublicCandidate {
  id: string;
  name: string;
  district: string;
}

export default function CollaborationModal({
  pledge,
  currentCandidateId,
  onClose,
}: CollaborationModalProps) {
  const [collaborators, setCollaborators] = useState<PledgeCollaboration[]>([]);
  const [allCandidates, setAllCandidates] = useState<PublicCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchCollaborators = useCallback(async () => {
    try {
      const res = await fetch(`/api/pledges/${pledge.id}/collaborators`);
      const json = await res.json();
      setCollaborators(json.data ?? []);
    } catch {
      console.error("Failed to fetch collaborators");
    }
  }, [pledge.id]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [collabRes, candidatesRes] = await Promise.all([
          fetch(`/api/pledges/${pledge.id}/collaborators`),
          fetch("/api/candidates?limit=100"),
        ]);
        const collabJson = await collabRes.json();
        const candidatesJson = await candidatesRes.json();
        setCollaborators(collabJson.data ?? []);
        setAllCandidates(
          (candidatesJson.data ?? []).filter(
            (c: PublicCandidate) => c.id !== pledge.candidateId && c.id !== currentCandidateId
          )
        );
      } catch {
        console.error("Failed to fetch data");
      }
      setLoading(false);
    };
    fetchData();
  }, [pledge.id, pledge.candidateId, currentCandidateId]);

  const handleAddCollaborator = async (candidateId: string) => {
    setActionLoading(`add-${candidateId}`);
    try {
      const res = await fetch(`/api/pledges/${pledge.id}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        alert(json.error ?? "추가에 실패했습니다.");
      } else {
        await fetchCollaborators();
      }
    } catch {
      alert("추가에 실패했습니다.");
    }
    setActionLoading(null);
  };

  const handleRemoveCollaborator = async (candidateId: string) => {
    setActionLoading(candidateId);
    try {
      // Use admin-level endpoint: remove specific collaborator (candidateId param)
      await fetch(`/api/pledges/${pledge.id}/collaborators?candidateId=${candidateId}`, {
        method: "DELETE",
      });
      await fetchCollaborators();
    } catch {
      alert("삭제에 실패했습니다.");
    }
    setActionLoading(null);
  };

  const collaboratorIds = new Set(collaborators.map((c) => c.candidateId));

  const filteredCandidates = allCandidates.filter(
    (c) =>
      !collaboratorIds.has(c.id) &&
      (c.name.includes(searchQuery) || c.district.includes(searchQuery))
  );

  // Note: Only pledge owner can add collaborators via the invite link
  // When another candidate visits their own dashboard, they can JOIN pledges
  const isOwner = pledge.candidateId === currentCandidateId;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="font-semibold text-foreground">공동공약 관리</h2>
            <p className="text-xs text-muted mt-0.5 truncate max-w-xs">{pledge.title}</p>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {/* Original author badge */}
          <div className="flex items-center gap-2 p-3 bg-primary-light rounded-lg">
            <span className="text-xs font-semibold text-primary px-2 py-0.5 bg-primary/10 rounded-full">
              공약 작성자
            </span>
            <span className="text-sm font-medium text-foreground">
              {pledge.candidate?.name || "작성자"}
            </span>
            {pledge.candidate?.district && (
              <span className="text-xs text-muted">({pledge.candidate.district})</span>
            )}
          </div>

          {/* Current collaborators */}
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">
                  공동공약 참여자 ({collaborators.length}명)
                </h3>
                {collaborators.length === 0 ? (
                  <p className="text-sm text-muted py-2">아직 공동공약 참여자가 없습니다.</p>
                ) : (
                  <div className="space-y-2">
                    {collaborators.map((collab) => (
                      <div
                        key={collab.id}
                        className="flex items-center justify-between py-2 px-3 bg-background rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">
                            {collab.candidate?.name || "후보자"}
                          </span>
                          {collab.candidate?.district && (
                            <span className="text-xs text-muted">
                              ({collab.candidate.district})
                            </span>
                          )}
                        </div>
                        {isOwner && (
                          <button
                            onClick={() => handleRemoveCollaborator(collab.candidateId)}
                            disabled={actionLoading === collab.candidateId}
                            className="text-xs text-muted hover:text-red-500 transition-colors"
                          >
                            제거
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add collaborator (owner only) */}
              {isOwner && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">
                    공동공약 참여자 추가
                  </h3>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="이름 또는 지역으로 검색"
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors mb-2"
                  />
                  {filteredCandidates.length === 0 ? (
                    <p className="text-xs text-muted py-2">
                      {searchQuery ? "검색 결과가 없습니다." : "추가 가능한 후보자가 없습니다."}
                    </p>
                  ) : (
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {filteredCandidates.map((candidate) => (
                        <div
                          key={candidate.id}
                          className="flex items-center justify-between py-2 px-3 hover:bg-background rounded-lg transition-colors"
                        >
                          <div>
                            <span className="text-sm font-medium text-foreground">
                              {candidate.name}
                            </span>
                            <span className="text-xs text-muted ml-1.5">
                              ({candidate.district})
                            </span>
                          </div>
                          <button
                            onClick={() => handleAddCollaborator(candidate.id)}
                            disabled={actionLoading === `add-${candidate.id}`}
                            className="text-xs font-medium text-primary hover:text-primary/80 disabled:opacity-50 transition-colors px-2 py-1 rounded hover:bg-primary/10"
                          >
                            {actionLoading === `add-${candidate.id}` ? "추가 중..." : "추가"}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Share link for non-owners to join */}
              {!isOwner && (
                <div className="text-sm text-muted bg-background rounded-lg p-3">
                  이 공약의 공동공약 참여는 공약 목록에서 직접 신청할 수 있습니다.
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border">
          <Button variant="ghost" onClick={onClose} className="w-full">
            닫기
          </Button>
        </div>
      </div>
    </div>
  );
}
