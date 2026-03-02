-- ============================================================
-- Migration v3: Elections, Schedules, Pledge Collaboration,
--               Candidate Status, Caucus Status, District Order
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Election table
CREATE TABLE IF NOT EXISTS "Election" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT '지방선거',
  "description" TEXT,
  "visible" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Election_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Election_name_key" ON "Election"("name");

-- 2. Candidate: add new status columns and electionId
ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "electionId" TEXT;
ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "candidateStatus" TEXT NOT NULL DEFAULT '출마예정자';
ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "caucusStatus" TEXT NOT NULL DEFAULT '공천 미확정';

-- Add FK for electionId
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'Candidate_electionId_fkey'
  ) THEN
    ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_electionId_fkey"
      FOREIGN KEY ("electionId") REFERENCES "Election"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS "Candidate_electionId_idx" ON "Candidate"("electionId");
CREATE INDEX IF NOT EXISTS "Candidate_caucusStatus_idx" ON "Candidate"("caucusStatus");

-- 3. District: add sortOrder column
ALTER TABLE "District" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- Initialize sortOrder for existing districts (alphabetically)
DO $$
DECLARE
  r RECORD;
  i INTEGER := 1;
BEGIN
  FOR r IN
    SELECT id FROM "District" ORDER BY "name" ASC
  LOOP
    UPDATE "District" SET "sortOrder" = i WHERE id = r.id;
    i := i + 1;
  END LOOP;
END $$;

-- 4. Schedule table
CREATE TABLE IF NOT EXISTS "Schedule" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "candidateId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3),
  "location" TEXT,
  "isPublic" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Schedule_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Schedule_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Schedule_candidateId_idx" ON "Schedule"("candidateId");
CREATE INDEX IF NOT EXISTS "Schedule_startDate_idx" ON "Schedule"("startDate");

-- 5. PledgeCollaboration table (co-authoring pledges)
CREATE TABLE IF NOT EXISTS "PledgeCollaboration" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "pledgeId" TEXT NOT NULL,
  "candidateId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PledgeCollaboration_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PledgeCollaboration_pledgeId_fkey" FOREIGN KEY ("pledgeId") REFERENCES "Pledge"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PledgeCollaboration_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "PledgeCollaboration_pledgeId_candidateId_key" ON "PledgeCollaboration"("pledgeId", "candidateId");
CREATE INDEX IF NOT EXISTS "PledgeCollaboration_pledgeId_idx" ON "PledgeCollaboration"("pledgeId");
CREATE INDEX IF NOT EXISTS "PledgeCollaboration_candidateId_idx" ON "PledgeCollaboration"("candidateId");

-- 6. Seed default elections
INSERT INTO "Election" ("name", "type", "description", "sortOrder") VALUES
  ('제9회 전국동시지방선거', '지방선거', '2026년 지방선거', 1),
  ('제23대 국회의원선거', '국회의원선거', '2024년 국회의원 총선거', 2)
ON CONFLICT ("name") DO NOTHING;

-- Done!
SELECT 'Migration v3 complete!' AS status;
