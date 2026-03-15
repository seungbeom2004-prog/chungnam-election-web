-- ─────────────────────────────────────────────────────────────────────────────
-- Migration v10: Proposal improvements + Pledge Likes + Pledge Comments
-- Run in Supabase SQL Editor (idempotent)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. ProposalPost — add title, passwordHash, latitude, longitude
ALTER TABLE "ProposalPost"
  ADD COLUMN IF NOT EXISTS "title"        text    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "passwordHash" text,
  ADD COLUMN IF NOT EXISTS "latitude"     float8,
  ADD COLUMN IF NOT EXISTS "longitude"    float8;

-- 2. PledgeLike — one row per (pledge, ip); toggle like/unlike
CREATE TABLE IF NOT EXISTS "PledgeLike" (
  "id"        text        NOT NULL DEFAULT gen_random_uuid()::text,
  "pledgeId"  text        NOT NULL REFERENCES "Pledge"("id") ON DELETE CASCADE,
  "ipHash"    text        NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id"),
  UNIQUE      ("pledgeId", "ipHash")
);
CREATE INDEX IF NOT EXISTS "PledgeLike_pledgeId_idx" ON "PledgeLike"("pledgeId");

-- 3. PledgeComment — captcha + name + passwordHash; soft-delete via status
CREATE TABLE IF NOT EXISTS "PledgeComment" (
  "id"           text        NOT NULL DEFAULT gen_random_uuid()::text,
  "pledgeId"     text        NOT NULL REFERENCES "Pledge"("id") ON DELETE CASCADE,
  "content"      text        NOT NULL,
  "authorName"   text        NOT NULL,
  "passwordHash" text        NOT NULL,
  "ipHash"       text        NOT NULL,
  "status"       text        NOT NULL DEFAULT 'visible',
  "deletedAt"    timestamptz,
  "createdAt"    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "PledgeComment_pledgeId_idx"         ON "PledgeComment"("pledgeId");
CREATE INDEX IF NOT EXISTS "PledgeComment_status_idx"           ON "PledgeComment"("status");
CREATE INDEX IF NOT EXISTS "PledgeComment_pledgeId_status_idx"  ON "PledgeComment"("pledgeId", "status");

-- 4. ProposalLike — one row per (proposal, ip); toggle like/unlike
CREATE TABLE IF NOT EXISTS "ProposalLike" (
  "id"         text        NOT NULL DEFAULT gen_random_uuid()::text,
  "proposalId" text        NOT NULL REFERENCES "ProposalPost"("id") ON DELETE CASCADE,
  "ipHash"     text        NOT NULL,
  "createdAt"  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id"),
  UNIQUE      ("proposalId", "ipHash")
);
CREATE INDEX IF NOT EXISTS "ProposalLike_proposalId_idx" ON "ProposalLike"("proposalId");

-- Done
