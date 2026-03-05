-- ============================================================
-- Migration v5: Add pin location to Candidate, iconImage to Category
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. Add admin-configurable map pin coordinates to Candidate
ALTER TABLE "Candidate"
  ADD COLUMN IF NOT EXISTS "pinLat" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "pinLng" DOUBLE PRECISION;

-- 2. Add optional photo icon URL to Category
ALTER TABLE "Category"
  ADD COLUMN IF NOT EXISTS "iconImage" TEXT;
