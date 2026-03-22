-- Run this SQL in your Supabase SQL Editor to create the CtaConfig table
-- Dashboard → SQL Editor → New Query → Paste → Run

CREATE TABLE IF NOT EXISTS "CtaConfig" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  headline TEXT NOT NULL DEFAULT '같은 문제를 겪고 있다면?',
  subtext TEXT DEFAULT '지역 이슈를 확인하고 직접 제보해 주세요',
  "targetPages" TEXT[] NOT NULL DEFAULT '{*}',
  "triggerDelay" INTEGER NOT NULL DEFAULT 30,
  "cooldownHours" INTEGER NOT NULL DEFAULT 24,
  "maxShows" INTEGER NOT NULL DEFAULT 3,
  "showIssues" BOOLEAN NOT NULL DEFAULT TRUE,
  "ctaUrl" TEXT NOT NULL DEFAULT '/proposals',
  "ctaLabel" TEXT NOT NULL DEFAULT '나도 제보하러 가기',
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Optional: seed a default CTA
INSERT INTO "CtaConfig" (headline, subtext, "targetPages", "triggerDelay", "cooldownHours", "maxShows", "showIssues", "ctaUrl", "ctaLabel", "isActive")
VALUES (
  '같은 문제를 겪고 있다면?',
  '주변의 지역 이슈를 확인하고 직접 제보해 주세요',
  '{*}',
  30,
  24,
  3,
  TRUE,
  '/proposals',
  '나도 제보하러 가기',
  TRUE
)
ON CONFLICT DO NOTHING;
