import { NextResponse } from "next/server";
import { ZodError } from "zod";

// ── Standardized API Response ───────────────────────────────

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function apiError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export function apiValidationError(error: ZodError) {
  const messages = error.issues.map((e) => e.message).join(", ");
  return NextResponse.json(
    { success: false, error: messages, details: error.issues },
    { status: 400 }
  );
}

// ── Error Handler Wrapper ───────────────────────────────────

type ApiHandler = (
  ...args: Parameters<(req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<NextResponse>>
) => Promise<NextResponse>;

export function withErrorHandler(handler: ApiHandler): ApiHandler {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (error) {
      console.error("[API Error]", error);

      if (error instanceof ZodError) {
        return apiValidationError(error);
      }

      const message =
        error instanceof Error ? error.message : "서버 오류가 발생했습니다";
      return apiError(message, 500);
    }
  };
}

// ── Pagination Helper ───────────────────────────────────────

export function paginate(page: number, limit: number) {
  return {
    skip: (page - 1) * limit,
    take: limit,
  };
}

export function paginationMeta(total: number, page: number, limit: number) {
  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasMore: page * limit < total,
  };
}

// ── File Upload Validation ──────────────────────────────────

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function validateImageFile(file: File) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return "JPG, PNG, WebP, GIF 파일만 업로드 가능합니다";
  }
  if (file.size > MAX_FILE_SIZE) {
    return "파일 크기는 5MB 이하여야 합니다";
  }
  return null;
}
