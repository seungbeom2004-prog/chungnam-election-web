/*
  PageView table — run this in the Supabase SQL editor if you haven't already:

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

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { apiError } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  try {
    // Auth guard — admin only
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== "admin") {
      return apiError("관리자 권한이 필요합니다", 401);
    }

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);

    const monthStart = new Date(now);
    monthStart.setDate(monthStart.getDate() - 30);

    // Fetch last 30 days of page views — try with city column first
    type PageViewRow = { path: string; referrer: string | null; createdAt: string; city?: string | null };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let rows: PageViewRow[] | null = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let queryError: any = null;

    {
      const result = await supabaseAdmin
        .from("PageView")
        .select("path, referrer, createdAt, city")
        .gte("createdAt", monthStart.toISOString())
        .order("createdAt", { ascending: false })
        .limit(50000);
      rows = result.data as PageViewRow[] | null;
      queryError = result.error;
    }

    // Fallback: city column might not exist yet
    if (queryError && (queryError.code === "42703" || queryError.code === "PGRST200" || queryError.code === "PGRST204")) {
      const result = await supabaseAdmin
        .from("PageView")
        .select("path, referrer, createdAt")
        .gte("createdAt", monthStart.toISOString())
        .order("createdAt", { ascending: false })
        .limit(50000);
      rows = result.data as PageViewRow[] | null;
      queryError = result.error;
    }

    const error = queryError;
    if (error) {
      // Table might not exist yet — return empty data gracefully
      if (error.code === "42P01" || error.code === "42703") {
        return NextResponse.json({
          success: true,
          data: {
            todayCount: 0,
            weekCount: 0,
            monthCount: 0,
            dailyCounts: [],
            topPages: [],
            topReferrers: [],
            tableExists: false,
          },
        });
      }
      console.error("[analytics] query error:", error);
      return apiError("통계를 불러올 수 없습니다", 500);
    }

    const allRows = rows ?? [];

    // Counts
    const todayCount = allRows.filter((r) => new Date(r.createdAt) >= todayStart).length;
    const weekCount = allRows.filter((r) => new Date(r.createdAt) >= weekStart).length;
    const monthCount = allRows.length;

    // Daily counts (last 30 days)
    const dailyMap: Record<string, number> = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dailyMap[key] = 0;
    }
    for (const r of allRows) {
      const key = new Date(r.createdAt).toISOString().slice(0, 10);
      if (key in dailyMap) dailyMap[key]!++;
    }
    const dailyCounts = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    // Top 10 pages
    const pageMap: Record<string, number> = {};
    for (const r of allRows) {
      pageMap[r.path] = (pageMap[r.path] ?? 0) + 1;
    }
    const topPages = Object.entries(pageMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([path, count]) => ({ path, count }));

    // Top 10 referrers (ignore null/empty)
    const refMap: Record<string, number> = {};
    for (const r of allRows) {
      if (r.referrer) {
        try {
          const host = new URL(r.referrer).hostname;
          refMap[host] = (refMap[host] ?? 0) + 1;
        } catch {
          // ignore malformed URLs
        }
      }
    }
    const topReferrers = Object.entries(refMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([referrer, count]) => ({ referrer, count }));

    // City distribution (visitors who interacted with the map)
    const cityMap: Record<string, number> = {};
    for (const r of allRows) {
      const c = (r as { city?: string | null }).city;
      if (c) cityMap[c] = (cityMap[c] ?? 0) + 1;
    }
    const cityDistribution = Object.entries(cityMap)
      .sort(([, a], [, b]) => b - a)
      .map(([city, count]) => ({ city, count }));

    return NextResponse.json({
      success: true,
      data: {
        todayCount,
        weekCount,
        monthCount,
        dailyCounts,
        topPages,
        topReferrers,
        cityDistribution,
        tableExists: true,
      },
    });
  } catch (err) {
    console.error("[GET /api/admin/analytics]", err);
    return apiError("통계를 불러올 수 없습니다", 500);
  }
}
