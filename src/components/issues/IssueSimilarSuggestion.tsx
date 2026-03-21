"use client";

import { useState, useEffect, useRef } from "react";
import Card from "@/components/ui/Card";

interface SuggestedIssue {
  id: string;
  title: string;
  summary: string | null;
  category: string | null;
  reportCount: number;
}

interface Props {
  query: string;
  onSelectIssue: (issueId: string, issueTitle: string) => void;
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

export default function IssueSimilarSuggestion({ query, onSelectIssue }: Props) {
  const [results, setResults] = useState<SuggestedIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    if (!query || query.trim().length <= 5) {
      setResults([]);
      setSearched(false);
      return;
    }

    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/issues/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const json = await res.json();
          setResults(json.data ?? []);
        } else {
          setResults([]);
        }
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
        setSearched(true);
      }
    }, 500);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [query]);

  if (!query || query.trim().length <= 5) {
    return null;
  }

  if (loading) {
    return (
      <div className="mt-2 px-1">
        <p className="text-xs text-muted">유사한 이슈를 검색 중...</p>
      </div>
    );
  }

  if (searched && results.length === 0) {
    return (
      <div className="mt-2 px-1">
        <p className="text-xs text-muted">해당하는 이슈가 없습니다</p>
      </div>
    );
  }

  if (results.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 space-y-2">
      <p className="text-xs font-semibold text-muted px-1">
        유사한 이슈가 있습니다. 선택하면 해당 이슈에 제보가 연결됩니다.
      </p>
      {results.map((issue) => {
        const cat = CATEGORY_COLORS[issue.category ?? "기타"] ?? CATEGORY_COLORS["기타"];
        return (
          <Card
            key={issue.id}
            padding="sm"
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onSelectIssue(issue.id, issue.title)}
          >
            <div className="flex items-center gap-2 mb-1">
              {issue.category && (
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${cat.bg} ${cat.text}`}>
                  {issue.category}
                </span>
              )}
              <span className="text-[10px] text-muted font-medium">
                {issue.reportCount}명 제보
              </span>
            </div>
            <p className="text-sm font-semibold text-foreground leading-snug">{issue.title}</p>
          </Card>
        );
      })}
    </div>
  );
}
