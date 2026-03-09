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
            &copy; 2026. 손승범 모든 권리 보유
            {isCute && " 💕"}
          </p>
        </div>
      </div>
    </footer>
  );
}
