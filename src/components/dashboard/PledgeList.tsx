"use client";

import Image from "next/image";
import Card from "@/components/ui/Card";
import { Badge } from "@/components/ui";
import type { Pledge } from "@/types";

interface PledgeListProps {
  pledges: Pledge[];
  onEdit: (pledge: Pledge) => void;
  onDelete: (pledgeId: string) => void;
  onToggleVisibility: (pledge: Pledge) => void;
  onManageCollaboration?: (pledge: Pledge) => void;
}

/** Stacked overlapping avatar bubbles for collaborator display. */
function CollabAvatars({ pledge, onClick }: { pledge: Pledge; onClick?: () => void }) {
  const collabs = pledge.collaborators ?? [];
  if (collabs.length === 0) return null;
  const visible = collabs.slice(0, 3);
  const extra = collabs.length - visible.length;

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
    >
      <div className="flex -space-x-2">
        {visible.map((c) => (
          <div
            key={c.id}
            className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-white border-2 border-surface overflow-hidden"
          >
            {c.candidate?.profileImage ? (
              <Image
                src={c.candidate.profileImage}
                alt={c.candidate.name}
                width={24}
                height={24}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{(c.candidate?.name ?? "?").charAt(0)}</span>
            )}
          </div>
        ))}
        {extra > 0 && (
          <div className="w-6 h-6 rounded-full bg-muted/30 border-2 border-surface flex items-center justify-center text-[9px] font-bold text-muted">
            +{extra}
          </div>
        )}
      </div>
      <span className="text-xs text-muted whitespace-nowrap">
        공동공약: {collabs.length}명
      </span>
      <svg className="w-3 h-3 text-muted" viewBox="0 0 16 16" fill="none">
        <path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

export default function PledgeList({
  pledges,
  onEdit,
  onDelete,
  onToggleVisibility,
  onManageCollaboration,
}: PledgeListProps) {
  if (pledges.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-16 h-16 bg-primary-light rounded-full flex items-center justify-center mb-4">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <path
              d="M14 5.833v16.334M5.833 14h16.334"
              stroke="#FF5A00"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <p className="text-foreground font-medium mb-1">등록된 공약이 없습니다</p>
        <p className="text-sm text-muted">
          오른쪽 지도를 클릭하여 공약을 등록하세요
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {pledges.map((pledge) => (
        <Card key={pledge.id} padding="sm" className="group">
          <div className="flex gap-3">
            {/* Category icon */}
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0"
              style={{
                backgroundColor: pledge.category?.color
                  ? `${pledge.category.color}20`
                  : "#f3f4f6",
              }}
              title={pledge.category?.name}
            >
              {pledge.category?.emoji || "📌"}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-foreground text-sm leading-snug">
                  {pledge.title}
                </h3>
                {!pledge.visible && <Badge variant="muted">숨김</Badge>}
              </div>
              {pledge.category && (
                <span
                  className="inline-block text-xs px-1.5 py-0.5 rounded mt-0.5 font-medium"
                  style={{
                    backgroundColor: `${pledge.category.color}20`,
                    color: pledge.category.color,
                  }}
                >
                  {pledge.category.name}
                </span>
              )}
              <p className="text-xs text-muted line-clamp-2 mt-1 leading-relaxed">
                {pledge.description}
              </p>
            </div>

            {/* Thumbnail image */}
            {pledge.imageUrl && (
              <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0">
                <Image
                  src={pledge.imageUrl}
                  alt={pledge.title}
                  fill
                  className="object-cover"
                />
              </div>
            )}
          </div>

          {/* Actions row */}
          <div className="flex items-center mt-2 pt-2 border-t border-border gap-1">
            {/* Left: action buttons */}
            <div className="flex items-center gap-0.5 flex-1 min-w-0">
              <button
                onClick={() => onEdit(pledge)}
                className="px-2.5 py-1 text-xs font-medium text-muted hover:text-primary hover:bg-primary-light rounded transition-colors"
              >
                수정
              </button>
              <button
                onClick={() => onToggleVisibility(pledge)}
                className="px-2.5 py-1 text-xs font-medium text-muted hover:text-foreground hover:bg-background rounded transition-colors"
              >
                {pledge.visible ? "숨기기" : "공개"}
              </button>
              {onManageCollaboration && (
                <button
                  onClick={() => onManageCollaboration(pledge)}
                  className="px-2.5 py-1 text-xs font-medium text-muted hover:text-primary hover:bg-primary-light rounded transition-colors"
                >
                  공동공약
                </button>
              )}
              <button
                onClick={() => onDelete(pledge.id)}
                className="px-2.5 py-1 text-xs font-medium text-muted hover:text-red-500 hover:bg-red-50 rounded transition-colors"
              >
                삭제
              </button>
            </div>

            {/* Right: stacked collaborator avatars + count */}
            <CollabAvatars
              pledge={pledge}
              onClick={() => onManageCollaboration?.(pledge)}
            />
          </div>
        </Card>
      ))}
    </div>
  );
}
