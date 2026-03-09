"use client";

// Categories shown in the filter bar.
// 'id' is matched against pledge.category?.name for filtering.
// 'all' is a special value that shows every marker.
export const CATEGORY_LIST = [
  { id: "all",  label: "전체" },
  { id: "교통", label: "교통" },
  { id: "안전", label: "안전" },
  { id: "교육", label: "교육" },
  { id: "복지", label: "복지" },
  { id: "경제", label: "경제" },
] as const;

export type CategoryId = (typeof CATEGORY_LIST)[number]["id"];

interface Props {
  selected: string;
  onChange: (id: string) => void;
  isCute?: boolean;
}

export default function CategoryFilter({ selected, onChange, isCute }: Props) {
  const primaryColor = isCute ? "#FF6B9D" : "#FF5A00";
  const glowColor    = isCute ? "rgba(255,107,157,0.35)" : "rgba(255,90,0,0.3)";
  const cuteFont     = isCute
    ? "'Bingre','Pretendard Variable',sans-serif"
    : undefined;

  return (
    /* Overlay row — left-anchored, right edge clears the desktop sidebar toggle */
    <div
      role="toolbar"
      aria-label="카테고리 필터"
      className="absolute top-3 left-3 z-20 flex gap-1.5 overflow-x-auto right-4 md:right-28"
      style={{
        scrollbarWidth: "none",
        // Ensure touch-friendly inertia scroll on iOS
        WebkitOverflowScrolling: "touch",
      } as React.CSSProperties}
    >
      {CATEGORY_LIST.map(({ id, label }) => {
        const active = selected === id;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            aria-pressed={active}
            style={{
              flexShrink: 0,
              padding: "5px 14px",
              borderRadius: 999,
              fontSize: 12,
              lineHeight: 1.4,
              fontWeight: active ? 700 : 500,
              fontFamily: cuteFont,
              border: `1.5px solid ${active ? primaryColor : "rgba(0,0,0,0.1)"}`,
              background: active ? primaryColor : "rgba(255,255,255,0.92)",
              color: active ? "#fff" : "#444",
              cursor: "pointer",
              boxShadow: active
                ? `0 2px 8px ${glowColor}, 0 1px 4px rgba(0,0,0,0.08)`
                : "0 1px 4px rgba(0,0,0,0.08)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              transition: "all 0.15s ease",
              outline: "none",
              whiteSpace: "nowrap",
            } as React.CSSProperties}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
