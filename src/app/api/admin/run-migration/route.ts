import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * One-time migration endpoint — creates StatsCache table.
 * DELETE this file after running once.
 *
 * POST /api/admin/run-migration
 * Header: x-admin-secret: <ADMIN_SECRET>
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-admin-secret");
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: { step: string; status: string; error?: string }[] = [];

  const steps = [
    {
      name: "create StatsCache table",
      sql: `
        CREATE TABLE IF NOT EXISTS "StatsCache" (
          "id"        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          "cacheKey"  TEXT NOT NULL UNIQUE,
          "data"      JSONB NOT NULL,
          "createdAt" TIMESTAMPTZ DEFAULT NOW()
        )
      `,
    },
    {
      name: "create index on cacheKey",
      sql: `CREATE INDEX IF NOT EXISTS idx_stats_cache_key ON "StatsCache" ("cacheKey")`,
    },
    {
      name: "enable RLS",
      sql: `ALTER TABLE "StatsCache" ENABLE ROW LEVEL SECURITY`,
    },
    {
      name: "create read policy",
      sql: `
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = 'StatsCache' AND policyname = 'Allow read for all'
          ) THEN
            CREATE POLICY "Allow read for all" ON "StatsCache" FOR SELECT USING (true);
          END IF;
        END $$
      `,
    },
    {
      name: "create write policy",
      sql: `
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = 'StatsCache' AND policyname = 'Allow insert/update for service role'
          ) THEN
            CREATE POLICY "Allow insert/update for service role" ON "StatsCache" FOR ALL USING (true);
          END IF;
        END $$
      `,
    },
  ];

  for (const step of steps) {
    try {
      await prisma.$executeRawUnsafe(step.sql);
      results.push({ step: step.name, status: "ok" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({ step: step.name, status: "error", error: msg });
    }
  }

  const allOk = results.every((r) => r.status === "ok");
  return NextResponse.json({ success: allOk, results });
}
