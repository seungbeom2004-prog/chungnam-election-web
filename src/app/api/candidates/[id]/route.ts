import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    return NextResponse.json({ error: "후보를 찾을 수 없습니다" }, { status: 404 });
  }

  return NextResponse.json(candidate);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  if (!session || (session.user as { id: string }).id !== id) {
    return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
  }

  const body = await request.json();
  const { name, slogan, bio, phone, profileImage } = body;

  const updated = await prisma.candidate.update({
    where: { id },
    data: { name, slogan, bio, phone, profileImage },
  });

  return NextResponse.json(updated);
}
