import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { ZodError } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateCandidateSchema } from "@/lib/validations";
import { apiSuccess, apiError, apiValidationError } from "@/lib/api-utils";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const candidate = await prisma.candidate.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        district: true,
        profileImage: true,
        slogan: true,
        bio: true,
        party: true,
        pledges: {
          where: { visible: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!candidate) {
      return apiError("후보를 찾을 수 없습니다", 404);
    }

    return apiSuccess(candidate);
  } catch (error) {
    console.error("[GET /api/candidates/:id]", error);
    return apiError("후보 정보를 불러올 수 없습니다", 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session || (session.user as { id: string }).id !== id) {
      return apiError("권한이 없습니다", 403);
    }

    const body = await request.json();
    const validated = updateCandidateSchema.parse(body);

    const updated = await prisma.candidate.update({
      where: { id },
      data: validated,
    });

    return apiSuccess(updated);
  } catch (error) {
    if (error instanceof ZodError) return apiValidationError(error);
    console.error("[PUT /api/candidates/:id]", error);
    return apiError("프로필 수정에 실패했습니다", 500);
  }
}
