import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const checks: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    env: {
      SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? "set" : "missing",
      SUPABASE_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "set" : "missing",
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? "set" : "missing",
    },
  };

  try {
    // Count records via Supabase REST API
    const [districts, candidates, pledges] = await Promise.all([
      supabase.from("District").select("id", { count: "exact", head: true }),
      supabase.from("Candidate").select("id", { count: "exact", head: true }),
      supabase.from("Pledge").select("id", { count: "exact", head: true }),
    ]);

    if (districts.error || candidates.error || pledges.error) {
      const err = districts.error || candidates.error || pledges.error;
      checks.database = { connected: false, error: err?.message };
      checks.status = "unhealthy";
      return NextResponse.json(checks, { status: 500 });
    }

    checks.database = { connected: true };
    checks.counts = {
      districts: districts.count ?? 0,
      candidates: candidates.count ?? 0,
      pledges: pledges.count ?? 0,
    };
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
