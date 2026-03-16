-- Migration v13: PledgeProposal chain (민원 → 공약 제안 → 정식 공약)

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. PledgeProposal  (공약 제안 — visitor 또는 candidate 이 민원에 대해 제안)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "PledgeProposal" (
  "id"           TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "title"        TEXT        NOT NULL DEFAULT '',
  "content"      TEXT        NOT NULL DEFAULT '',
  "authorName"   TEXT        NOT NULL DEFAULT '',
  "authorType"   TEXT        NOT NULL DEFAULT 'visitor',  -- 'visitor' | 'candidate'
  "candidateId"  TEXT        REFERENCES "Candidate"("id") ON DELETE SET NULL,
  "ipHash"       TEXT,
  "passwordHash" TEXT,
  "status"       TEXT        NOT NULL DEFAULT 'pending',  -- 'pending' | 'accepted' | 'deleted'
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "PledgeProposal_candidateId_idx"  ON "PledgeProposal"("candidateId");
CREATE INDEX IF NOT EXISTS "PledgeProposal_status_idx"       ON "PledgeProposal"("status");
CREATE INDEX IF NOT EXISTS "PledgeProposal_createdAt_idx"    ON "PledgeProposal"("createdAt");

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. PledgeProposalMinwon  (공약 제안 ↔ 민원, 다대다, 재사용 가능)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "PledgeProposalMinwon" (
  "id"               TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "pledgeProposalId" TEXT        NOT NULL REFERENCES "PledgeProposal"("id") ON DELETE CASCADE,
  "minwonId"         TEXT        NOT NULL,  -- ProposalPost.id where postType = '민원'
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE("pledgeProposalId", "minwonId")
);

CREATE INDEX IF NOT EXISTS "PledgeProposalMinwon_minwonId_idx" ON "PledgeProposalMinwon"("minwonId");

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. PledgeToMinwon  (정식 공약 ↔ 민원, 일대일 — 민원 1개는 공약 1개에만)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "PledgeToMinwon" (
  "id"        TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "pledgeId"  TEXT        NOT NULL REFERENCES "Pledge"("id") ON DELETE CASCADE,
  "minwonId"  TEXT        NOT NULL UNIQUE,  -- 민원 1개 → 공약 최대 1개
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "PledgeToMinwon_pledgeId_idx" ON "PledgeToMinwon"("pledgeId");

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. PledgeToProposal  (정식 공약 ↔ 공약 제안, 일대일)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "PledgeToProposal" (
  "id"               TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "pledgeId"         TEXT        NOT NULL REFERENCES "Pledge"("id") ON DELETE CASCADE,
  "pledgeProposalId" TEXT        NOT NULL UNIQUE REFERENCES "PledgeProposal"("id") ON DELETE CASCADE,
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "PledgeToProposal_pledgeId_idx" ON "PledgeToProposal"("pledgeId");
