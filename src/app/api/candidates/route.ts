import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { paginationSchema } from "@/lib/validations";
import { apiError, paginationMeta } from "@/lib/api-utils";
import { NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const district = searchParams.get("district");

    const { page, limit } = paginationSchema.parse({
      page: searchParams.get("page") ?? 1,
      limit: searchParams.get("limit") ?? 20,
    });

    const where: Record<string, unknown> = { verified: true };
    if (district) where.district = district;

    const [candidates, total] = await Promise.all([
      prisma.candidate.findMany({
        where,
        select: {
          id: true,
          name: true,
          district: true,
          profileImage: true,
          slogan: true,
          party: true,
          _count: { select: { pledges: { where: { visible: true } } } },
        },
        orderBy: { name: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.candidate.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: candidates,
      pagination: paginationMeta(total, page, limit),
    });
  } catch (error) {
    console.error("[GET /api/candidates]", error);
    return apiError("후보 목록을 불러올 수 없습니다", 500);
  }
}
