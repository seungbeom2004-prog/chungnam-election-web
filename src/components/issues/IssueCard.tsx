"use client";

import Link from "next/link";
import Card from "@/components/ui/Card";

interface IssueCardProps {
  issue: {
    id: string;
    title: string;
    summary: string | null;
    category: string | null;
    dong: string | null;
    city: string | null;
    reportCount: number;
    proposalCount?: number;
    status: string;
    adminStatus: string | null;
    createdAt: string;
  };
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  교통: { bg: "bg-blue-100", text: "text-blue-700" },
  안전: { bg: "bg-red-100", text: "text-red-700" },
  교육: { bg: "bg-purple-100", text: "text-purple-700" },
  복지: { bg: "bg-green-100", text: "text-green-700" },
  경제: { bg: "bg-yellow-100", text: "text-yellow-800" },
  환경: { bg: "bg-emerald-100", text: "text-emerald-700" },
  문화: { bg: "bg-pink-100", text: "text-pink-700" },
  기타: { bg: "bg-gray-100", text: "text-gray-600" },
};

const ADMIN_STATUS_LABEL: Record<string, string> = {
  planned: "공약 반영 예정",
  adopted: "공약 반영 완료",
  rejected: "반영 불가",
};

function getRelativeTime(dateString: string): string {
  const now = Date.now();
  const diff = now - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}일 전`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}개월 전`;
  return `${Math.floor(months / 12)}년 전`;
}

export default function IssueCard({ issue }: IssueCardProps) {
  const categoryColor = CATEGORY_COLORS[issue.category ?? "기타"] ?? CATEGORY_COLORS["기타"];
  const isHot = issue.reportCount > 10;
  const location = [issue.city, issue.dong].filter(Boolean).join(" ");
  const proposalCount = issue.proposalCount ?? 0;

  return (
    <Link href={`/issues/${issue.id}`}>
      <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer group h-full flex flex-col">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            {issue.category && (
              <span
                className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full ${categoryColor.bg} ${categoryColor.text}`}
              >
                {issue.category}
              </span>
            )}
            {issue.adminStatus && ADMIN_STATUS_LABEL[issue.adminStatus] && (
              <span
                className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full ${
                  issue.adminStatus === "adopted"
                    ? "bg-green-100 text-green-700"
                    : issue.adminStatus === "planned"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {ADMIN_STATUS_LABEL[issue.adminStatus]}
              </span>
            )}
          </div>
        </div>

        <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1 mb-1 flex-1">
          {issue.title}
        </h3>

        {issue.summary && (
          <p className="text-sm text-muted line-clamp-2 mb-3">{issue.summary}</p>
        )}

        <div className="flex items-center justify-between text-xs text-muted mt-auto pt-2 border-t border-border">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-semibold ${isHot ? "text-orange-500" : "text-muted"}`}>
              {isHot ? "🔥" : "📢"} {issue.reportCount}건 제보
            </span>
            {proposalCount > 0 && (
              <span className="font-semibold text-amber-600">
                💡 {proposalCount}건 제안
              </span>
            )}
            {location && (
              <span className="text-muted hidden sm:inline">📍 {location}</span>
            )}
          </div>
          <span className="shrink-0">{getRelativeTime(issue.createdAt)}</span>
        </div>
      </Card>
    </Link>
  );
}
