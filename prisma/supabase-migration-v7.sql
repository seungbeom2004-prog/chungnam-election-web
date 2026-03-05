-- ============================================================
-- Migration v7: Add defaultDistrict to MapPinSettings
-- Run this in the Supabase SQL Editor
-- ============================================================

ALTER TABLE "MapPinSettings"
  ADD COLUMN IF NOT EXISTS "defaultDistrict" TEXT;
