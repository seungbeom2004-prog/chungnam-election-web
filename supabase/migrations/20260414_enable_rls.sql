-- ============================================================
-- Enable Row Level Security on all public tables
-- Run this in Supabase SQL Editor (project: cuokeqrlkbczbwhidtjn)
-- ============================================================

-- 1. Enable RLS on every table
ALTER TABLE "Candidate"                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CandidateLike"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CandidateMeta"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Category"                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CtaConfig"                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE "District"                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Election"                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Issue"                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MapPinSettings"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PageView"                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Pledge"                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PledgeCollaboration"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PledgeComment"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PledgeLike"                ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PledgeProposal"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PledgeProposalComment"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PledgeProposalMinwon"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PledgeProposalRevision"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PledgeToProposal"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProposalLike"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProposalPost"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProposalResponse"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Schedule"                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SecurityLog"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StatsCache"                ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. Public read-only tables (anon can SELECT, nothing else)
--    All writes go through the service-role key in API routes.
-- ============================================================

CREATE POLICY "public_select" ON "Candidate"              FOR SELECT TO anon USING (true);
CREATE POLICY "public_select" ON "CandidateLike"          FOR SELECT TO anon USING (true);
CREATE POLICY "public_select" ON "CandidateMeta"          FOR SELECT TO anon USING (true);
CREATE POLICY "public_select" ON "Category"               FOR SELECT TO anon USING (true);
CREATE POLICY "public_select" ON "CtaConfig"              FOR SELECT TO anon USING (true);
CREATE POLICY "public_select" ON "District"               FOR SELECT TO anon USING (true);
CREATE POLICY "public_select" ON "Election"               FOR SELECT TO anon USING (true);
CREATE POLICY "public_select" ON "Issue"                  FOR SELECT TO anon USING (true);
CREATE POLICY "public_select" ON "MapPinSettings"         FOR SELECT TO anon USING (true);
CREATE POLICY "public_select" ON "Pledge"                 FOR SELECT TO anon USING (true);
CREATE POLICY "public_select" ON "PledgeCollaboration"    FOR SELECT TO anon USING (true);
CREATE POLICY "public_select" ON "PledgeComment"          FOR SELECT TO anon USING (true);
CREATE POLICY "public_select" ON "PledgeLike"             FOR SELECT TO anon USING (true);
CREATE POLICY "public_select" ON "PledgeProposal"         FOR SELECT TO anon USING (true);
CREATE POLICY "public_select" ON "PledgeProposalComment"  FOR SELECT TO anon USING (true);
CREATE POLICY "public_select" ON "PledgeProposalMinwon"   FOR SELECT TO anon USING (true);
CREATE POLICY "public_select" ON "PledgeProposalRevision" FOR SELECT TO anon USING (true);
CREATE POLICY "public_select" ON "PledgeToProposal"       FOR SELECT TO anon USING (true);
CREATE POLICY "public_select" ON "ProposalLike"           FOR SELECT TO anon USING (true);
CREATE POLICY "public_select" ON "ProposalPost"           FOR SELECT TO anon USING (true);
CREATE POLICY "public_select" ON "ProposalResponse"       FOR SELECT TO anon USING (true);
CREATE POLICY "public_select" ON "Schedule"               FOR SELECT TO anon USING (true);
CREATE POLICY "public_select" ON "StatsCache"             FOR SELECT TO anon USING (true);
-- Notification: candidates read their own (via authenticated session, handled by service-role)
CREATE POLICY "public_select" ON "Notification"           FOR SELECT TO anon USING (true);

-- ============================================================
-- 3. Admin/internal-only tables — NO anon access at all
--    (service-role key bypasses RLS; these tables never need
--     to be readable via the anon key)
-- ============================================================

-- SecurityLog: no policy = no access for anon
-- PageView: no policy = no access for anon
-- (service_role bypasses RLS and can still read/write these)

-- ============================================================
-- Done. The service-role key (supabaseAdmin) bypasses all RLS
-- policies, so existing API routes continue to work unchanged.
-- ============================================================
