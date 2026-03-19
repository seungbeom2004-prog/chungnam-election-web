-- ProposalResponse 테이블에 PledgeProposal 응답 지원 추가
-- Supabase SQL Editor에서 실행하세요: https://supabase.com/dashboard/project/cuokeqrlkbczbwhidtjn/sql/new

-- 1. proposalId를 nullable로 변경 (PledgeProposal 응답은 proposalId가 없음)
ALTER TABLE "ProposalResponse" ALTER COLUMN "proposalId" DROP NOT NULL;

-- 2. proposalId FK 제약 재설정 (nullable 허용)
ALTER TABLE "ProposalResponse"
  DROP CONSTRAINT IF EXISTS "ProposalResponse_proposalId_fkey";

ALTER TABLE "ProposalResponse"
  ADD CONSTRAINT "ProposalResponse_proposalId_fkey"
  FOREIGN KEY ("proposalId")
  REFERENCES "ProposalPost"(id) ON DELETE CASCADE;

-- 3. pledgeProposalId 컬럼 추가
ALTER TABLE "ProposalResponse"
  ADD COLUMN IF NOT EXISTS "pledgeProposalId" TEXT;

CREATE INDEX IF NOT EXISTS "ProposalResponse_pledgeProposalId_idx"
  ON "ProposalResponse"("pledgeProposalId");
