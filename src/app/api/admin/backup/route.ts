import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { apiError } from "@/lib/api-utils";

const BACKUP_BUCKET = "backups";
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function fetchAllRows(tableName: string): Promise<unknown[]> {
  const { data, error } = await supabaseAdmin
    .from(tableName)
    .select("*")
    .limit(10000);
  if (error) {
    console.error(`[backup] failed to fetch ${tableName}:`, error.message);
    return [];
  }
  return data ?? [];
}

async function createBackup(): Promise<{ filename: string; sizeBytes: number }> {
  // Fetch all tables
  const snapshot: Record<string, unknown[]> = {};
  for (const table of TABLES_TO_BACKUP) {
    snapshot[table] = await fetchAllRows(table);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `backup-${timestamp}.json`;
  const content = JSON.stringify({ createdAt: new Date().toISOString(), tables: snapshot }, null, 2);
  const bytes = Buffer.from(content, "utf-8");

  // Upload to Supabase Storage
  const { error: uploadError } = await supabaseAdmin.storage
    .from(BACKUP_BUCKET)
    .upload(filename, bytes, { contentType: "application/json", upsert: false });

  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  return { filename, sizeBytes: bytes.byteLength };
}

async function listBackups(): Promise<Array<{ filename: string; createdAt: string; sizeBytes: number }>> {
  const { data, error } = await supabaseAdmin.storage
    .from(BACKUP_BUCKET)
    .list("", { sortBy: { column: "created_at", order: "desc" } });

  if (error) {
    // Bucket might not exist yet
    console.warn("[backup] list error:", error.message);
    return [];
  }

  return (data ?? []).map((f) => ({
    filename: f.name,
    createdAt: f.created_at ?? "",
    sizeBytes: f.metadata?.size ?? 0,
  }));
}

async function pruneOldBackups(): Promise<void> {
  const backups = await listBackups();
  // Keep the 2 most recent, delete the rest
  if (backups.length <= 2) return;
  const toDelete = backups.slice(2).map((b) => b.filename);
  const { error } = await supabaseAdmin.storage.from(BACKUP_BUCKET).remove(toDelete);
  if (error) {
    console.warn("[backup] prune error:", error.message);
  }
}

async function restoreBackup(filename: string): Promise<void> {
  const { data, error } = await supabaseAdmin.storage
    .from(BACKUP_BUCKET)
    .download(filename);

  if (error || !data) {
    throw new Error(`Download failed: ${error?.message ?? "no data"}`);
  }

  const text = await data.text();
  const parsed = JSON.parse(text) as { tables?: Record<string, unknown[]> };
  if (!parsed.tables) throw new Error("Invalid backup format");

  for (const table of TABLES_TO_BACKUP) {
    const rows = parsed.tables[table];
    if (!rows || rows.length === 0) continue;
    const { error: upsertError } = await supabaseAdmin
      .from(table)
      .upsert(rows as Record<string, unknown>[], { onConflict: "id" });
    if (upsertError) {
      console.error(`[restore] upsert ${table} error:`, upsertError.message);
    }
  }
}

// ─── Route handlers ────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== "admin") {
      return apiError("관리자 권한이 필요합니다", 401);
    }

    const backups = await listBackups();
    return NextResponse.json({ success: true, data: backups });
  } catch (err) {
    console.error("[GET /api/admin/backup]", err);
    return apiError("백업 목록을 불러올 수 없습니다", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== "admin") {
      return apiError("관리자 권한이 필요합니다", 401);
    }

    const body = await request.json().catch(() => ({}));
    const action: string = body.action ?? "";

    if (action === "create") {
      const result = await createBackup();
      await pruneOldBackups();
      return NextResponse.json({
        success: true,
        data: { message: "백업이 생성되었습니다", ...result },
      });
    }

    if (action === "restore") {
      const filename: string = body.filename ?? "";
      if (!filename) return apiError("filename이 필요합니다", 400);
      // Basic path traversal guard
      if (filename.includes("/") || filename.includes("..")) {
        return apiError("잘못된 파일 이름입니다", 400);
      }
      await restoreBackup(filename);
      return NextResponse.json({ success: true, data: { message: "복구가 완료되었습니다" } });
    }

    return apiError("action이 필요합니다 (create | restore)", 400);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "백업 작업 실패";
    console.error("[POST /api/admin/backup]", err);
    return apiError(msg, 500);
  }
}
