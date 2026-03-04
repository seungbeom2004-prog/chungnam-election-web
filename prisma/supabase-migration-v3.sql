-- ============================================================
-- Migration v3: Category emoji/color + Candidate handle
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. Add emoji and color columns to Category
ALTER TABLE "Category"
  ADD COLUMN IF NOT EXISTS "emoji" TEXT,
  ADD COLUMN IF NOT EXISTS "color" TEXT NOT NULL DEFAULT '#FF5A00';

-- 2. Add handle column to Candidate (nullable, globally unique)
ALTER TABLE "Candidate"
  ADD COLUMN IF NOT EXISTS "handle" TEXT;

-- Unique index only on non-null handles (allows multiple NULL handles)
CREATE UNIQUE INDEX IF NOT EXISTS "Candidate_handle_key"
  ON "Candidate"("handle")
  WHERE "handle" IS NOT NULL;

-- Index for fast handle lookups
CREATE INDEX IF NOT EXISTS "Candidate_handle_idx"
  ON "Candidate"("handle")
  WHERE "handle" IS NOT NULL;

-- 3. Seed default emojis/colors for existing categories (optional)
UPDATE "Category" SET "emoji" = '📚', "color" = '#3B82F6' WHERE "name" = '교육';
UPDATE "Category" SET "emoji" = '💙', "color" = '#8B5CF6' WHERE "name" = '복지';
UPDATE "Category" SET "emoji" = '💼', "color" = '#10B981' WHERE "name" = '경제';
UPDATE "Category" SET "emoji" = '🌿', "color" = '#22C55E' WHERE "name" = '환경';
UPDATE "Category" SET "emoji" = '🚌', "color" = '#F59E0B' WHERE "name" = '교통';
UPDATE "Category" SET "emoji" = '🎭', "color" = '#EC4899' WHERE "name" = '문화';
UPDATE "Category" SET "emoji" = '🛡️', "color" = '#EF4444' WHERE "name" = '안전';
UPDATE "Category" SET "emoji" = '📌', "color" = '#6B7280' WHERE "name" = '기타';
