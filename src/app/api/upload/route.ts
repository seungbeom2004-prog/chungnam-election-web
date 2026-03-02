import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-utils";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: "dk6hgmcsn",
  api_key: "772544558569271",
  api_secret: "-6qeFa3CbcrDHJHsYoyFgXtf8CI",
});

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

    // Validate file type (images only)
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return apiError("이미지 파일(JPG, PNG, WEBP, GIF)만 업로드할 수 있습니다", 400);
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return apiError("파일 크기는 5MB 이하여야 합니다", 400);
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary
    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: "reform-chungnam",
          resource_type: "image",
          transformation: [{ quality: "auto", fetch_format: "auto" }],
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
