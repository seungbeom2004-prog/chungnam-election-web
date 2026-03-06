-- Migration v8: Add pledgeType to Pledge + SecurityLog table
-- Run this in Supabase SQL Editor before deploying.

-- 1. Add pledgeType column to Pledge ("map" or "bylaws")
ALTER TABLE "Pledge" ADD COLUMN IF NOT EXISTS "pledgeType" TEXT NOT NULL DEFAULT 'map';
CREATE INDEX IF NOT EXISTS "idx_pledge_type" ON "Pledge" ("pledgeType");

-- 2. Create SecurityLog table for tracking security events
CREATE TABLE IF NOT EXISTS "SecurityLog" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "type" TEXT NOT NULL,         -- 'rate_limit' | 'bot_blocked' | 'auth_failure' | 'suspicious' | 'payload_blocked'
  "ip" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "userAgent" TEXT,
  "details" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_security_log_created" ON "SecurityLog" ("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_security_log_type" ON "SecurityLog" ("type");
CREATE INDEX IF NOT EXISTS "idx_security_log_ip" ON "SecurityLog" ("ip");

-- 3. Auto-cleanup: delete security logs older than 30 days (optional — run periodically)
-- DELETE FROM "SecurityLog" WHERE "createdAt" < NOW() - INTERVAL '30 days';
