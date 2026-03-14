-- Migration v9: Add detailedElectionName to Candidate
-- Run this in Supabase SQL Editor before deploying.

-- 1. Add detailedElectionName column (free-text election label shown on map)
--    e.g. "천안시의원선거", "천안시서북구의원선거"
ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "detailedElectionName" TEXT;
