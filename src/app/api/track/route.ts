import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/*
  PageView table — run this in the Supabase SQL editor before using this route:

  CREATE TABLE IF NOT EXISTS "PageView" (
    id          BIGSERIAL PRIMARY KEY,
    path        TEXT        NOT NULL,
    "ipHash"    TEXT        NOT NULL,
    referrer    TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS "PageView_createdAt_idx" ON "PageView" ("createdAt" DESC);
  CREATE INDEX IF NOT EXISTS "PageView_path_idx"      ON "PageView" (path);
*/

export async function POST(request: NextRequest) {
  // Fire-and-forget: respond immediately regardless of DB outcome
  try {
    const body = await request.json().catch(() => ({}));
    const path: string = typeof body.path === "string" ? body.path.slice(0, 500) : "/";
    const referrer: string | null = typeof body.referrer === "string" ? body.referrer.slice(0, 500) : null;
    const city: string | null = typeof body.city === "string" ? body.city.slice(0, 50) : null;

    // Hash IP for privacy
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const ipHash = createHash("sha256").update(ip + (process.env.NEXTAUTH_SECRET ?? "salt")).digest("hex").slice(0, 16);

    // Non-blocking insert — try with city column, fall back without
    supabaseAdmin
      .from("PageView")
      .insert({ path, ipHash, referrer, city, createdAt: new Date().toISOString() })
      .then(({ error }) => {
        if (error) {
          if (error.code === "42703" || error.code === "PGRST204") {
            // city column doesn't exist yet — retry without it
            supabaseAdmin
              .from("PageView")
              .insert({ path, ipHash, referrer, createdAt: new Date().toISOString() })
              .then(({ error: e2 }) => { if (e2) console.error("[track] insert error:", e2.message); });
          } else {
            console.error("[track] insert error:", error.message);
          }
        }
      });
  } catch (err) {
    console.error("[track] error:", err);
  }

  return new NextResponse(null, { status: 204 });
}
