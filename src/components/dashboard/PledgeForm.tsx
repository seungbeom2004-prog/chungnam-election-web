"use client";

import { useState, useRef, useEffect } from "react";
import { Button, Input, Textarea } from "@/components/ui";
import type { Pledge } from "@/types";

interface CategoryOption {
  id: string;
  name: string;
  description: string | null;
  emoji?: string | null;
  color?: string | null;
}

interface PledgeFormProps {
  pledge: Pledge | null;
  draftPin: { lat: number; lng: number; address?: string } | null;
  onSubmit: (data: {
    title: string;
    description: string;
    budget?: string;
    youtubeUrl?: string;
    imageUrl?: string;
    latitude: number;
    longitude: number;
    address?: string;
    categoryId?: string;
  }) => void;
  onClose: () => void;
}

export default function PledgeForm({
  pledge,
  draftPin,
  onSubmit,
  onClose,
}: PledgeFormProps) {
  const [title, setTitle] = useState(pledge?.title || "");
  const [description, setDescription] = useState(pledge?.description || "");
  const [budget, setBudget] = useState(pledge?.budget || "");
  const [youtubeUrl, setYoutubeUrl] = useState(pledge?.youtubeUrl || "");
  const [address, setAddress] = useState(pledge?.address || draftPin?.address || "");
  const [imageUrl, setImageUrl] = useState(pledge?.imageUrl || "");
  const [categoryId, setCategoryId] = useState(pledge?.categoryId || "");
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch categories
  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((json) => setCategories(json.data ?? []))
      .catch(() => {});
  }, []);

  const lat = pledge?.latitude ?? draftPin?.lat ?? 0;
  const lng = pledge?.longitude ?? draftPin?.lng ?? 0;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.url) setImageUrl(data.url);
    } catch {
      alert("이미지 업로드에 실패했습니다.");
    }
    setUploading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await onSubmit({
      title,
      description,
      budget: budget || undefined,
      youtubeUrl: youtubeUrl || undefined,
      imageUrl: imageUrl || undefined,
      latitude: lat,
      longitude: lng,
      address: address || undefined,
      categoryId: categoryId || undefined,
    });
    setSubmitting(false);
  };

  return (
    <div className="absolute top-4 right-4 w-80 bg-surface rounded-xl shadow-xl border border-border z-10 max-h-[calc(100%-2rem)] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="font-semibold text-foreground text-sm">
          {pledge ? "공약 수정" : "새 공약 등록"}
        </h3>
        <button
          onClick={onClose}
          className="w-11 h-11 flex items-center justify-center rounded-lg text-muted hover:text-foreground hover:bg-background transition-colors"
          aria-label="닫기"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path
              d="M13.5 4.5L4.5 13.5M4.5 4.5l9 9"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-4 space-y-3">
        <Input
          label="공약 제목"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예: 보행자 육교 신설"
          required
        />

        <Textarea
          label="상세 설명"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="공약에 대해 자세히 설명해주세요"
          required
        />

        <Input
          label="예산 (선택)"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          placeholder="예: 5억 원"
        />

        <div>
          <Input
            label="미디어 임베드 URL (선택)"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="YouTube, Instagram, Facebook URL"
          />
          <p className="text-xs text-muted mt-1">
            YouTube, Instagram(게시물/릴스), Facebook 링크를 지원합니다.
          </p>
        </div>

        <Input
          label="주소 (선택)"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="예: 천안시 ○○로"
        />

        {/* Category select */}
        {categories.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              카테고리 (선택)
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            >
              <option value="">카테고리 선택</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.emoji ? `${cat.emoji} ` : ""}{cat.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Image upload */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            이미지 (선택)
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full px-3 py-2 text-sm border border-dashed border-border rounded-lg text-muted hover:border-primary hover:text-primary transition-colors"
          >
            {uploading
              ? "업로드 중..."
              : imageUrl
              ? "이미지 변경"
              : "이미지 업로드"}
          </button>
          {imageUrl && (
            <p className="text-xs text-muted mt-1 truncate">{imageUrl}</p>
          )}
        </div>

        {/* Coordinates display */}
        <p className="text-xs text-muted">
          위치: {lat.toFixed(5)}, {lng.toFixed(5)}
        </p>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button type="submit" size="sm" className="flex-1" disabled={submitting}>
            {submitting ? "저장 중..." : pledge ? "수정" : "등록"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            취소
          </Button>
        </div>
      </form>
    </div>
  );
}
