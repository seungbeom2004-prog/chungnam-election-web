import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-utils";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Magic-byte signatures for allowed image types
const IMAGE_SIGNATURES: Array<{ mime: string; bytes: number[]; offset?: number }> = [
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/png",  bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: "image/gif",  bytes: [0x47, 0x49, 0x46, 0x38] },  // GIF8
  { mime: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 }, // RIFF....WEBP checked below
];

function detectImageMimeFromBuffer(buf: Buffer): string | null {
  for (const sig of IMAGE_SIGNATURES) {
    const start = sig.offset ?? 0;
    const match = sig.bytes.every((b, i) => buf[start + i] === b);
    if (match) {
      // Extra check for WebP: bytes 8-11 must be "WEBP"
      if (sig.mime === "image/webp") {
        if (buf.slice(8, 12).toString("ascii") !== "WEBP") continue;
      }
      return sig.mime;
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    // Require authentication — only logged-in candidates may upload
    const session = await getServerSession(authOptions);
    if (!session) {
      return apiError("로그인이 필요합니다", 401);
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return apiError("파일을 선택해주세요", 400);
    }

    // Validate file size first (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return apiError("파일 크기는 5MB 이하여야 합니다", 400);
    }

    // Reject obviously wrong client-reported MIME types before reading bytes
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return apiError("이미지 파일(JPG, PNG, WEBP, GIF)만 업로드할 수 있습니다", 400);
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Server-side magic-byte validation (ignores attacker-controlled MIME type)
    const detectedMime = detectImageMimeFromBuffer(buffer);
    if (!detectedMime) {
      return apiError("유효하지 않은 이미지 파일입니다", 400);
    }

    // Sanitize filename — strip path components to prevent directory traversal
    const originalName = file.name ?? "upload";
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/\.{2,}/g, "_");

    // Upload to Cloudinary (using environment-variable credentials)
    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: "reform-chungnam",
          resource_type: "image",
          // Force detected MIME so Cloudinary doesn't trust the filename extension
          format: detectedMime.split("/")[1] === "jpeg" ? "jpg" : detectedMime.split("/")[1],
          public_id: `${Date.now()}_${safeName.replace(/\.[^.]+$/, "")}`,
          transformation: [{ quality: "auto", fetch_format: "auto" }],
          // Prevent script injection via SVG or HTML files
          allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
        },
        (error, result) => {
          if (error || !result) {
            reject(error || new Error("Upload failed"));
          } else {
            resolve(result as { secure_url: string });
          }
        }
      ).end(buffer);
    });

    return apiSuccess({ url: result.secure_url });
  } catch (error) {
    console.error("[POST /api/upload]", error);
    return apiError("파일 업로드에 실패했습니다", 500);
  }
}
