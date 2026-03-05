-- Migration v6: Add defaultZoom to MapPinSettings
-- Run this in the Supabase SQL Editor

ALTER TABLE "MapPinSettings"
  ADD COLUMN IF NOT EXISTS "defaultZoom" INTEGER NOT NULL DEFAULT 9;

-- Also add electionType to Candidate if it doesn't exist
ALTER TABLE "Candidate"
  ADD COLUMN IF NOT EXISTS "electionType" TEXT;
