import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const candidateId = searchParams.get("candidateId");
  const district = searchParams.get("district");

  const where: Record<string, unknown> = { visible: true };
  if (candidateId) where.candidateId = candidateId;
  if (district) where.candidate = { district };

  const pledges = await prisma.pledge.findMany({
    where,
    include: {
      candidate: {
        select: { id: true, name: true, district: true, profileImage: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(pledges);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const candidateId = (session.user as { id: string }).id;
  const body = await request.json();
  const { title, description, budget, imageUrl, latitude, longitude, address } =
    body;

  if (!title || !description || latitude == null || longitude == null) {
    return NextResponse.json(
      { error: "필수 항목을 입력해주세요" },
      { status: 400 }
    );
  }

  const pledge = await prisma.pledge.create({
    data: {
      title,
      description,
      budget,
      imageUrl,
      latitude,
      longitude,
      address,
      candidateId,
    },
  });

  return NextResponse.json(pledge, { status: 201 });
}
