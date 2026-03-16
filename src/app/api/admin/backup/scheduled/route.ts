/**
 * Scheduled backup endpoint.
 *
 * Called by Vercel Cron (or an external scheduler) with:
 *   POST /api/admin/backup/scheduled
 *   Authorization: Bearer <BACKUP_SECRET_KEY>
 *
 * Set BACKUP_SECRET_KEY in your environment variables.
 * Vercel cron does NOT support custom headers, so we also accept the secret
 * via the query param: ?secret=<BACKUP_SECRET_KEY>
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { apiError } from "@/lib/api-utils";

const TABLES_TO_BACKUP = [
  "Candidate",
  "Pledge",
  "PledgeCollaboration",
  "Category",
  "District",
  "Election",
  "ProposalPost",
  "PledgeProposal",
];

const BACKUP_BUCKET = "backups";

async function fetchAllRows(tableName: string): Promise<unknown[]> {
  const { data, error } = await supabaseAdmin.from(tableName).select("*").limit(10000);
  if (error) {
    console.error(`[scheduled-backup] fetch ${tableName} error:`, error.message);
    return [];
  }
  return data ?? [];
}

async function pruneOldBackups(): Promise<void> {
  const { data, error } = await supabaseAdmin.storage
    .from(BACKUP_BUCKET)
    .list("", { sortBy: { column: "created_at", order: "desc" } });
  if (error || !data) return;
  if (data.length <= 2) return;
  const toDelete = data.slice(2).map((f) => f.name);
  await supabaseAdmin.storage.from(BACKUP_BUCKET).remove(toDelete);
}

export async function POST(request: NextRequest) {
  try {
    const secret = process.env.BACKUP_SECRET_KEY;
    if (!secret) {
      console.error("[scheduled-backup] BACKUP_SECRET_KEY not configured");
      return apiError("서버 설정 오류", 500);
    }

    // Accept secret from Authorization header or query param (Vercel Cron workaround)
    const authHeader = request.headers.get("authorization") ?? "";
    const querySecret = new URL(request.url).searchParams.get("secret") ?? "";
    const provided = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : querySecret;

    if (provided !== secret) {
      return apiError("인증 실패", 401);
    }

    // Create backup
    const snapshot: Record<string, unknown[]> = {};
    for (const table of TABLES_TO_BACKUP) {
      snapshot[table] = await fetchAllRows(table);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `backup-${timestamp}.json`;
    const content = JSON.stringify({ createdAt: new Date().toISOString(), tables: snapshot }, null, 2);
    const bytes = Buffer.from(content, "utf-8");

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BACKUP_BUCKET)
      .upload(filename, bytes, { contentType: "application/json", upsert: false });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    await pruneOldBackups();

    console.log(`[scheduled-backup] created ${filename} (${bytes.byteLength} bytes)`);
    return NextResponse.json({ success: true, data: { filename, sizeBytes: bytes.byteLength } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "백업 실패";
    console.error("[POST /api/admin/backup/scheduled]", err);
    return apiError(msg, 500);
  }
}
