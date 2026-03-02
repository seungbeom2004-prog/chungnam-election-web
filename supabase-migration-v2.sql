-- ============================================================
-- Migration v2: Admin Dashboard, Categories, Email Verification
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Category table
CREATE TABLE IF NOT EXISTS "Category" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "visible" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Category_name_key" ON "Category"("name");

-- 2. District: add visible column
ALTER TABLE "District" ADD COLUMN IF NOT EXISTS "visible" BOOLEAN NOT NULL DEFAULT true;

-- 3. Pledge: add categoryId column
ALTER TABLE "Pledge" ADD COLUMN IF NOT EXISTS "categoryId" TEXT;

-- Add foreign key only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'Pledge_categoryId_fkey'
  ) THEN
    ALTER TABLE "Pledge" ADD CONSTRAINT "Pledge_categoryId_fkey"
      FOREIGN KEY ("categoryId") REFERENCES "Category"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS "Pledge_categoryId_idx" ON "Pledge"("categoryId");

-- 4. Candidate: add emailVerified column
ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false;

-- 5. Seed default categories
INSERT INTO "Category" ("name", "description", "sortOrder") VALUES
  ('교육', '교육 관련 공약', 1),
  ('복지', '복지 관련 공약', 2),
  ('경제', '경제/일자리 관련 공약', 3),
  ('환경', '환경/에너지 관련 공약', 4),
  ('교통', '교통/인프라 관련 공약', 5),
  ('문화', '문화/관광 관련 공약', 6),
  ('안전', '안전/재난 관련 공약', 7),
  ('기타', '기타 공약', 99)
ON CONFLICT ("name") DO NOTHING;

-- 6. Set existing admin account emailVerified to true
UPDATE "Candidate" SET "emailVerified" = true WHERE "role" = 'admin';
