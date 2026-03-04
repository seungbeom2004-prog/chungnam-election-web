-- ============================================================
-- Migration v4: Add election type, province, and status fields
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Add new columns to Candidate table for election information and status
ALTER TABLE "Candidate"
  ADD COLUMN IF NOT EXISTS "electionType" TEXT,
  ADD COLUMN IF NOT EXISTS "province" TEXT,
  ADD COLUMN IF NOT EXISTS "electionId" TEXT,
  ADD COLUMN IF NOT EXISTS "candidateStatus" TEXT,
  ADD COLUMN IF NOT EXISTS "isNominated" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "isNecRegistered" BOOLEAN;

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS "Candidate_electionType_idx" ON "Candidate"("electionType");
CREATE INDEX IF NOT EXISTS "Candidate_province_idx" ON "Candidate"("province");
CREATE INDEX IF NOT EXISTS "Candidate_isNominated_idx" ON "Candidate"("isNominated");
CREATE INDEX IF NOT EXISTS "Candidate_isNecRegistered_idx" ON "Candidate"("isNecRegistered");
