import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { apiSuccess, apiError, validateImageFile } from "@/lib/api-utils";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return apiError("로그인이 필요합니다", 401);
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return apiError("파일을 선택해주세요", 400);
    }

    // Validate file type and size
    const validationError = validateImageFile(file);
    if (validationError) {
      return apiError(validationError, 400);
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Sanitize extension
    const ext = path.extname(file.name).toLowerCase();
    const allowedExts = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
    const safeExt = allowedExts.includes(ext) ? ext : ".jpg";

    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${safeExt}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads");

    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), buffer);

    return apiSuccess({ url: `/uploads/${filename}` });
  } catch (error) {
    console.error("[POST /api/upload]", error);
    return apiError("파일 업로드에 실패했습니다", 500);
  }
}
