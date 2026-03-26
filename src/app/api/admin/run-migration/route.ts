import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * One-time migration endpoint — creates StatsCache table via Supabase Management API.
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

  const BUILD_VERSION = "v3-management-api";
  const projectRef = "cuokeqrlkbczbwhidtjn";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!serviceRoleKey) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY not set", version: BUILD_VERSION }, { status: 500 });
  }

  // Full SQL to create StatsCache table with all policies
  const sql = `
    CREATE TABLE IF NOT EXISTS "StatsCache" (
      "id"        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      "cacheKey"  TEXT NOT NULL UNIQUE,
      "data"      JSONB NOT NULL,
      "createdAt" TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_stats_cache_key ON "StatsCache" ("cacheKey");

    ALTER TABLE "StatsCache" ENABLE ROW LEVEL SECURITY;

    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'StatsCache' AND policyname = 'Allow read for all'
      ) THEN
        CREATE POLICY "Allow read for all" ON "StatsCache" FOR SELECT USING (true);
      END IF;
    END $$;

    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'StatsCache' AND policyname = 'Allow insert/update for service role'
      ) THEN
        CREATE POLICY "Allow insert/update for service role" ON "StatsCache" FOR ALL USING (true);
      END IF;
    END $$;
  `;

  // Try Supabase Management API
  const mgmtRes = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ query: sql }),
    }
  );

  const mgmtText = await mgmtRes.text();
  let mgmtJson: unknown;
  try { mgmtJson = JSON.parse(mgmtText); } catch { mgmtJson = mgmtText; }

  if (mgmtRes.ok) {
    return NextResponse.json({ success: true, method: "management-api", result: mgmtJson });
  }

  // Fallback: try direct REST SQL via supabase (experimental)
  const restRes = await fetch(
    `https://${projectRef}.supabase.co/rest/v1/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceRoleKey}`,
        "apikey": serviceRoleKey,
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({ query: sql }),
    }
  );
  const restText = await restRes.text();

  return NextResponse.json({
    success: false,
    managementApiStatus: mgmtRes.status,
    managementApiError: mgmtJson,
    restStatus: restRes.status,
    restError: restText,
    serviceKeyLength: serviceRoleKey.length,
  });
}
