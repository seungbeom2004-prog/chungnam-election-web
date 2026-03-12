"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "disclaimer_accepted";

export default function DisclaimerModal() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check if user already accepted
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setShow(true);
      }
    } catch {
      // localStorage not available (SSR, incognito restriction, etc.)
      setShow(true);
    }
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Silently ignore storage errors
    }
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Darkened backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative bg-surface rounded-2xl shadow-2xl border border-border max-w-sm w-full mx-4 p-8 text-center animate-in fade-in zoom-in-95 duration-200">
        {/* Icon */}
        <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-5">
          <span className="text-white font-bold text-xl">개혁</span>
        </div>

        {/* Warning badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full mb-4">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span className="text-xs font-semibold text-amber-700">안내</span>
        </div>

        {/* Message */}
        <h2 className="text-lg font-bold text-foreground mb-2">
          이 사이트는 개혁신당의
          <br />
          공식 사이트가 아닙니다.
        </h2>
        <p className="text-sm text-muted mb-6 leading-relaxed">
          본 홈페이지는 이번 지방선거에 출마하는 개혁신당 충남 지역 (예비)후보자들의 공동 정책 홍보 홈페이지입니다.
        </p>

        {/* Accept button */}
        <button
          onClick={handleAccept}
          className="w-full px-6 py-3 bg-primary text-white font-semibold text-sm rounded-xl hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20"
        >
          이해하고 입장하기
        </button>
      </div>
    </div>
  );
}
