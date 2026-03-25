"use client";

import { useEffect, useState } from "react";
import type { ProposalPost } from "@/types";

const TOP_N = 10;

function RankMedal({ rank, idx }: { rank: number; idx: number }) {
  if (rank === 1) return <span aria-label={`${idx + 1}위`} className="text-xl leading-none">🥇</span>;
  if (rank === 2) return <span aria-label={`${idx + 1}위`} className="text-xl leading-none">🥈</span>;
  if (rank === 3) return <span aria-label={`${idx + 1}위`} className="text-xl leading-none">🥉</span>;
  return (
    <span aria-label={`${idx + 1}위`} className="w-6 h-6 rounded-full bg-muted/20 text-muted text-xs font-bold flex items-center justify-center shrink-0">
      {rank}
    </span>
  );
}

interface Props {
  refreshKey?: number;
  postType?: string;
  onSelect?: (id: string) => void;
}

export default function ProposalRanking({ refreshKey, postType, onSelect }: Props) {
  const [proposals, setProposals] = useState<ProposalPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"daily" | "weekly">("daily");

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("sort", "popular");
    params.set("limit", String(TOP_N));
    params.set("offset", "0");
    if (postType) params.set("postType", postType);
    // Period filter
    const since = new Date();
    if (period === "daily") {
      since.setHours(0, 0, 0, 0);
    } else {
      // Weekly: last 7 days
      since.setDate(since.getDate() - 7);
      since.setHours(0, 0, 0, 0);
    }
    params.set("since", since.toISOString());
    fetch(`/api/proposals?${params.toString()}`)
      .then((r) => r.json())
      .then((json) => {
        setProposals((json.data ?? []).slice(0, TOP_N));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [refreshKey, postType, period]);

  const maxLikes = proposals[0]?.likeCount ?? 1;

  return (
    <div className="border border-border rounded-xl bg-surface overflow-hidden">
      {/* Header */}
      <div className={`px-4 py-3 border-b border-border ${postType === "민원" ? "bg-gradient-to-r from-red-50 to-rose-50" : "bg-gradient-to-r from-yellow-50 to-amber-50"}`}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-foreground">
            {postType === "민원" ? "📢 불편 제보 랭킹" : "🔥 공약 제안 랭킹"}
          </h2>
          <div className="flex items-center bg-white/50 rounded-full p-0.5 gap-0.5">
            <button
              onClick={() => setPeriod("daily")}
              className={`px-2 py-0.5 text-[10px] font-semibold rounded-full transition-colors ${period === "daily" ? "bg-white shadow-sm text-foreground" : "text-muted hover:text-foreground"}`}
            >일간</button>
            <button
              onClick={() => setPeriod("weekly")}
              className={`px-2 py-0.5 text-[10px] font-semibold rounded-full transition-colors ${period === "weekly" ? "bg-white shadow-sm text-foreground" : "text-muted hover:text-foreground"}`}
            >주간</button>
          </div>
        </div>
        <p className="text-[11px] text-muted mt-0.5">{period === "daily" ? "오늘" : "이번 주"} 좋아요를 많이 받은 {postType === "민원" ? "불편 제보가" : "공약 제안이"} 채택 될 수 있습니다</p>
      </div>

      <div className="p-3 space-y-2">
        {loading ? (
          <div className="flex justify-center py-6">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : proposals.length === 0 ? (
          <p className="text-xs text-muted text-center py-6">아직 {postType === "민원" ? "불편 제보가" : "공약 제안이"} 없습니다.</p>
        ) : (
          proposals.map((p, idx) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect?.(p.id)}
              className={`w-full text-left flex items-start gap-2.5 p-2.5 rounded-lg cursor-pointer hover:bg-primary/10 transition-colors ${idx < 3 ? "bg-primary/5 border border-primary/20" : ""}`}
            >
              <div className="pt-0.5 shrink-0">
                <RankMedal rank={idx + 1} idx={idx} />
              </div>
              <div className="flex-1 min-w-0">
                {p.title && (
                  <p className="text-xs font-semibold text-foreground truncate leading-snug">
                    {p.title}
                  </p>
                )}
                <p className="text-[11px] text-muted truncate mt-0.5">{p.content}</p>
                {/* Like bar */}
                <div className="flex items-center gap-1.5 mt-1.5">
                  <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${postType === "민원" ? "bg-red-500" : "bg-yellow-400"}`}
                      style={{ width: `${Math.max(4, ((p.likeCount ?? 0) / Math.max(maxLikes, 1)) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-primary font-semibold shrink-0">
                    ❤️ {p.likeCount ?? 0}
                  </span>
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      {/* CTA */}
      <div className="px-4 pb-3">
        <p className="text-[11px] text-muted text-center">
          마음에 드는 게시물에 좋아요를 눌러주세요!
        </p>
        {proposals.length > 0 && (
          <p className="text-[11px] text-muted text-center">상위 {proposals.length}개 게시물</p>
        )}
      </div>
    </div>
  );
}
