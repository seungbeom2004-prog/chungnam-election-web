-- 공약 상세 콘텐츠 필드 추가
-- Supabase SQL Editor에서 실행하세요: https://supabase.com/dashboard/project/cuokeqrlkbczbwhidtjn/sql/new

ALTER TABLE "Pledge"
  ADD COLUMN IF NOT EXISTS background TEXT,        -- 배경/필요성
  ADD COLUMN IF NOT EXISTS plan TEXT,              -- 실행 방안
  ADD COLUMN IF NOT EXISTS "expectedEffect" TEXT,  -- 기대 효과
  ADD COLUMN IF NOT EXISTS "relatedLinks" JSONB DEFAULT '[]'::jsonb;  -- 관련 링크 배열
