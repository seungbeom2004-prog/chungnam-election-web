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
}

export default function PledgeList({
  pledges,
  onEdit,
  onDelete,
  onToggleVisibility,
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
            {/* Thumbnail */}
            {pledge.imageUrl && (
              <div className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0">
                <Image
                  src={pledge.imageUrl}
                  alt={pledge.title}
                  fill
                  className="object-cover"
                />
              </div>
            )}

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-medium text-foreground text-sm truncate">
                  {pledge.title}
                </h3>
                {!pledge.visible && <Badge variant="muted">숨김</Badge>}
              </div>
              <p className="text-xs text-muted line-clamp-1 mt-0.5">
                {pledge.description}
              </p>
              {pledge.budget && (
                <Badge variant="primary" className="mt-1.5">
                  {pledge.budget}
                </Badge>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border">
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
            <button
              onClick={() => onDelete(pledge.id)}
              className="px-2.5 py-1 text-xs font-medium text-muted hover:text-red-500 hover:bg-red-50 rounded transition-colors"
            >
              삭제
            </button>
          </div>
        </Card>
      ))}
    </div>
  );
}
