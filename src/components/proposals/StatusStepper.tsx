"use client";

// ── Minwon stepper: 검토중 → 민원 해결 ───────────────────────────────────────
const MINWON_STEPS: { key: string; label: string; emoji: string }[] = [
  { key: "reviewing",          label: "검토중",    emoji: "🔍" },
  { key: "complaint_resolved", label: "민원 해결", emoji: "🏛️" },
];

// ── Proposal stepper: 검토중 → 공약 제안 → 공약 반영 완료 ───────────────────
const PROPOSAL_STEPS: { key: string; label: string; emoji: string }[] = [
  { key: "reviewing", label: "검토중",        emoji: "🔍" },
  { key: "planned",   label: "공약 제안",     emoji: "📋" },
  { key: "adopted",   label: "공약 반영",     emoji: "✅" },
];

function adminStatusToStep(adminStatus: string | null | undefined, steps: typeof MINWON_STEPS): number {
  if (!adminStatus) return 0;
  const idx = steps.findIndex(s => s.key === adminStatus);
  if (idx !== -1) return idx;
  // legacy mapping
  if (adminStatus === "planned") return steps.length > 1 ? 1 : 0;
  if (adminStatus === "adopted") return steps.length - 1;
  return 0;
}

function responseStatusToStep(status: string, steps: typeof PROPOSAL_STEPS): number {
  switch (status) {
    case "공약 반영 예정": return Math.min(1, steps.length - 1);
    case "공약 반영 완료": return steps.length - 1;
    case "민원 해결":      return steps.length - 1;
    case "반영 불가":      return -1;
    default:              return 0;
  }
}

interface Props {
  adminStatus?: string | null;
  bestResponseStatus?: string | null;
  postType?: string | null;
  className?: string;
}

function Stepper({
  steps,
  currentStep,
}: {
  steps: { key: string; label: string; emoji: string }[];
  currentStep: number;
}) {
  return (
    <div className="flex items-center">
      {steps.map((step, idx) => {
        const done   = idx < currentStep;
        const active = idx === currentStep;
        return (
          <div key={step.key} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                done   ? "bg-green-500 text-white" :
                active ? "bg-primary text-white ring-2 ring-primary/30 ring-offset-1" :
                         "bg-gray-100 text-gray-400"
              }`}>
                {done ? "✓" : step.emoji}
              </div>
              <span className={`mt-1 text-[10px] font-semibold leading-tight text-center whitespace-nowrap ${
                done   ? "text-green-600" :
                active ? "text-primary" :
                         "text-gray-400"
              }`}>
                {step.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div className={`h-0.5 flex-1 mx-1 mb-4 rounded-full transition-colors ${
                done ? "bg-green-400" : "bg-gray-200"
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function StatusStepper({ adminStatus, bestResponseStatus, postType, className = "" }: Props) {
  const isMinwon = postType === "민원";

  // Rejected: always shown as a flat badge regardless of type
  const isRejected =
    adminStatus === "rejected" ||
    bestResponseStatus === "반영 불가";

  if (isRejected) {
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

  if (isMinwon) {
    // Minwon path: 검토중 → 민원 해결
    const step = adminStatusToStep(adminStatus, MINWON_STEPS);
    // If candidate responds "민원 해결", treat as terminal
    const respStep = bestResponseStatus === "민원 해결" ? MINWON_STEPS.length - 1 : 0;
    const currentStep = Math.max(step, respStep);
    return (
      <div className={className}>
        <Stepper steps={MINWON_STEPS} currentStep={currentStep} />
      </div>
    );
  }

  // Proposal path: 검토중 → 공약 제안 → 공약 반영 완료
  const fromAdmin    = adminStatusToStep(adminStatus, PROPOSAL_STEPS);
  const fromResponse = bestResponseStatus ? responseStatusToStep(bestResponseStatus, PROPOSAL_STEPS) : 0;
  const currentStep  = Math.max(fromAdmin, fromResponse);

  return (
    <div className={className}>
      <Stepper steps={PROPOSAL_STEPS} currentStep={currentStep} />
    </div>
  );
}
