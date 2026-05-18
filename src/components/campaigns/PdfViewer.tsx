"use client";

import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// PDF.js worker — public/에서 self-host (사이트 CSP가 외부 CDN script 차단함)
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

interface Props {
  /** PDF 정적 파일 경로 (예: /campaigns/foo.pdf) */
  file: string;
  /** 다운로드 시 노출될 파일명 */
  downloadName?: string;
}

/**
 * react-pdf 기반 PDF 뷰어 — PDF.js로 직접 렌더하므로 PDF 플러그인 없이도
 * 모든 모던 브라우저(모바일 Chrome/Safari 포함)에서 동일하게 보임.
 *
 * - 모든 페이지를 세로로 나열
 * - 컨테이너 너비에 맞춰 자동 스케일
 * - 워커 로딩 실패/네트워크 차단 시 다운로드 fallback 표시
 */
export default function PdfViewer({ file, downloadName }: Props) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [width, setWidth] = useState<number>(800);
  const [error, setError] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Track container width for responsive page rendering
  useEffect(() => {
    if (!wrapRef.current) return;
    const measure = () => {
      const w = wrapRef.current?.clientWidth ?? 800;
      setWidth(Math.min(w, 900));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  if (error) {
    return (
      <div className="p-8 text-center bg-gray-50 border-t border-border">
        <p className="text-sm text-muted mb-3">
          PDF 뷰어를 불러올 수 없습니다. 아래 버튼으로 다운로드해 보세요.
        </p>
        <a
          href={file}
          download={downloadName}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
        >
          ⬇️ PDF 다운로드
        </a>
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="bg-gray-100 p-4 md:p-6">
      <Document
        file={file}
        onLoadSuccess={(d) => setNumPages(d.numPages)}
        onLoadError={(e) => setError(String(e))}
        loading={
          <div className="py-16 text-center text-sm text-muted">PDF 불러오는 중…</div>
        }
        className="flex flex-col items-center gap-4"
      >
        {numPages != null &&
          Array.from({ length: numPages }, (_, i) => (
            <div
              key={i}
              className="shadow-md rounded-md overflow-hidden bg-white max-w-full"
            >
              <Page
                pageNumber={i + 1}
                width={width}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                loading={
                  <div className="py-12 text-xs text-muted text-center">페이지 {i + 1} 불러오는 중…</div>
                }
              />
            </div>
          ))}
      </Document>
      {numPages != null && (
        <p className="text-center text-[11px] text-muted mt-3">
          총 {numPages}페이지 · 원본 PDF는 상단 버튼으로 다운로드 가능합니다.
        </p>
      )}
    </div>
  );
}
