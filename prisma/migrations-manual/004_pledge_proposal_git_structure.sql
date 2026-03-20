-- ════════════════════════════════════════════════════════════════
-- Migration v14: PledgeProposal Git 구조 전환
-- Supabase SQL Editor: https://supabase.com/dashboard/project/cuokeqrlkbczbwhidtjn/sql/new
-- ════════════════════════════════════════════════════════════════

-- 1. PledgeProposal에 머지 관련 컬럼 추가
ALTER TABLE "PledgeProposal"
  ADD COLUMN IF NOT EXISTS "mergedAt" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "mergedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "mergedPledgeId" TEXT;

-- 2. PledgeProposalRevision 테이블 (커밋)
CREATE TABLE IF NOT EXISTS "PledgeProposalRevision" (
  "id"               TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "pledgeProposalId" TEXT        NOT NULL REFERENCES "PledgeProposal"("id") ON DELETE CASCADE,
  "revisionNumber"   INT         NOT NULL,
  "title"            TEXT        NOT NULL,
  "content"          TEXT        NOT NULL,
  "authorName"       TEXT        NOT NULL,
  "authorType"       TEXT        NOT NULL DEFAULT 'visitor',
  "candidateId"      TEXT,
  "ipHash"           TEXT,
  "commitMessage"    TEXT,
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("pledgeProposalId", "revisionNumber")
);

CREATE INDEX IF NOT EXISTS "PPRevision_proposalId_idx" ON "PledgeProposalRevision"("pledgeProposalId");

-- 3. PledgeProposalComment 테이블
CREATE TABLE IF NOT EXISTS "PledgeProposalComment" (
  "id"               TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "pledgeProposalId" TEXT        NOT NULL REFERENCES "PledgeProposal"("id") ON DELETE CASCADE,
  "content"          TEXT        NOT NULL,
  "authorName"       TEXT        NOT NULL,
  "authorType"       TEXT        NOT NULL DEFAULT 'visitor',
  "candidateId"      TEXT,
  "ipHash"           TEXT,
  "passwordHash"     TEXT,
  "status"           TEXT        NOT NULL DEFAULT 'visible',
  "deletedAt"        TIMESTAMPTZ,
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "PPComment_proposalId_idx" ON "PledgeProposalComment"("pledgeProposalId");

-- 4. 기존 PledgeProposal → 초기 Revision 마이그레이션 (멱등)
INSERT INTO "PledgeProposalRevision" (
  "id", "pledgeProposalId", "revisionNumber", "title", "content",
  "authorName", "authorType", "candidateId", "ipHash", "commitMessage", "createdAt"
)
SELECT
  gen_random_uuid()::text, pp."id", 1,
  pp."title", pp."content", pp."authorName", pp."authorType",
  pp."candidateId", pp."ipHash", '초기 제안 (마이그레이션)', pp."createdAt"
FROM "PledgeProposal" pp
WHERE NOT EXISTS (
  SELECT 1 FROM "PledgeProposalRevision" r
  WHERE r."pledgeProposalId" = pp."id" AND r."revisionNumber" = 1
);

-- 5. accepted 상태 기존 항목에 mergedAt 설정
UPDATE "PledgeProposal"
SET "mergedAt" = "createdAt"
WHERE "status" = 'accepted' AND "mergedAt" IS NULL;
