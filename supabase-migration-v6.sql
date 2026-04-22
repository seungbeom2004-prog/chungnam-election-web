-- ─────────────────────────────────────────────────────────────────────────────
-- Migration v6
-- 1. Issue.emoji           — Notion-style 이슈 대표 이모지
-- 2. ProposalResponse.officialResponse — 관공서 답변 첨부 텍스트
-- 3. IssuePledge           — 후보자/관리자가 이슈에 명시적으로 공약을 등록하는 조인 테이블
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. 이슈 대표 이모지 컬럼
ALTER TABLE "Issue"
  ADD COLUMN IF NOT EXISTS "emoji" TEXT;

-- 2. 관공서 답변 첨부 (민원 해결/실패 단계에서 후보자가 첨부)
ALTER TABLE "ProposalResponse"
  ADD COLUMN IF NOT EXISTS "officialResponse" TEXT;

-- 3. IssuePledge: 이슈 ↔ 공약 명시적 연결
CREATE TABLE IF NOT EXISTS "IssuePledge" (
  "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "issueId"     TEXT NOT NULL REFERENCES "Issue"(id)     ON DELETE CASCADE,
  "pledgeId"    TEXT NOT NULL REFERENCES "Pledge"(id)    ON DELETE CASCADE,
  "candidateId" TEXT            REFERENCES "Candidate"(id) ON DELETE SET NULL,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("issueId", "pledgeId")
);

-- RLS: 읽기는 공개, 쓰기는 앱 레이어에서 인증
ALTER TABLE "IssuePledge" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- SELECT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'IssuePledge' AND policyname = 'IssuePledge_select'
  ) THEN
    EXECUTE 'CREATE POLICY "IssuePledge_select" ON "IssuePledge" FOR SELECT USING (true)';
  END IF;

  -- INSERT (service role bypasses RLS anyway)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'IssuePledge' AND policyname = 'IssuePledge_insert'
  ) THEN
    EXECUTE 'CREATE POLICY "IssuePledge_insert" ON "IssuePledge" FOR INSERT WITH CHECK (true)';
  END IF;

  -- DELETE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'IssuePledge' AND policyname = 'IssuePledge_delete'
  ) THEN
    EXECUTE 'CREATE POLICY "IssuePledge_delete" ON "IssuePledge" FOR DELETE USING (true)';
  END IF;
END $$;
