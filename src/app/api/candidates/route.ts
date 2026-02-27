import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const candidates = await prisma.candidate.findMany({
    where: { verified: true },
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
  });

  return NextResponse.json(candidates);
}
