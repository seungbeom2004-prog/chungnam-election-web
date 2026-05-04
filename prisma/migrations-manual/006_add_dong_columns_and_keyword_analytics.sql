-- ════════════════════════════════════════════════════════════════════════════
-- Migration 006: Dong columns on ProposalPost (행정동/법정동 직접 저장)
--
-- AI 피드와 키워드 분석 모두 매번 reverse-geocode하지 않도록 좌표→읍면동 결과를
-- DB에 저장. 신규 게시글은 작성 시점에 자동 채움, 기존 글은 backfill endpoint로.
--
-- Idempotent — safe to re-run.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE "ProposalPost"
  ADD COLUMN IF NOT EXISTS "legalDong" TEXT,
  ADD COLUMN IF NOT EXISTS "admDong"   TEXT;

-- 시군구·읍면동 필터링용 인덱스
CREATE INDEX IF NOT EXISTS "ProposalPost_city_idx"      ON "ProposalPost" ("city");
CREATE INDEX IF NOT EXISTS "ProposalPost_legalDong_idx" ON "ProposalPost" ("legalDong");
CREATE INDEX IF NOT EXISTS "ProposalPost_admDong_idx"   ON "ProposalPost" ("admDong");

-- 키워드 분석 검색 가속용 (대규모 시 GIN 인덱스 사용)
-- pg_trgm 확장이 있으면 부분 일치 검색이 빨라짐 (있으면 사용, 없으면 무시)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS "ProposalPost_content_trgm_idx"
  ON "ProposalPost" USING GIN ("content" gin_trgm_ops);
