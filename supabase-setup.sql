-- ============================================
-- 개혁 충남 홈페이지 - Supabase Database Setup
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================

-- 1. Create tables
CREATE TABLE IF NOT EXISTS "Candidate" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "email" TEXT NOT NULL,
  "password" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "district" TEXT NOT NULL,
  "profileImage" TEXT,
  "slogan" TEXT,
  "bio" TEXT,
  "phone" TEXT,
  "party" TEXT NOT NULL DEFAULT '개혁',
  "role" TEXT NOT NULL DEFAULT 'candidate',
  "verified" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Pledge" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "budget" TEXT,
  "imageUrl" TEXT,
  "latitude" DOUBLE PRECISION NOT NULL,
  "longitude" DOUBLE PRECISION NOT NULL,
  "address" TEXT,
  "visible" BOOLEAN NOT NULL DEFAULT true,
  "candidateId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Pledge_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Pledge_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "District" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "centerLat" DOUBLE PRECISION NOT NULL,
  "centerLng" DOUBLE PRECISION NOT NULL,
  CONSTRAINT "District_pkey" PRIMARY KEY ("id")
);

-- 2. Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS "Candidate_email_key" ON "Candidate"("email");
CREATE INDEX IF NOT EXISTS "Candidate_district_idx" ON "Candidate"("district");
CREATE INDEX IF NOT EXISTS "Candidate_verified_idx" ON "Candidate"("verified");
CREATE INDEX IF NOT EXISTS "Pledge_candidateId_idx" ON "Pledge"("candidateId");
CREATE INDEX IF NOT EXISTS "Pledge_visible_idx" ON "Pledge"("visible");
CREATE UNIQUE INDEX IF NOT EXISTS "District_code_key" ON "District"("code");

-- 3. Seed districts
INSERT INTO "District" ("name", "code", "centerLat", "centerLng") VALUES
  ('천안시', 'cheonan', 36.8151, 127.1139),
  ('공주시', 'gongju', 36.4465, 127.119),
  ('보령시', 'boryeong', 36.3334, 126.613),
  ('아산시', 'asan', 36.7898, 127.0018),
  ('서산시', 'seosan', 36.7845, 126.4503),
  ('논산시', 'nonsan', 36.1872, 127.0987),
  ('계룡시', 'gyeryong', 36.2744, 127.2487),
  ('당진시', 'dangjin', 36.8897, 126.6298),
  ('금산군', 'geumsan', 36.1087, 127.488),
  ('부여군', 'buyeo', 36.2758, 126.9098),
  ('서천군', 'seocheon', 36.0801, 126.6918),
  ('청양군', 'cheongyang', 36.4592, 126.8022),
  ('홍성군', 'hongseong', 36.601, 126.6608),
  ('예산군', 'yesan', 36.6828, 126.8448),
  ('태안군', 'taean', 36.7457, 126.298)
ON CONFLICT ("code") DO NOTHING;

-- 4. Seed admin account (password: admin1234)
INSERT INTO "Candidate" ("email", "password", "name", "district", "party", "role", "verified")
VALUES (
  'admin@reform.kr',
  '$2b$12$izZkhCq6PmkiTcBQZpWi6O1g3rw7ostZnp9i0/MBFuRFG04R5DrPu',
  '관리자',
  '천안시',
  '개혁',
  'admin',
  true
) ON CONFLICT ("email") DO NOTHING;

-- 5. Seed demo candidate (password: demo1234)
INSERT INTO "Candidate" ("id", "email", "password", "name", "district", "slogan", "bio", "party", "role", "verified")
VALUES (
  'demo-candidate-001',
  'demo@reform.kr',
  '$2b$12$mNrSEKsaDQ9/k7Kk.dBYO.Xkhy8PAWBvLRzPTtJqqLvPHMPqGALuS',
  '김개혁',
  '천안시',
  '시민과 함께하는 새로운 천안',
  '천안시에서 태어나고 자란 토박이로, 더 나은 천안을 위해 뛰겠습니다. 교통, 교육, 복지 분야에서 실질적인 변화를 만들어가겠습니다.',
  '개혁',
  'candidate',
  true
) ON CONFLICT ("email") DO NOTHING;

-- 6. Seed demo pledges
INSERT INTO "Pledge" ("title", "description", "budget", "latitude", "longitude", "address", "candidateId")
VALUES
  ('천안역 앞 보행자 육교 신설',
   '천안역 앞 교차로는 보행자 사고가 빈번한 위험 구간입니다. 안전한 보행 환경을 위해 보행자 육교를 신설하겠습니다.',
   '8억 원', 36.8092, 127.1469, '천안시 동남구 대흥로 215', 'demo-candidate-001'),
  ('두정동 공영주차장 확충',
   '두정동 상권 주차난 해소를 위해 300대 규모의 공영주차장을 건설하겠습니다.',
   '25억 원', 36.8344, 127.1343, '천안시 서북구 두정동', 'demo-candidate-001'),
  ('불당동 어린이 도서관 건립',
   '불당동 신도시 지역에 어린이 전용 도서관을 건립하여 아이들의 독서 문화를 활성화하겠습니다.',
   '15억 원', 36.8217, 127.103, '천안시 서북구 불당동', 'demo-candidate-001'),
  ('성성동~봉서산 산책로 정비',
   '성성동에서 봉서산으로 이어지는 산책로를 정비하고 야간 조명을 설치하여 시민들이 안전하게 산책할 수 있는 환경을 만들겠습니다.',
   '3억 원', 36.826, 127.115, '천안시 서북구 성성동', 'demo-candidate-001');

-- Done!
SELECT 'Setup complete!' AS status,
  (SELECT count(*) FROM "District") AS districts,
  (SELECT count(*) FROM "Candidate") AS candidates,
  (SELECT count(*) FROM "Pledge") AS pledges;
