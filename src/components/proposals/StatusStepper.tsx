"use client";

type StepKey = "reviewing" | "proposed" | "adopted";

const STEPS: { key: StepKey; label: string; emoji: string }[] = [
  { key: "reviewing", label: "검토중", emoji: "🔍" },
  { key: "proposed", label: "공약 제안", emoji: "📋" },
  { key: "adopted", label: "공약 반영 완료", emoji: "✅" },
];

function adminStatusToStep(adminStatus: string | null | undefined): number {
  switch (adminStatus) {
    case "planned": return 1;
    case "adopted": return 2;
    case "rejected": return -1;
    default: return 0; // null, "reviewed", etc. → 검토중
  }
}

function responseStatusToStep(status: string): number {
  switch (status) {
    case "공약 반영 예정": return 1;
    case "공약 반영 완료": return 2;
    case "반영 불가": return -1;
    default: return 0;
  }
}

interface Props {
  adminStatus?: string | null;
  bestResponseStatus?: string | null;
  className?: string;
}

export default function StatusStepper({ adminStatus, bestResponseStatus, className = "" }: Props) {
  const fromAdmin = adminStatusToStep(adminStatus);
  const fromResponse = bestResponseStatus ? responseStatusToStep(bestResponseStatus) : -2;
  const isRejected = fromAdmin === -1 || fromResponse === -1;
  const currentStep = isRejected ? -1 : Math.max(fromAdmin, fromResponse === -2 ? 0 : fromResponse);

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

  return (
    <div className={className}>
      <div className="flex items-center">
        {STEPS.map((step, idx) => {
          const done = idx < currentStep;
          const active = idx === currentStep;
          return (
            <div key={step.key} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  done ? "bg-green-500 text-white" :
                  active ? "bg-primary text-white ring-2 ring-primary/30 ring-offset-1" :
                  "bg-gray-100 text-gray-400"
                }`}>
                  {done ? "✓" : step.emoji}
                </div>
                <span className={`mt-1 text-[10px] font-semibold leading-tight text-center whitespace-nowrap ${
                  done ? "text-green-600" :
                  active ? "text-primary" :
                  "text-gray-400"
                }`}>
                  {step.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`h-0.5 flex-1 mx-1 mb-4 rounded-full transition-colors ${
                  done ? "bg-green-400" : "bg-gray-200"
                }`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
