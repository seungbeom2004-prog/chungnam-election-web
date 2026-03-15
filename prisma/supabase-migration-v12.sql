-- Migration v12: Add article fields to Candidate table
-- Run in Supabase SQL Editor

ALTER TABLE "Candidate"
  ADD COLUMN IF NOT EXISTS "articleUrl"   TEXT,
  ADD COLUMN IF NOT EXISTS "articleTitle" TEXT;
