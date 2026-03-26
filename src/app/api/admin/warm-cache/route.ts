import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // 60s for Vercel

function getMondayOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/**
 * Admin endpoint to pre-populate StatsCache for all weeks/days
 * from 2026-03-01 to now.
 *
 * Call from admin dashboard:
 *   POST /api/admin/warm-cache
 *   Header: x-admin-secret: <ADMIN_SECRET>
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-admin-secret");
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const baseUrl = process.env.NEXTAUTH_URL?.replace(/\/$/, "") || "https://reform-chungnam.kr";
  const results: { key: string; status: string }[] = [];

  // ── Weekly cache: from 2026-02-23 (monday of 2026-03-01 week) to current week ─
  const MIN_MONDAY = getMondayOfWeek(new Date("2026-03-01"));
  const currentMonday = getMondayOfWeek(new Date());

  let weekStart = new Date(MIN_MONDAY);
  while (weekStart < currentMonday) {
    const weekStartStr = weekStart.toISOString().split("T")[0];
    try {
      const res = await fetch(`${baseUrl}/api/issues/weekly-stats?weekStart=${weekStartStr}`, {
        next: { revalidate: 0 },
      });
      results.push({
        key: `weekly-${weekStartStr}`,
        status: res.ok ? "ok" : `http-${res.status}`,
      });
    } catch (e) {
      results.push({ key: `weekly-${weekStartStr}`, status: `error: ${e}` });
    }
    weekStart = addDays(weekStart, 7);
    // Small delay to avoid rate limiting
    await new Promise((r) => setTimeout(r, 200));
  }

  // ── Daily cache: from 2026-03-01 to yesterday ────────────────────────────────
  const minDay = new Date("2026-03-01T00:00:00");
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(23, 59, 59, 999);

  let day = new Date(minDay);
  while (day <= yesterday) {
    const dayStr = day.toISOString().split("T")[0];
    const nextDay = addDays(day, 1);
    try {
      // Warm both postType queries that the stats page uses
      const [rRes, pRes] = await Promise.all([
        fetch(
          `${baseUrl}/api/proposals?limit=200&postType=민원&since=${day.toISOString()}&until=${nextDay.toISOString()}&sort=popular`,
          { next: { revalidate: 0 } }
        ),
        fetch(
          `${baseUrl}/api/proposals?limit=200&postType=제안&since=${day.toISOString()}&until=${nextDay.toISOString()}&sort=popular`,
          { next: { revalidate: 0 } }
        ),
      ]);
      results.push({
        key: `daily-${dayStr}`,
        status: rRes.ok && pRes.ok ? "ok" : `http-${rRes.status}/${pRes.status}`,
      });
    } catch (e) {
      results.push({ key: `daily-${dayStr}`, status: `error: ${e}` });
    }
    day = addDays(day, 1);
    await new Promise((r) => setTimeout(r, 100));
  }

  const ok = results.filter((r) => r.status === "ok").length;
  return NextResponse.json({
    success: true,
    total: results.length,
    ok,
    failed: results.length - ok,
    results,
  });
}
