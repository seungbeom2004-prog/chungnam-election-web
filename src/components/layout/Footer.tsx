"use client";

import Image from "next/image";
import { useTheme } from "@/contexts/ThemeContext";

export default function Footer() {
  const { isCute } = useTheme();

  return (
    <footer className="border-t border-border bg-surface py-6">
      <div className="max-w-screen-xl mx-auto px-4 text-center text-sm text-muted">
        <div className="flex items-center justify-center gap-2">
          {isCute && (
            <Image
              src="/themes/cute/images/mascot-small.png"
              width={24}
              height={24}
              alt=""
              className="inline-block"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          )}
          <p>
            <span className="text-muted/60">© 2026. 개혁신당 제9회 전국동시지방선거 천안시의원 천안시다선거구 후보 </span><span className="font-bold text-black">손승범</span><span className="text-muted/60"> 모든 권리 보유</span>
            {isCute && <span className="text-muted/60"> 💕</span>}
          </p>
        </div>
        <p className="mt-3 text-xs text-muted/60 leading-relaxed max-w-2xl mx-auto">
          본 홈페이지는 제9회 전국동시지방선거 개혁신당 천안시의원(천안시다선거구) 손승범 (예비)후보가 기획 및 개설하였으나, 개혁신당 충남 지역 출마 (예비)후보자들이 정책과 공약을 유권자에게 알리기 위해 함께 사용하는 <strong className="font-semibold">&apos;공동 선거운동 공간&apos;</strong>입니다. 본 사이트는 「공직선거법」 제59조 제3호에 따른 적법한 인터넷 홈페이지 이용 선거운동의 일환이며, 같은 법 제88조의 타 후보자를 위한 선거운동 금지 예외 조항(같은 정당 후보자 지원)에 따라 합법적으로 운영됩니다. 또한, 「공직선거법」 제87조 및 제89조에서 엄격히 금지하는 사조직, 정당의 외곽단체 또는 유사기관이 아님을 분명히 밝힙니다.
        </p>
      </div>
    </footer>
  );
}
