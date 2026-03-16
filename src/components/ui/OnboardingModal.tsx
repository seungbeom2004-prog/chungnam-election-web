"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

const ONBOARDING_KEY = "onboarding-done-v2";

const STEPS: { icon: string; title: string; description: string; disclaimer?: string }[] = [
  {
    icon: "🔍",
    title: "공약을 투명하게 확인하세요",
    description: "후보자가 우리 동네에 무슨 공약을 내걸었는지 지도 위에서 직접 확인하고 비교할 수 있습니다. 지역을 바꾸면 다른 선거구 공약도 볼 수 있어요.",
    disclaimer: "이 플랫폼은 개혁신당 충남도당 공식 사이트가 아닌, 유권자 투명성을 위한 독립 운영 서비스입니다.",
  },
  {
    icon: "📍",
    title: "공약 핀을 클릭하세요",
    description: "지도에서 공약 핀을 클릭하면 상세 내용, 예산, 관련 SNS, 댓글을 확인할 수 있습니다.",
  },
  {
    icon: "✍️",
    title: "의견을 남기고 공약을 제안하세요",
    description: "민원이나 지역 문제를 제출하면 후보자가 공약에 반영할 수 있습니다. 좋아요와 댓글로 지지하는 공약을 알려주세요!",
  },
];

interface OnboardingModalProps {
  /** Override visibility for testing */
  forceShow?: boolean;
}

export default function OnboardingModal({ forceShow }: OnboardingModalProps) {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    // Never show on the cute theme route
    if (pathname === "/cute") return;
    if (forceShow) {
      setVisible(true);
      return;
    }
    try {
      if (!localStorage.getItem(ONBOARDING_KEY)) {
        setVisible(true);
      }
    } catch {
      // private browsing
    }
  }, [forceShow, pathname]);

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(ONBOARDING_KEY, "1");
    } catch {
      // ignore
    }
  };

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      dismiss();
    }
  };

  if (!visible) return null;

  const current = STEPS[step];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9990] bg-black/60 backdrop-blur-sm"
        onClick={dismiss}
        aria-hidden="true"
      />
      {/* Modal */}
      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[9995] w-full max-w-sm mx-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
      >
        <div className="bg-surface rounded-2xl shadow-2xl p-6 border border-border">
          {/* Step indicator */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i === step ? "bg-primary" : "bg-border"
                  }`}
                />
              ))}
            </div>
            <button
              onClick={dismiss}
              className="text-muted hover:text-foreground transition-colors text-lg leading-none"
              aria-label="건너뛰기"
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div className="text-center mb-6">
            <div className="text-5xl mb-4">{current?.icon}</div>
            <h2 id="onboarding-title" className="text-lg font-bold text-foreground mb-2">
              {current?.title}
            </h2>
            <p className="text-sm text-muted leading-relaxed">
              {current?.description}
            </p>
            {current?.disclaimer && (
              <p className="mt-3 text-[11px] text-gray-400 leading-relaxed">
                * {current.disclaimer}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={dismiss}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-muted border border-border rounded-xl hover:bg-background transition-colors"
            >
              건너뛰기
            </button>
            <button
              onClick={next}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-primary rounded-xl hover:bg-primary/90 transition-colors"
            >
              {step < STEPS.length - 1 ? "다음" : "시작하기 →"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
