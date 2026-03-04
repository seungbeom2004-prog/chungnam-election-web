-- supabase-migration-v5.sql
-- Merge "천안시서북구" and "천안시동남구" → "천안시"
-- Run this in the Supabase SQL editor.

-- ① Upsert the merged "천안시" district row
INSERT INTO "District" (name, code, "centerLat", "centerLng", visible, "sortOrder")
VALUES ('천안시', 'cheonan', 36.815, 127.114, true, 1)
ON CONFLICT (code) DO UPDATE
  SET name       = EXCLUDED.name,
      "centerLat" = EXCLUDED."centerLat",
      "centerLng" = EXCLUDED."centerLng";

-- ② Re-assign any Candidate rows that reference the old sub-district codes
--    to the new merged "cheonan" district
UPDATE "Candidate"
SET "districtId" = (SELECT id FROM "District" WHERE code = 'cheonan')
WHERE "districtId" IN (
  SELECT id FROM "District" WHERE code IN ('cheonan-seobuk', 'cheonan-dongnam')
);

-- ③ Delete the old sub-district rows (safe now that no Candidates reference them)
DELETE FROM "District"
WHERE code IN ('cheonan-seobuk', 'cheonan-dongnam');

-- ④ Renumber sortOrder to keep consistent ordering
--    (optional — only needed if sortOrder matters for your UI)
UPDATE "District" SET "sortOrder" = 1  WHERE code = 'cheonan';
UPDATE "District" SET "sortOrder" = 2  WHERE code = 'gongju';
UPDATE "District" SET "sortOrder" = 3  WHERE code = 'boryeong';
UPDATE "District" SET "sortOrder" = 4  WHERE code = 'asan';
UPDATE "District" SET "sortOrder" = 5  WHERE code = 'seosan';
UPDATE "District" SET "sortOrder" = 6  WHERE code = 'nonsan';
UPDATE "District" SET "sortOrder" = 7  WHERE code = 'gyeryong';
UPDATE "District" SET "sortOrder" = 8  WHERE code = 'dangjin';
UPDATE "District" SET "sortOrder" = 9  WHERE code = 'geumsan';
UPDATE "District" SET "sortOrder" = 10 WHERE code = 'buyeo';
UPDATE "District" SET "sortOrder" = 11 WHERE code = 'seocheon';
UPDATE "District" SET "sortOrder" = 12 WHERE code = 'hongseong';
UPDATE "District" SET "sortOrder" = 13 WHERE code = 'cheongyang';
UPDATE "District" SET "sortOrder" = 14 WHERE code = 'yesan';
UPDATE "District" SET "sortOrder" = 15 WHERE code = 'taean';
