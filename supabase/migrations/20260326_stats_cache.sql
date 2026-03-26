-- StatsCache table for pre-caching weekly/daily stats
-- Run this in Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS "StatsCache" (
  "id"          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "cacheKey"    TEXT NOT NULL UNIQUE,  -- e.g. "weekly-2026-03-02", "daily-2026-03-01"
  "data"        JSONB NOT NULL,
  "createdAt"   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stats_cache_key ON "StatsCache" ("cacheKey");

-- Enable RLS (allow service role full access, deny anon)
ALTER TABLE "StatsCache" ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS automatically
-- Allow anon read (for faster lookups from API routes using anon key if needed)
CREATE POLICY "Allow read for all" ON "StatsCache"
  FOR SELECT USING (true);

CREATE POLICY "Allow insert/update for service role" ON "StatsCache"
  FOR ALL USING (true);
