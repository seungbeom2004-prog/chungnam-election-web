-- ════════════════════════════════════════════════════════════════════════════
-- Migration 005: Unify hidden state, QR tracking, and pledge linking
--
-- Run this in the Supabase SQL editor (one block at a time is fine).
-- Idempotent — safe to re-run.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1. 현황판 제외 + 숨김 통합 ──────────────────────────────────────────────
-- "hide_stats" adminStatus는 이제 사용하지 않음.
-- 통합된 의미: status='hidden' = 게시판에서 안 보이지만 통계/현황판 숫자에는 카운트됨.
-- 기존 hide_stats 게시물은 그대로 표시되도록 NULL로 정리 (별도 숨김 처리 안 함).
UPDATE "ProposalPost"
   SET "adminStatus" = NULL
 WHERE "adminStatus" = 'hide_stats';

-- ─── 2. ProposalResponse: 다단계 답변 보존 ─────────────────────────────────
-- 기존: (proposalId, candidateId) 단일 unique → 새 단계로 update 시 이전 단계 사라짐
-- 신규: (proposalId, candidateId, status) 복합 unique → 후보자 1명이 단계별로 여러 답변 가능

-- 기존 unique 제약 제거 (이름이 자동 생성되었을 가능성 → 가능한 모든 이름 시도)
DO $$
BEGIN
  -- Prisma가 만들었을 만한 이름 시도
  EXECUTE 'ALTER TABLE "ProposalResponse" DROP CONSTRAINT IF EXISTS "ProposalResponse_proposalId_candidateId_key"';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  EXECUTE 'DROP INDEX IF EXISTS "ProposalResponse_proposalId_candidateId_key"';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 새 복합 unique index — 같은 (proposal, 후보자, status) 쌍은 1개만
CREATE UNIQUE INDEX IF NOT EXISTS "ProposalResponse_proposalId_candidateId_status_key"
  ON "ProposalResponse" ("proposalId", "candidateId", "status");

-- ─── 3. QR 추적 시스템 ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "QrCode" (
  id          TEXT PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE,        -- short URL slug (e.g. "ABC123")
  name        TEXT NOT NULL,                -- label (e.g. "현수막", "전단지")
  "targetPath" TEXT NOT NULL,               -- internal path (e.g. "/candidates/abc")
  "ownerType" TEXT NOT NULL DEFAULT 'admin',-- "admin" | "candidate"
  "ownerId"   TEXT,                         -- candidate id, null for admin
  "hitCount"  INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "QrCode_ownerId_idx"   ON "QrCode" ("ownerId");
CREATE INDEX IF NOT EXISTS "QrCode_ownerType_idx" ON "QrCode" ("ownerType");
CREATE INDEX IF NOT EXISTS "QrCode_code_idx"      ON "QrCode" (code);

-- 개별 hit 기록 (시간대별 분포 분석용 — 옵션)
CREATE TABLE IF NOT EXISTS "QrHit" (
  id          BIGSERIAL PRIMARY KEY,
  "qrId"      TEXT NOT NULL REFERENCES "QrCode"(id) ON DELETE CASCADE,
  "ipHash"    TEXT,
  "userAgent" TEXT,
  referrer    TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "QrHit_qrId_idx"       ON "QrHit" ("qrId");
CREATE INDEX IF NOT EXISTS "QrHit_createdAt_idx"  ON "QrHit" ("createdAt" DESC);

-- ════════════════════════════════════════════════════════════════════════════
-- Migration complete
-- ════════════════════════════════════════════════════════════════════════════
