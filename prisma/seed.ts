import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DISTRICTS = [
  { name: "천안시", code: "cheonan", centerLat: 36.8151, centerLng: 127.1139 },
  { name: "공주시", code: "gongju", centerLat: 36.4465, centerLng: 127.119 },
  { name: "보령시", code: "boryeong", centerLat: 36.3334, centerLng: 126.613 },
  { name: "아산시", code: "asan", centerLat: 36.7898, centerLng: 127.0018 },
  { name: "서산시", code: "seosan", centerLat: 36.7845, centerLng: 126.4503 },
  { name: "논산시", code: "nonsan", centerLat: 36.1872, centerLng: 127.0987 },
  { name: "계룡시", code: "gyeryong", centerLat: 36.2744, centerLng: 127.2487 },
  { name: "당진시", code: "dangjin", centerLat: 36.8897, centerLng: 126.6298 },
  { name: "금산군", code: "geumsan", centerLat: 36.1087, centerLng: 127.488 },
  { name: "부여군", code: "buyeo", centerLat: 36.2758, centerLng: 126.9098 },
  { name: "서천군", code: "seocheon", centerLat: 36.0801, centerLng: 126.6918 },
  { name: "청양군", code: "cheongyang", centerLat: 36.4592, centerLng: 126.8022 },
  { name: "홍성군", code: "hongseong", centerLat: 36.601, centerLng: 126.6608 },
  { name: "예산군", code: "yesan", centerLat: 36.6828, centerLng: 126.8448 },
  { name: "태안군", code: "taean", centerLat: 36.7457, centerLng: 126.298 },
];

async function main() {
  console.log("Seeding database...");

  // Seed districts
  for (const district of DISTRICTS) {
    await prisma.district.upsert({
      where: { code: district.code },
      update: {},
      create: district,
    });
  }
  console.log(`Seeded ${DISTRICTS.length} districts`);

  // Create demo candidate
  const hashedPassword = await bcrypt.hash("demo1234", 10);
  const candidate = await prisma.candidate.upsert({
    where: { email: "demo@reform.kr" },
    update: {},
    create: {
      email: "demo@reform.kr",
      password: hashedPassword,
      name: "김개혁",
      district: "천안시",
      slogan: "시민과 함께하는 새로운 천안",
      bio: "천안시에서 태어나고 자란 토박이로, 더 나은 천안을 위해 뛰겠습니다. 교통, 교육, 복지 분야에서 실질적인 변화를 만들어가겠습니다.",
      party: "개혁신당",
      verified: true,
    },
  });
  console.log(`Created demo candidate: ${candidate.name} (${candidate.email})`);

  // Create demo pledges
  const demoPledges = [
    {
      title: "천안역 앞 보행자 육교 신설",
      description:
        "천안역 앞 교차로는 보행자 사고가 빈번한 위험 구간입니다. 안전한 보행 환경을 위해 보행자 육교를 신설하겠습니다. 어르신과 어린이가 안전하게 건널 수 있는 천안을 만들겠습니다.",
      budget: "8억 원",
      latitude: 36.8092,
      longitude: 127.1469,
      address: "천안시 동남구 대흥로 215",
    },
    {
      title: "두정동 공영주차장 확충",
      description:
        "두정동 상권 주차난 해소를 위해 300대 규모의 공영주차장을 건설하겠습니다. 상인과 방문객 모두가 편리한 주차 환경을 조성합니다.",
      budget: "25억 원",
      latitude: 36.8344,
      longitude: 127.1343,
      address: "천안시 서북구 두정동",
    },
    {
      title: "불당동 어린이 도서관 건립",
      description:
        "불당동 신도시 지역에 어린이 전용 도서관을 건립하여 아이들의 독서 문화를 활성화하겠습니다. 방과 후 돌봄 프로그램과 연계하여 학부모 부담을 줄이겠습니다.",
      budget: "15억 원",
      latitude: 36.8217,
      longitude: 127.103,
      address: "천안시 서북구 불당동",
    },
    {
      title: "성성동~봉서산 산책로 정비",
      description:
        "성성동에서 봉서산으로 이어지는 산책로를 정비하고 야간 조명을 설치하여 시민들이 안전하게 산책할 수 있는 환경을 만들겠습니다.",
      budget: "3억 원",
      latitude: 36.826,
      longitude: 127.115,
      address: "천안시 서북구 성성동",
    },
  ];

  for (const pledgeData of demoPledges) {
    await prisma.pledge.create({
      data: {
        ...pledgeData,
        candidateId: candidate.id,
      },
    });
  }
  console.log(`Created ${demoPledges.length} demo pledges`);

  console.log("\nSeed complete!");
  console.log("Demo login: demo@reform.kr / demo1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
