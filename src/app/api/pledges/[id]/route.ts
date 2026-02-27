import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function verifyOwnership(pledgeId: string, session: { user: { id: string } }) {
  const pledge = await prisma.pledge.findUnique({
    where: { id: pledgeId },
    select: { candidateId: true },
  });
  return pledge && pledge.candidateId === session.user.id;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const { id } = await params;
  const isOwner = await verifyOwnership(id, session as unknown as { user: { id: string } });
  if (!isOwner) {
    return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
  }

  const body = await request.json();
  const { title, description, budget, imageUrl, latitude, longitude, address, visible } =
    body;

  const updated = await prisma.pledge.update({
    where: { id },
    data: { title, description, budget, imageUrl, latitude, longitude, address, visible },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const { id } = await params;
  const isOwner = await verifyOwnership(id, session as unknown as { user: { id: string } });
  if (!isOwner) {
    return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
  }

  await prisma.pledge.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
