import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ZodError } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPledgeSchema, paginationSchema } from "@/lib/validations";
import { apiSuccess, apiError, apiValidationError, paginate, paginationMeta } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const candidateId = searchParams.get("candidateId");
    const district = searchParams.get("district");

    const { page, limit } = paginationSchema.parse({
      page: searchParams.get("page") ?? 1,
      limit: searchParams.get("limit") ?? 20,
    });

    const where: Record<string, unknown> = { visible: true };
    if (candidateId) where.candidateId = candidateId;
    if (district) where.candidate = { district };

    const [pledges, total] = await Promise.all([
      prisma.pledge.findMany({
        where,
        include: {
          candidate: {
            select: { id: true, name: true, district: true, profileImage: true },
          },
        },
        orderBy: { createdAt: "desc" },
        ...paginate(page, limit),
      }),
      prisma.pledge.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: pledges,
      pagination: paginationMeta(total, page, limit),
    });
  } catch (error) {
    console.error("[GET /api/pledges]", error);
    return apiError("공약 목록을 불러올 수 없습니다", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return apiError("로그인이 필요합니다", 401);
    }

    const candidateId = (session.user as { id: string }).id;
    const body = await request.json();
    const validated = createPledgeSchema.parse(body);

    const pledge = await prisma.pledge.create({
      data: {
        ...validated,
        candidateId,
      },
    });

    return apiSuccess(pledge, 201);
  } catch (error) {
    if (error instanceof ZodError) return apiValidationError(error);
    console.error("[POST /api/pledges]", error);
    return apiError("공약 생성에 실패했습니다", 500);
  }
}
