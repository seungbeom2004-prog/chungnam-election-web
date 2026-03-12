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
            <span className="text-muted/60">© 2026. 개혁신당 제9회 전국동시지방선거 천안시의원 천안시다선거구 후보 </span><span className="font-bold text-black dark:text-white">손승범</span><span className="text-muted/60"> 모든 권리 보유</span>
            {isCute && <span className="text-muted/60"> 💕</span>}
          </p>
        </div>
      </div>
    </footer>
  );
}
