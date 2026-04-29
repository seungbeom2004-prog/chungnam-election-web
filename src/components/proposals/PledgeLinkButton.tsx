"use client";

import { useEffect, useState } from "react";

interface Pledge {
  id: string;
  title: string;
  description?: string;
  candidateId: string;
}

interface Props {
  proposalId: string;
  candidateId: string;
  onLinked: (pledgeId: string | null) => void;
}

/**
 * 후보자가 자신의 정식 공약 중 하나를 이 게시글(불편 제보/공약 제안)과 연결하는 버튼.
 * 클릭 시 모달이 열려 검색 가능한 자기 공약 목록을 보여줌.
 * 선택 시 /api/proposals/[id]/link-pledge 호출 → adminStatus = 'adopted' + 자동 답변 추가.
 */
export default function PledgeLinkButton({ proposalId, candidateId, onLinked }: Props) {
  const [open, setOpen] = useState(false);
  const [pledges, setPledges] = useState<Pledge[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/pledges?candidateId=${candidateId}&limit=100`)
      .then(r => r.json())
      .then(json => setPledges(json.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, candidateId]);

  const handleLink = async (pledgeId: string) => {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/proposals/${proposalId}/link-pledge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pledgeId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "연결에 실패했습니다");
        return;
      }
      onLinked(pledgeId);
      setOpen(false);
    } catch {
      setError("네트워크 오류");
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = search
    ? pledges.filter(p => p.title.toLowerCase().includes(search.toLowerCase()))
    : pledges;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-full transition-colors"
      >
        🔗 정식 공약과 연결하기
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setOpen(false)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="font-bold text-foreground">정식 공약과 연결</h2>
              <button onClick={() => setOpen(false)} className="text-muted text-xl leading-none">×</button>
            </div>
            <div className="p-5 space-y-3 flex-1 overflow-y-auto">
              <p className="text-xs text-muted">
                이 게시글을 본인 공약 1개에 연결합니다. 연결 시 게시글의 처리 단계가 자동으로 <strong className="text-emerald-700">공약 반영</strong>으로 바뀝니다.
              </p>
              <input
                type="text"
                placeholder="공약 제목 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg"
                autoFocus
              />
              {error && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
              {loading ? (
                <p className="text-xs text-muted text-center py-6">불러오는 중...</p>
              ) : filtered.length === 0 ? (
                <p className="text-xs text-muted text-center py-6">
                  {pledges.length === 0 ? "등록된 공약이 없습니다. 먼저 공약을 등록하세요." : "검색 결과가 없습니다."}
                </p>
              ) : (
                <div className="space-y-1 max-h-72 overflow-y-auto">
                  {filtered.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleLink(p.id)}
                      disabled={submitting}
                      className="w-full text-left px-3 py-2.5 rounded-xl border border-border hover:border-emerald-400 hover:bg-emerald-50 transition-colors disabled:opacity-50"
                    >
                      <p className="text-sm font-semibold text-foreground line-clamp-1">{p.title}</p>
                      {p.description && <p className="text-xs text-muted mt-0.5 line-clamp-2">{p.description}</p>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="px-5 py-3 border-t">
              <button
                onClick={() => setOpen(false)}
                className="w-full px-4 py-2 text-sm border border-border rounded-lg text-muted hover:text-foreground"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
