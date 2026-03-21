"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";

const LocationPickerMap = dynamic(
  () => import("@/components/proposals/LocationPickerMap"),
  { ssr: false }
);

interface LinkedPost {
  id: string;
  authorName: string;
  dong: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
}

interface Props {
  parentId: string;
  isChild: boolean;
  originalPostId?: string | null;
}

function relativeTime(date: string) {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return "방금 전";
  if (diff < 3600) return Math.floor(diff / 60) + "분 전";
  if (diff < 86400) return Math.floor(diff / 3600) + "시간 전";
  return Math.floor(diff / 86400) + "일 전";
}

export default function MeTooSection({ parentId, isChild, originalPostId }: Props) {
  const [linkedPosts, setLinkedPosts] = useState<LinkedPost[]>([]);
  const [loadingLinked, setLoadingLinked] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [dong, setDong] = useState<string | null>(null);
  const [authorName, setAuthorName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fetchLinked = () => {
    setLoadingLinked(true);
    fetch(`/api/proposals?parentId=${parentId}&limit=20`)
      .then((r) => r.json())
      .then((json) => setLinkedPosts((json.data ?? []) as LinkedPost[]))
      .catch(() => {})
      .finally(() => setLoadingLinked(false));
  };

  useEffect(() => {
    if (isChild) return;
    fetchLinked();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentId, isChild]);

  const openModal = () => {
    setShowModal(true);
    setError(null);
    setLat(null);
    setLng(null);
    setDong(null);
    setAuthorName("");
  };

  const handleLocationChange = (newLat: number, newLng: number) => {
    setLat(newLat);
    setLng(newLng);
    // Naver reverse geocoding (use naver global if available)
    try {
      if (typeof naver !== "undefined" && naver.maps?.Service && naver.maps?.LatLng) {
        naver.maps.Service.reverseGeocode(
          { coords: new naver.maps.LatLng(newLat, newLng), orders: naver.maps.Service.OrderType.ADDR },
          (status, response) => {
            if (status === naver.maps.Service.Status.OK) {
              const area3 = response.v2?.results?.[0]?.region?.area3?.name;
              const area2 = response.v2?.results?.[0]?.region?.area2?.name;
              setDong(area3 || area2 || null);
            }
          }
        );
      }
    } catch {
      // Naver Maps SDK not ready
    }
  };

  const handleSubmit = async () => {
    if (!lat || !lng) { setError("위치를 지도에서 선택해주세요."); return; }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/proposals/${parentId}/metoo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng, dong, authorName: authorName.trim() || "익명" }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "등록에 실패했습니다."); return; }
      setSuccess(true);
      setShowModal(false);
      fetchLinked();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  if (isChild) {
    return (
      <div className="border-t border-border pt-4">
        <div className="flex items-center gap-2 px-3 py-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs">
          <span className="text-blue-500">🔗</span>
          <span className="text-blue-700">이 제보는 원본 제보와 연결된 항목입니다.</span>
          {originalPostId && (
            <Link href={`/proposals/${originalPostId}`} className="ml-auto font-semibold text-blue-600 hover:underline shrink-0">
              원본 보기 →
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-border pt-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-blue-700 flex items-center gap-1.5">
          📍 같은 문제, 다른 위치
          {loadingLinked ? (
            <span className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin inline-block" />
          ) : linkedPosts.length > 0 ? (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
              {linkedPosts.length}
            </span>
          ) : null}
        </p>
        {!success && (
          <button
            onClick={openModal}
            className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1"
          >
            🙋 나도 있어요!
          </button>
        )}
      </div>

      {success && (
        <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-center">
          ✅ 등록되었습니다! 같은 문제를 함께 해결해 나가요.
        </p>
      )}

      {!loadingLinked && linkedPosts.length > 0 && (
        <div className="space-y-1.5">
          {linkedPosts.map((p) => (
            <Link
              key={p.id}
              href={`/proposals/${p.id}`}
              className="flex items-center gap-3 px-3 py-2 bg-blue-50/70 border border-blue-100 rounded-xl hover:bg-blue-100/60 transition-colors group"
            >
              <span className="text-sm shrink-0">📍</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-blue-800 truncate">
                  {p.dong ?? p.city ?? "위치 정보"}
                </p>
                <p className="text-[11px] text-muted">{p.authorName} · {relativeTime(p.createdAt)}</p>
              </div>
              <span className="text-muted text-xs group-hover:text-foreground shrink-0">→</span>
            </Link>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm space-y-4 p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground">🙋 나도 같은 문제가 있어요!</h2>
              <button onClick={() => setShowModal(false)} className="text-muted text-xl leading-none">×</button>
            </div>
            <p className="text-xs text-muted">
              내 동네의 위치를 지도에서 선택하면, 같은 문제가 발생한 또 다른 장소로 등록됩니다.
            </p>

            <div>
              <label className="block text-xs font-medium text-muted mb-1">내 이름 (선택)</label>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="익명"
                maxLength={30}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted mb-1">
                위치 <span className="text-red-500">*</span> <span className="font-normal">(지도 클릭으로 선택)</span>
              </label>
              <LocationPickerMap lat={lat} lng={lng} onChange={handleLocationChange} />
              {lat && lng && (
                <p className="text-[11px] text-muted mt-1">
                  위도 {lat.toFixed(5)}, 경도 {lng.toFixed(5)}{dong ? ` · ${dong}` : ""}
                </p>
              )}
            </div>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || !lat || !lng}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {submitting ? "등록 중..." : "등록하기"}
              </button>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2.5 text-sm text-muted border border-border rounded-xl hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
