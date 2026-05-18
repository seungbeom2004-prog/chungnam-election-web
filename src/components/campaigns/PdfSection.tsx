"use client";

import dynamic from "next/dynamic";

// react-pdf는 worker가 브라우저에서만 동작하므로 SSR 비활성화 필요
const PdfViewer = dynamic(() => import("./PdfViewer"), {
  ssr: false,
  loading: () => (
    <div className="py-16 text-center text-sm text-muted">PDF 뷰어 준비 중…</div>
  ),
});

export default function PdfSection({
  file,
  downloadName,
}: {
  file: string;
  downloadName?: string;
}) {
  return <PdfViewer file={file} downloadName={downloadName} />;
}
