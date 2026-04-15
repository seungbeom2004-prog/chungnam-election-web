"use client";

// ── Track step definitions ────────────────────────────────────────────────────
const TRACK_MINWON = [
  { key: "reviewing",          label: "검토중",    emoji: "🔍" },
  { key: "complaint_resolved", label: "민원 해결", emoji: "🏛️" },
] as const;

const TRACK_PLEDGE = [
  { key: "reviewing", label: "검토중",   emoji: "🔍" },
  { key: "planned",   label: "공약 제안", emoji: "📋" },
  { key: "adopted",   label: "공약 반영", emoji: "✅" },
] as const;

// ── Map adminStatus / responseStatus → step index per track ──────────────────
function minwonStep(adminStatus?: string | null, responseStatus?: string | null): number {
  if (adminStatus === "complaint_resolved") return 1;
  if (responseStatus === "민원 해결") return 1;
  return 0;
}

function pledgeStep(adminStatus?: string | null, responseStatus?: string | null): number {
  if (adminStatus === "adopted" || responseStatus === "공약 반영 완료") return 2;
  if (adminStatus === "planned" || responseStatus === "공약 반영 예정") return 1;
  return 0;
}

// ── Single linear track ───────────────────────────────────────────────────────
type Step = { key: string; label: string; emoji: string };

function LinearTrack({
  steps,
  currentStep,
  accentDone,
  accentActive,
  accentLine,
}: {
  steps: readonly Step[];
  currentStep: number;
  accentDone: string;    // Tailwind bg class for done circle
  accentActive: string;  // Tailwind bg class for active circle
  accentLine: string;    // Tailwind bg class for done line
}) {
  return (
    <div className="flex items-center">
      {steps.map((step, idx) => {
        const done   = idx < currentStep;
        const active = idx === currentStep;
        return (
          <div key={step.key} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                done   ? `${accentDone} text-white` :
                active ? `${accentActive} text-white ring-2 ring-offset-1 ring-current/30` :
                         "bg-gray-100 text-gray-400"
              }`}>
                {done ? "✓" : step.emoji}
              </div>
              <span className={`mt-1 text-[10px] font-semibold leading-tight text-center whitespace-nowrap ${
                done   ? "text-green-600" :
                active ? "text-foreground" :
                         "text-gray-400"
              }`}>
                {step.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div className={`h-0.5 flex-1 mx-1 mb-4 rounded-full transition-colors ${
                done ? accentLine : "bg-gray-200"
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  adminStatus?: string | null;
  bestResponseStatus?: string | null;
  postType?: string | null;
  className?: string;
}

export default function StatusStepper({ adminStatus, bestResponseStatus, postType, className = "" }: Props) {
  // ── Rejected badge (both types) ───────────────────────────────────────────
  if (adminStatus === "rejected" || bestResponseStatus === "반영 불가") {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl ${className}`}>
        <span className="text-base">🚫</span>
        <div>
          <p className="text-xs font-bold text-gray-600">반영 불가</p>
          <p className="text-[11px] text-muted">이 제보/제안은 현재 반영이 어렵습니다.</p>
        </div>
      </div>
    );
  }

  // ── 공약 제안 (단일 트랙) ────────────────────────────────────────────────
  if (postType !== "민원") {
    const step = pledgeStep(adminStatus, bestResponseStatus);
    return (
      <div className={className}>
        <LinearTrack
          steps={TRACK_PLEDGE}
          currentStep={step}
          accentDone="bg-green-500"
          accentActive="bg-primary"
          accentLine="bg-green-400"
        />
      </div>
    );
  }

  // ── 불편 제보 (투 트랙) ───────────────────────────────────────────────────
  const track1Step = minwonStep(adminStatus, bestResponseStatus);
  const track2Step = pledgeStep(adminStatus, bestResponseStatus);

  const track1Done = track1Step >= TRACK_MINWON.length - 1;
  const track2Done = track2Step >= TRACK_PLEDGE.length - 1;

  return (
    <div className={`rounded-xl border border-border overflow-hidden ${className}`}>
      {/* 헤더 */}
      <div className="px-3 py-2 bg-gray-50 border-b border-border">
        <p className="text-[11px] font-bold text-muted tracking-wide">처리 경로</p>
      </div>

      {/* 트랙 1 — 민원 직접 해결 */}
      <div className={`px-3 py-3 border-b border-border ${track1Done ? "bg-purple-50/60" : ""}`}>
        <div className="flex items-center gap-1.5 mb-2.5">
          <span className="text-xs">🏛️</span>
          <p className="text-[11px] font-bold text-purple-700">민원 직접 해결</p>
          <span className="text-[10px] text-muted">· 시청·구청 공식 민원</span>
          {track1Done && (
            <span className="ml-auto text-[10px] font-bold text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded-full">완료</span>
          )}
        </div>
        <LinearTrack
          steps={TRACK_MINWON}
          currentStep={track1Step}
          accentDone="bg-purple-500"
          accentActive="bg-purple-500"
          accentLine="bg-purple-400"
        />
      </div>

      {/* 트랙 2 — 공약으로 해결 */}
      <div className={`px-3 py-3 ${track2Done ? "bg-green-50/60" : ""}`}>
        <div className="flex items-center gap-1.5 mb-2.5">
          <span className="text-xs">📋</span>
          <p className="text-[11px] font-bold text-primary">공약으로 해결</p>
          <span className="text-[10px] text-muted">· 선거 공약 반영</span>
          {track2Done && (
            <span className="ml-auto text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">완료</span>
          )}
        </div>
        <LinearTrack
          steps={TRACK_PLEDGE}
          currentStep={track2Step}
          accentDone="bg-green-500"
          accentActive="bg-primary"
          accentLine="bg-green-400"
        />
      </div>
    </div>
  );
}
