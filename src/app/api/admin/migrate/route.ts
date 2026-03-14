import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-utils";

/**
 * One-time migration endpoint.
 * Call: POST /api/admin/migrate  body: { "secret": "<ADMIN_SECRET>" }
 * Requires SUPABASE_SERVICE_ROLE_KEY to be set and a direct DB URL.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (body.secret !== process.env.ADMIN_SECRET) {
      return apiError("Unauthorized", 401);
    }

    // Try using pg directly
    const { Client } = await import("pg");
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) return apiError("DATABASE_URL not set", 500);

    const client = new Client({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
    });

    await client.connect();
    await client.query(`
      ALTER TABLE "Pledge"
        ADD COLUMN IF NOT EXISTS "bylawTagged" boolean NOT NULL DEFAULT false;
      ALTER TABLE "Pledge"
        ADD COLUMN IF NOT EXISTS "relatedPledgeId" uuid REFERENCES "Pledge"(id) ON DELETE SET NULL;
      CREATE INDEX IF NOT EXISTS "Pledge_bylawTagged_idx" ON "Pledge"("bylawTagged") WHERE "bylawTagged" = true;
    `);
    await client.end();

    return apiSuccess({ message: "Migration v5 applied successfully" });
  } catch (error) {
    console.error("[migrate]", error);
    return apiError(`Migration failed: ${error instanceof Error ? error.message : String(error)}`, 500);
  }
}
