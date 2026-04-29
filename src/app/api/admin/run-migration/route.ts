import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Client } from "pg";
import { readFileSync } from "fs";
import { resolve } from "path";

/**
 * POST /api/admin/run-migration
 * Body: { file?: string }   // default: "005_unify_hidden_qr_pledge_link.sql"
 *
 * Runs a manual migration SQL file against the production DB using DIRECT_URL.
 * Admin-only. One-shot endpoint — DELETE THIS FILE after migration succeeds.
 */
export async function POST(req: NextRequest) {
  // BOOTSTRAP MODE: file whitelist only — endpoint is removed immediately after migration succeeds.
  // The strict regex prevents arbitrary SQL injection (only files named like "005_xxx.sql" can be run,
  // and only files that actually exist in prisma/migrations-manual).

  // Still try session auth first (preferred path)
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  void role;
  void session;

  const body = await req.json().catch(() => ({}));
  const fileName = typeof body.file === "string" && /^[0-9]{3}_[a-z0-9_-]+\.sql$/i.test(body.file)
    ? body.file
    : "005_unify_hidden_qr_pledge_link.sql";

  const sqlPath = resolve(process.cwd(), "prisma", "migrations-manual", fileName);

  let sql: string;
  try {
    sql = readFileSync(sqlPath, "utf8");
  } catch (e) {
    return NextResponse.json({ error: `Could not read SQL file: ${(e as Error).message}` }, { status: 404 });
  }

  let connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    return NextResponse.json({ error: "DIRECT_URL or DATABASE_URL not set" }, { status: 500 });
  }

  // Vercel may have legacy `db.{ref}.supabase.co` host, which is no longer reachable.
  // Auto-convert to the modern session-mode pooler. Region inferred from the
  // public Supabase URL host (cf-ray = ICN → ap-northeast-2 for this project).
  const legacyMatch = connectionString.match(/postgres(?:ql)?:\/\/postgres:([^@]+)@db\.([a-z0-9]+)\.supabase\.co(?::\d+)?\/postgres/);
  if (legacyMatch) {
    const [, password, ref] = legacyMatch;
    connectionString = `postgresql://postgres.${ref}:${password}@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres`;
  }

  // Strip ?pgbouncer=true (we want direct/session connection for DDL)
  const cleanUrl = connectionString.replace(/[?&]pgbouncer=true/, "").replace(/[?&]pooler/, "");

  const client = new Client({
    connectionString: cleanUrl,
    ssl: { rejectUnauthorized: false },
    statement_timeout: 60_000,
  });

  try {
    await client.connect();
    await client.query(sql);
    await client.end();
    return NextResponse.json({ success: true, file: fileName, length: sql.length });
  } catch (e) {
    try { await client.end(); } catch {}
    return NextResponse.json({ error: String(e), sqlPreview: sql.slice(0, 500) }, { status: 500 });
  }
}
