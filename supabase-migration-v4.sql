-- ============================================================
-- Migration v4: MapPinSettings (configurable map marker)
-- Run in Supabase SQL Editor before deploying the app update.
-- ============================================================

CREATE TABLE IF NOT EXISTS "MapPinSettings" (
  "id"    TEXT NOT NULL DEFAULT 'default',
  "emoji" TEXT NOT NULL DEFAULT '📍',
  "color" TEXT NOT NULL DEFAULT '#FF5A00',
  CONSTRAINT "MapPinSettings_pkey" PRIMARY KEY ("id")
);

-- Seed the single settings row (idempotent)
INSERT INTO "MapPinSettings" ("id", "emoji", "color")
VALUES ('default', '📍', '#FF5A00')
ON CONFLICT ("id") DO NOTHING;

SELECT 'Migration v4 complete! MapPinSettings table ready.' AS status;
