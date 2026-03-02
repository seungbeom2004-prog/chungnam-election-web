import { z } from "zod";

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
  district: z.string().min(2, "지역을 선택해주세요"),
  phone: z
    .string()
    .regex(/^[0-9-]+$/, "올바른 전화번호를 입력하세요")
    .max(20)
    .optional(),
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
  sortOrder: z.number().int().min(0).default(0),
});

export const updateCategorySchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(200).optional().nullable(),
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
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
