"use client";

import { useSession } from "next-auth/react";
import { useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";

export default function QRPage() {
  const { data: session } = useSession();
  const canvasRef = useRef<HTMLDivElement>(null);

  const candidateId = (session?.user as { id?: string })?.id;
  const candidateName = session?.user?.name ?? "출마자";
  const profileUrl =
    typeof window !== "undefined" && candidateId
      ? `${window.location.origin}/candidates/${candidateId}`
      : "";

  const handleDownload = () => {
    const canvas = canvasRef.current?.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `${candidateName}-QR.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  if (!candidateId) {
    return (
      <div className="flex items-center justify-center h-64 text-muted">
        로딩 중...
      </div>
    );
  }

  return (
    <div className="max-w-screen-xl mx-auto">
      <h1 className="text-xl font-bold text-foreground mb-6">QR 코드 생성</h1>

      <div className="max-w-md">
        <div className="bg-surface border border-border rounded-xl p-6 space-y-6">
          {/* Description */}
          <div>
            <p className="text-sm text-muted">
              아래 QR 코드를 스캔하면 내 공약 페이지로 이동합니다.
              홍보물, 명함 등에 활용하세요.
            </p>
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center gap-4">
            <div
              ref={canvasRef}
              className="p-4 bg-white rounded-xl border border-border shadow-sm"
            >
              <QRCodeCanvas
                value={profileUrl}
                size={220}
                level="H"
                includeMargin={false}
              />
            </div>

            <p className="text-xs text-muted text-center break-all px-2">
              {profileUrl}
            </p>
          </div>

          {/* Candidate name label */}
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">{candidateName} 출마자</p>
            <p className="text-xs text-muted mt-0.5">개혁신당 충남도당</p>
          </div>

          {/* Download Button */}
          <button
            onClick={handleDownload}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 10.5L4.5 7M8 10.5L11.5 7M8 10.5V2M3 14h10"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            PNG로 저장
          </button>
        </div>

        {/* Usage tips */}
        <div className="mt-4 p-4 bg-background rounded-xl border border-border">
          <p className="text-xs font-medium text-foreground mb-2">활용 방법</p>
          <ul className="text-xs text-muted space-y-1">
            <li>• 명함이나 전단지에 인쇄하여 배포하세요</li>
            <li>• SNS 게시물에 이미지로 첨부하세요</li>
            <li>• 현수막, 포스터에 활용하세요</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
