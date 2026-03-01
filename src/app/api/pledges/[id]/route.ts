import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { ZodError } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updatePledgeSchema } from "@/lib/validations";
import { apiSuccess, apiError, apiValidationError } from "@/lib/api-utils";

async function verifyOwnership(pledgeId: string, userId: string) {
  const pledge = await prisma.pledge.findUnique({
    where: { id: pledgeId },
    select: { candidateId: true },
  });
  return pledge && pledge.candidateId === userId;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return apiError("로그인이 필요합니다", 401);
    }

    const { id } = await params;
    const userId = (session.user as { id: string }).id;
    const isOwner = await verifyOwnership(id, userId);
    if (!isOwner) {
      return apiError("권한이 없습니다", 403);
    }

    const body = await request.json();
    const validated = updatePledgeSchema.parse(body);

    const updated = await prisma.pledge.update({
      where: { id },
      data: validated,
    });

    return apiSuccess(updated);
  } catch (error) {
    if (error instanceof ZodError) return apiValidationError(error);
    console.error("[PUT /api/pledges/:id]", error);
    return apiError("공약 수정에 실패했습니다", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return apiError("로그인이 필요합니다", 401);
    }

    const { id } = await params;
    const userId = (session.user as { id: string }).id;
    const isOwner = await verifyOwnership(id, userId);
    if (!isOwner) {
      return apiError("권한이 없습니다", 403);
    }

    await prisma.pledge.delete({ where: { id } });
    return apiSuccess({ deleted: true });
  } catch (error) {
    console.error("[DELETE /api/pledges/:id]", error);
    return apiError("공약 삭제에 실패했습니다", 500);
  }
}
