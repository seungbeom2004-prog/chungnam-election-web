import { NextRequest, NextResponse } from "next/server";

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

  const BUILD_VERSION = "v4-pg-meta";
  const projectRef = "cuokeqrlkbczbwhidtjn";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!serviceRoleKey) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY not set", version: BUILD_VERSION }, { status: 500 });
  }

  const results: { method: string; status: number | string; body: unknown }[] = [];

  // SQL to run in multiple statements (pg-meta handles one at a time)
  const statements = [
    `CREATE TABLE IF NOT EXISTS "StatsCache" ("id" UUID DEFAULT gen_random_uuid() PRIMARY KEY, "cacheKey" TEXT NOT NULL UNIQUE, "data" JSONB NOT NULL, "createdAt" TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE INDEX IF NOT EXISTS idx_stats_cache_key ON "StatsCache" ("cacheKey")`,
    `ALTER TABLE "StatsCache" ENABLE ROW LEVEL SECURITY`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'StatsCache' AND policyname = 'Allow read for all') THEN CREATE POLICY "Allow read for all" ON "StatsCache" FOR SELECT USING (true); END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'StatsCache' AND policyname = 'Allow insert/update for service role') THEN CREATE POLICY "Allow insert/update for service role" ON "StatsCache" FOR ALL USING (true); END IF; END $$`,
  ];

  for (const stmt of statements) {
    try {
      // pg-meta query endpoint — requires service_role key
      const res = await fetch(
        `https://${projectRef}.supabase.co/pg-meta/v0/query`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${serviceRoleKey}`,
            "X-Connection-Encrypted": "AAAA", // pg-meta expects this header
          },
          body: JSON.stringify({ query: stmt }),
        }
      );
      let body: unknown;
      try { body = await res.json(); } catch { body = await res.text(); }
      results.push({ method: "pg-meta", status: res.status, body });
      if (!res.ok) break; // stop on first error
    } catch (e) {
      results.push({ method: "pg-meta", status: "fetch-error", body: String(e) });
      break;
    }
  }

  const allOk = results.every((r) => r.status === 200 || r.status === 201);
  return NextResponse.json({ success: allOk, version: BUILD_VERSION, results });
}
