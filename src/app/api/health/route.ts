import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const checks: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    env: {
      DATABASE_URL: process.env.DATABASE_URL ? "set" : "missing",
      DIRECT_URL: process.env.DIRECT_URL ? "set" : "missing",
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? "set" : "missing",
    },
  };

  try {
    // Test database connection
    const result = await prisma.$queryRaw`SELECT 1 as ok`;
    checks.database = { connected: true, result };

    // Count records
    const [districts, candidates, pledges] = await Promise.all([
      prisma.district.count(),
      prisma.candidate.count(),
      prisma.pledge.count(),
    ]);
    checks.counts = { districts, candidates, pledges };
    checks.status = "healthy";

    return NextResponse.json(checks);
  } catch (error) {
    checks.database = {
      connected: false,
      error: error instanceof Error ? error.message : String(error),
    };
    checks.status = "unhealthy";

    return NextResponse.json(checks, { status: 500 });
  }
}
