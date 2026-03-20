import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-utils";

/**
 * One-time migration endpoint.
 * Call: POST /api/admin/migrate  body: { "secret": "<ADMIN_SECRET>", "version": "v11" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (body.secret !== process.env.ADMIN_SECRET) {
      return apiError("Unauthorized", 401);
    }

    const version = body.version ?? "v11";

    // Try using pg directly
    const { Client } = await import("pg");
    const dbUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
    if (!dbUrl) return apiError("DATABASE_URL not set", 500);

    const client = new Client({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 15000,
    });

    await client.connect();

    if (version === "v11" || version === "all") {
      await client.query(`
        -- ProposalPost v10 columns
        ALTER TABLE "ProposalPost"
          ADD COLUMN IF NOT EXISTS "title"        text    NOT NULL DEFAULT '',
          ADD COLUMN IF NOT EXISTS "passwordHash" text,
          ADD COLUMN IF NOT EXISTS "latitude"     float8,
          ADD COLUMN IF NOT EXISTS "longitude"    float8;
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS "PledgeLike" (
          "id"        text        NOT NULL DEFAULT gen_random_uuid()::text,
          "pledgeId"  text        NOT NULL REFERENCES "Pledge"("id") ON DELETE CASCADE,
          "ipHash"    text        NOT NULL,
          "createdAt" timestamptz NOT NULL DEFAULT now(),
          PRIMARY KEY ("id"),
          UNIQUE      ("pledgeId", "ipHash")
        );
        CREATE INDEX IF NOT EXISTS "PledgeLike_pledgeId_idx" ON "PledgeLike"("pledgeId");
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS "PledgeComment" (
          "id"           text        NOT NULL DEFAULT gen_random_uuid()::text,
          "pledgeId"     text        NOT NULL REFERENCES "Pledge"("id") ON DELETE CASCADE,
          "content"      text        NOT NULL,
          "authorName"   text        NOT NULL,
          "passwordHash" text        NOT NULL,
          "ipHash"       text        NOT NULL,
          "status"       text        NOT NULL DEFAULT 'visible',
          "deletedAt"    timestamptz,
          "createdAt"    timestamptz NOT NULL DEFAULT now(),
          PRIMARY KEY ("id")
        );
        CREATE INDEX IF NOT EXISTS "PledgeComment_pledgeId_idx"        ON "PledgeComment"("pledgeId");
        CREATE INDEX IF NOT EXISTS "PledgeComment_status_idx"          ON "PledgeComment"("status");
        CREATE INDEX IF NOT EXISTS "PledgeComment_pledgeId_status_idx" ON "PledgeComment"("pledgeId", "status");
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS "Notification" (
          "id"        text        NOT NULL DEFAULT gen_random_uuid()::text,
          "targetId"  text,
          "senderId"  text        NOT NULL,
          "title"     text        NOT NULL,
          "message"   text        NOT NULL,
          "level"     text        NOT NULL DEFAULT 'info',
          "isRead"    boolean     NOT NULL DEFAULT false,
          "readAt"    timestamptz,
          "createdAt" timestamptz NOT NULL DEFAULT now(),
          PRIMARY KEY ("id")
        );
        CREATE INDEX IF NOT EXISTS "Notification_targetId_idx"  ON "Notification"("targetId");
        CREATE INDEX IF NOT EXISTS "Notification_senderId_idx"  ON "Notification"("senderId");
        CREATE INDEX IF NOT EXISTS "Notification_createdAt_idx" ON "Notification"("createdAt" DESC);
      `);
    }

    if (version === "v14" || version === "all") {
      // PledgeProposal Git 구조 전환
      await client.query(`
        ALTER TABLE "PledgeProposal"
          ADD COLUMN IF NOT EXISTS "mergedAt"       TIMESTAMPTZ,
          ADD COLUMN IF NOT EXISTS "mergedBy"       TEXT,
          ADD COLUMN IF NOT EXISTS "mergedPledgeId" TEXT;
      `);
      await client.query(`
        CREATE TABLE IF NOT EXISTS "PledgeProposalRevision" (
          "id"               TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
          "pledgeProposalId" TEXT        NOT NULL REFERENCES "PledgeProposal"("id") ON DELETE CASCADE,
          "revisionNumber"   INT         NOT NULL,
          "title"            TEXT        NOT NULL,
          "content"          TEXT        NOT NULL,
          "authorName"       TEXT        NOT NULL,
          "authorType"       TEXT        NOT NULL DEFAULT 'visitor',
          "candidateId"      TEXT,
          "ipHash"           TEXT,
          "commitMessage"    TEXT,
          "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE ("pledgeProposalId", "revisionNumber")
        );
        CREATE INDEX IF NOT EXISTS "PPRevision_proposalId_idx" ON "PledgeProposalRevision"("pledgeProposalId");
      `);
      await client.query(`
        CREATE TABLE IF NOT EXISTS "PledgeProposalComment" (
          "id"               TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
          "pledgeProposalId" TEXT        NOT NULL REFERENCES "PledgeProposal"("id") ON DELETE CASCADE,
          "content"          TEXT        NOT NULL,
          "authorName"       TEXT        NOT NULL,
          "authorType"       TEXT        NOT NULL DEFAULT 'visitor',
          "candidateId"      TEXT,
          "ipHash"           TEXT,
          "passwordHash"     TEXT,
          "status"           TEXT        NOT NULL DEFAULT 'visible',
          "deletedAt"        TIMESTAMPTZ,
          "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS "PPComment_proposalId_idx" ON "PledgeProposalComment"("pledgeProposalId");
      `);
      // 기존 PledgeProposal → Revision #1 마이그레이션 (멱등)
      await client.query(`
        INSERT INTO "PledgeProposalRevision" (
          "id", "pledgeProposalId", "revisionNumber", "title", "content",
          "authorName", "authorType", "candidateId", "ipHash", "commitMessage", "createdAt"
        )
        SELECT gen_random_uuid()::text, pp."id", 1,
          pp."title", pp."content", pp."authorName", pp."authorType",
          pp."candidateId", pp."ipHash", '초기 제안 (마이그레이션)', pp."createdAt"
        FROM "PledgeProposal" pp
        WHERE NOT EXISTS (
          SELECT 1 FROM "PledgeProposalRevision" r
          WHERE r."pledgeProposalId" = pp."id" AND r."revisionNumber" = 1
        );
      `);
      await client.query(`
        UPDATE "PledgeProposal"
        SET "mergedAt" = "createdAt"
        WHERE "status" = 'accepted' AND "mergedAt" IS NULL;
      `);
    }

    await client.end();
    return apiSuccess({ message: `Migration ${version} applied successfully` });
  } catch (error) {
    console.error("[migrate]", error);
    return apiError(`Migration failed: ${error instanceof Error ? error.message : String(error)}`, 500);
  }
}
