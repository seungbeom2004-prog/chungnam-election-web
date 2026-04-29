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

type TimeRange = "1h" | "24h" | "7d" | "30d" | "all";

function getRangeStart(range: TimeRange): Date | null {
  const now = new Date();
  switch (range) {
    case "1h":  { const d = new Date(now); d.setHours(d.getHours() - 1); return d; }
    case "24h": { const d = new Date(now); d.setDate(d.getDate() - 1); return d; }
    case "7d":  { const d = new Date(now); d.setDate(d.getDate() - 7); return d; }
    case "30d": { const d = new Date(now); d.setDate(d.getDate() - 30); return d; }
    case "all": return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== "admin") {
      return apiError("관리자 권한이 필요합니다", 401);
    }

    const { searchParams } = new URL(request.url);
    const range = (searchParams.get("range") ?? "30d") as TimeRange;
    if (!["1h", "24h", "7d", "30d", "all"].includes(range)) {
      return apiError("유효하지 않은 기간입니다", 400);
    }

    const now = new Date();
    const rangeStart = getRangeStart(range);

    // For summary counts, always compute all time brackets regardless of selected range
    const hour24Start = new Date(now); hour24Start.setDate(hour24Start.getDate() - 1);
    const hour1Start  = new Date(now); hour1Start.setHours(hour1Start.getHours() - 1);
    const week7Start  = new Date(now); week7Start.setDate(week7Start.getDate() - 7);
    const month30Start = new Date(now); month30Start.setDate(month30Start.getDate() - 30);
    const todayStart  = new Date(now); todayStart.setHours(0, 0, 0, 0);

    type PageViewRow = { path: string; referrer: string | null; createdAt: string; city?: string | null };
    let rows: PageViewRow[] | null = null;
    let queryError: { code: string } | null = null;

    // Query for the selected range (or all time)
    const buildQuery = () => {
      let q = supabaseAdmin
        .from("PageView")
        .select("path, referrer, createdAt, city")
        .order("createdAt", { ascending: false })
        .limit(100000);
      if (rangeStart) q = q.gte("createdAt", rangeStart.toISOString());
      return q;
    };

    { const result = await buildQuery(); rows = result.data as PageViewRow[] | null; queryError = result.error as { code: string } | null; }

    // Fallback without city column
    if (queryError && ["42703", "PGRST200", "PGRST204"].includes(queryError.code)) {
      let q = supabaseAdmin
        .from("PageView")
        .select("path, referrer, createdAt")
        .order("createdAt", { ascending: false })
        .limit(100000);
      if (rangeStart) q = q.gte("createdAt", rangeStart.toISOString());
      const result = await q;
      rows = result.data as PageViewRow[] | null;
      queryError = result.error as { code: string } | null;
    }

    if (queryError) {
      if (["42P01", "42703"].includes(queryError.code)) {
        return NextResponse.json({
          success: true,
          data: {
            range,
            hourCount: 0, dayCount: 0, weekCount: 0, monthCount: 0, allCount: 0,
            periodCount: 0,
            dailyCounts: [], hourlyBuckets: [],
            topPages: [], topReferrers: [], cityDistribution: [],
            tableExists: false,
          },
        });
      }
      console.error("[analytics] query error:", queryError);
      return apiError("통계를 불러올 수 없습니다", 500);
    }

    const allRows = rows ?? [];

    // Accurate "all-time total" via HEAD count — Supabase row cap can truncate selects,
    // but count='exact' returns the true table count regardless.
    const { count: trueAllCount } = await supabaseAdmin
      .from("PageView")
      .select("*", { count: "exact", head: true });

    // Summary counts for all time brackets
    const hourCount  = allRows.filter((r) => new Date(r.createdAt) >= hour1Start).length;
    const dayCount   = allRows.filter((r) => new Date(r.createdAt) >= hour24Start).length;
    const weekCount  = allRows.filter((r) => new Date(r.createdAt) >= week7Start).length;
    const monthCount = allRows.filter((r) => new Date(r.createdAt) >= month30Start).length;
    const allCount   = trueAllCount ?? allRows.length;
    const periodCount = allRows.length;

    // Daily counts (last 30 days within the queried range)
    const daysToShow = range === "1h" || range === "24h" ? 2 : range === "7d" ? 7 : 30;
    const dailyMap: Record<string, number> = {};
    for (let i = 0; i < daysToShow; i++) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      dailyMap[d.toISOString().slice(0, 10)] = 0;
    }
    for (const r of allRows) {
      const key = new Date(r.createdAt).toISOString().slice(0, 10);
      if (key in dailyMap) dailyMap[key]!++;
    }
    const dailyCounts = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    // Hourly buckets for short ranges (1h, 24h)
    const hourlyBuckets: Array<{ hour: string; count: number }> = [];
    if (range === "1h" || range === "24h") {
      const bucketCount = range === "1h" ? 12 : 24; // 5-min or 1-hour buckets
      const bucketMs = range === "1h" ? 5 * 60 * 1000 : 60 * 60 * 1000;
      for (let i = 0; i < bucketCount; i++) {
        const bucketStart = new Date(now.getTime() - (bucketCount - i) * bucketMs);
        const bucketEnd   = new Date(now.getTime() - (bucketCount - i - 1) * bucketMs);
        const count = allRows.filter((r) => {
          const t = new Date(r.createdAt).getTime();
          return t >= bucketStart.getTime() && t < bucketEnd.getTime();
        }).length;
        const label = range === "1h"
          ? `${bucketStart.getHours()}:${String(bucketStart.getMinutes()).padStart(2, "0")}`
          : `${bucketStart.getHours()}시`;
        hourlyBuckets.push({ hour: label, count });
      }
    }

    // Top 10 pages
    const pageMap: Record<string, number> = {};
    for (const r of allRows) pageMap[r.path] = (pageMap[r.path] ?? 0) + 1;
    const topPages = Object.entries(pageMap)
      .sort(([, a], [, b]) => b - a).slice(0, 10)
      .map(([path, count]) => ({ path, count }));

    // Top 10 referrers
    const refMap: Record<string, number> = {};
    for (const r of allRows) {
      if (r.referrer) {
        try { const host = new URL(r.referrer).hostname; refMap[host] = (refMap[host] ?? 0) + 1; } catch { /* ignore */ }
      }
    }
    const topReferrers = Object.entries(refMap)
      .sort(([, a], [, b]) => b - a).slice(0, 10)
      .map(([referrer, count]) => ({ referrer, count }));

    // City distribution
    const cityMap: Record<string, number> = {};
    for (const r of allRows) {
      const c = r.city;
      if (c) cityMap[c] = (cityMap[c] ?? 0) + 1;
    }
    const cityDistribution = Object.entries(cityMap)
      .sort(([, a], [, b]) => b - a)
      .map(([city, count]) => ({ city, count }));

    return NextResponse.json({
      success: true,
      data: {
        range,
        hourCount, dayCount, weekCount, monthCount,
        allCount,
        periodCount,
        dailyCounts, hourlyBuckets,
        topPages, topReferrers, cityDistribution,
        tableExists: true,
      },
    });
  } catch (err) {
    console.error("[GET /api/admin/analytics]", err);
    return apiError("통계를 불러올 수 없습니다", 500);
  }
}
