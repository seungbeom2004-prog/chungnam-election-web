-- ProposalResponse 테이블: 후보자가 제보/제안 게시물에 남기는 공식 답변
-- Supabase SQL Editor에서 실행하세요: https://supabase.com/dashboard/project/cuokeqrlkbczbwhidtjn/sql/new

CREATE TABLE IF NOT EXISTS "ProposalResponse" (
  id                      TEXT        NOT NULL,
  "proposalId"            TEXT        NOT NULL,
  "candidateId"           TEXT        NOT NULL,
  "candidateName"         TEXT        NOT NULL,
  "candidateProfileImage" TEXT,
  -- "접수됨" | "검토 중" | "공약 반영 예정" | "공약 반영 완료" | "반영 불가"
  status                  TEXT        NOT NULL DEFAULT '접수됨',
  content                 TEXT        NOT NULL,
  "pledgeId"              TEXT,
  "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProposalResponse_pkey" PRIMARY KEY (id),
  CONSTRAINT "ProposalResponse_proposalId_fkey"
    FOREIGN KEY ("proposalId") REFERENCES "ProposalPost"(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "ProposalResponse_proposalId_idx" ON "ProposalResponse"("proposalId");
CREATE INDEX IF NOT EXISTS "ProposalResponse_candidateId_idx" ON "ProposalResponse"("candidateId");

-- updatedAt 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_proposal_response_updated_at
  BEFORE UPDATE ON "ProposalResponse"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
