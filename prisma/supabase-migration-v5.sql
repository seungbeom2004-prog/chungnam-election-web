-- ============================================================
-- Migration v5: Add bylawTagged and relatedPledgeId to Pledge
-- Run this in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/cuokeqrlkbczbwhidtjn/editor
-- ============================================================

-- Allow map pledges to also appear in the bylaw list (조례태그)
ALTER TABLE "Pledge"
  ADD COLUMN IF NOT EXISTS "bylawTagged" boolean NOT NULL DEFAULT false;

-- Optional: link related pledges to each other
ALTER TABLE "Pledge"
  ADD COLUMN IF NOT EXISTS "relatedPledgeId" uuid REFERENCES "Pledge"(id) ON DELETE SET NULL;

-- Index for fast filter queries
CREATE INDEX IF NOT EXISTS "Pledge_bylawTagged_idx" ON "Pledge"("bylawTagged") WHERE "bylawTagged" = true;
