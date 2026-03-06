import { z } from "zod";

// Reserved slugs that cannot be used as candidate handles
export const RESERVED_HANDLES = [
  "admin", "dashboard", "login", "logout", "signup", "register",
  "api", "candidates", "pledges", "districts", "categories",
  "profile", "settings", "qr", "upload", "health", "about",
  "cheonan", "gongju", "boryeong", "asan", "seosan", "nonsan",
  "gyeryong", "dangjin", "geumsan", "buyeo", "seocheon",
  "cheongyang", "hongseong", "yesan", "taean",
];

// ── Pledge Schemas ──────────────────────────────────────────

export const createPledgeSchema = z.object({
  title: z
    .string()
    .min(2, "제목은 2자 이상이어야 합니다")
    .max(100, "제목은 100자 이내여야 합니다"),
  description: z
    .string()
    .min(10, "설명은 10자 이상이어야 합니다")
    .max(2000, "설명은 2000자 이내여야 합니다"),
  budget: z.string().max(50).optional().nullable(),
  imageUrl: z.string().url("올바른 URL을 입력하세요").optional().nullable(),
  latitude: z.number().min(-90).max(90, "올바른 위도를 입력하세요"),
  longitude: z.number().min(-180).max(180, "올바른 경도를 입력하세요"),
  address: z.string().max(200).optional().nullable(),
  categoryId: z.string().optional().nullable(),
  pledgeType: z.enum(["map", "bylaws"]).default("map"),
});

export const updatePledgeSchema = createPledgeSchema.partial().extend({
  visible: z.boolean().optional(),
});

// ── Candidate Schemas ───────────────────────────────────────

export const updateCandidateSchema = z.object({
  name: z
    .string()
    .min(2, "이름은 2자 이상이어야 합니다")
    .max(20, "이름은 20자 이내여야 합니다")
    .optional(),
  handle: z
    .string()
    .min(3, "핸들은 3자 이상이어야 합니다")
    .max(30, "핸들은 30자 이내여야 합니다")
    .regex(
      /^[a-z0-9_-]+$/,
      "핸들은 영어 소문자, 숫자, _, - 만 사용 가능합니다"
    )
    .refine(
      (v) => !RESERVED_HANDLES.includes(v),
      "사용할 수 없는 핸들입니다"
    )
    .optional()
    .nullable(),
  slogan: z.string().max(100, "슬로건은 100자 이내여야 합니다").optional().nullable(),
  bio: z.string().max(2000, "소개는 2000자 이내여야 합니다").optional().nullable(),
  phone: z
    .string()
    .regex(/^[0-9-]+$/, "올바른 전화번호를 입력하세요")
    .max(20)
    .optional()
    .nullable(),
  profileImage: z.string().url().optional().nullable(),
  district: z.string().min(2, "지역을 선택해주세요").optional(),
  electionId: z.string().optional().nullable(),
  candidateStatus: z
    .enum(["출마예정자", "예비후보자", "후보자"])
    .optional(),
  caucusStatus: z
    .enum(["공천 미확정", "공천 확정"])
    .optional(),
  electionType: z.string().max(100).optional().nullable(),
});

export const registerCandidateSchema = z.object({
  email: z.string().email("올바른 이메일을 입력하세요"),
  password: z
    .string()
    .min(8, "비밀번호는 8자 이상이어야 합니다")
    .max(100, "비밀번호는 100자 이내여야 합니다"),
  name: z
    .string()
    .min(2, "이름은 2자 이상이어야 합니다")
    .max(20, "이름은 20자 이내여야 합니다"),
  phone: z
    .string()
    .regex(/^[0-9-]+$/, "올바른 전화번호를 입력하세요")
    .max(20),
  electionType: z.string().min(1, "선거 종류를 선택해주세요"),
  province: z.string().min(2, "시도를 선택해주세요"),
  district: z.string().min(2, "지역을 선택해주세요").max(100),
  profileImage: z.string().url().optional().nullable(),
  isNominated: z.boolean().optional(),
  isNecRegistered: z.boolean().optional(),
});

// ── Admin Schemas ───────────────────────────────────────────

export const verifyCandidateSchema = z.object({
  candidateId: z.string().min(1, "후보 ID가 필요합니다"),
  verified: z.boolean(),
});

// ── Category Schemas ────────────────────────────────────────

export const createCategorySchema = z.object({
  name: z.string().min(1, "카테고리명을 입력하세요").max(50),
  description: z.string().max(200).optional().nullable(),
  emoji: z.string().max(10).optional().nullable(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "올바른 색상 코드를 입력하세요 (예: #FF5A00)")
    .default("#FF5A00"),
  iconImage: z.string().url().optional().nullable(),
  sortOrder: z.number().int().min(0).default(0),
});

export const updateCategorySchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(200).optional().nullable(),
  emoji: z.string().max(10).optional().nullable(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "올바른 색상 코드를 입력하세요")
    .optional(),
  iconImage: z.string().url().optional().nullable(),
  visible: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

// ── Election Schemas ────────────────────────────────────────

export const createElectionSchema = z.object({
  name: z.string().min(1, "선거명을 입력하세요").max(100),
  type: z.string().min(1).max(50).default("지방선거"),
  description: z.string().max(500).optional().nullable(),
  sortOrder: z.number().int().min(0).default(0),
});

export const updateElectionSchema = z.object({
  electionId: z.string().min(1),
  name: z.string().min(1).max(100).optional(),
  type: z.string().min(1).max(50).optional(),
  description: z.string().max(500).optional().nullable(),
  visible: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

// ── Schedule Schemas ────────────────────────────────────────

export const createScheduleSchema = z.object({
  title: z.string().min(1, "일정 제목을 입력하세요").max(200),
  description: z.string().max(2000).optional().nullable(),
  startDate: z.string().min(1, "시작일을 입력하세요"),
  endDate: z.string().optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  isPublic: z.boolean().default(true),
});

export const updateScheduleSchema = createScheduleSchema.partial().omit({ startDate: true }).extend({
  startDate: z.string().optional(),
});

// ── Pagination ──────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(1000).default(20),
});
