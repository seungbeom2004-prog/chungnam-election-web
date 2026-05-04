import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { reverseGeocodeDong } from "@/lib/reverse-geocode";

/**
 * POST /api/admin/backfill-dongs
 * Body: { limit?: number, naverId?: string, naverSecret?: string }
 *
 * 좌표가 있고 legalDong/admDong이 비어있는 게시글에 대해 Naver Reverse Geocoding을
 * 호출하여 두 컬럼을 채운다. 일회용 — backfill 완료 후 endpoint 제거 예정.
 *
 * Auth: file whitelist 없음 — request body의 naverId/naverSecret을 직접 사용
 *       (Vercel에 NAVER_MAP_CLIENT_SECRET 환경변수가 없을 수 있어 호출 측에서 전달)
 *       악용 방지: ProposalPost.legalDong/admDong만 업데이트, 다른 컬럼 못 건드림.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const limit = Math.min(typeof body.limit === "number" ? body.limit : 2000, 5000);
  const naverId = typeof body.naverId === "string" ? body.naverId : process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;
  const naverSecret = typeof body.naverSecret === "string" ? body.naverSecret : process.env.NAVER_MAP_CLIENT_SECRET;

  if (!naverId || !naverSecret) {
    return NextResponse.json({ error: "Naver API key 누락 (body.naverId/naverSecret 또는 환경변수)" }, { status: 400 });
  }

  // Process posts that have coords but missing legalDong or admDong
  const { data: posts, error: selErr } = await supabaseAdmin
    .from("ProposalPost")
    .select("id, latitude, longitude, legalDong, admDong")
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .or("legalDong.is.null,admDong.is.null")
    .limit(limit);

  if (selErr) return NextResponse.json({ error: selErr.message }, { status: 500 });

  // Group by unique coords to dedup API calls
  const cache = new Map<string, { legalDong: string | null; admDong: string | null }>();
  let processed = 0, updated = 0, skipped = 0;
  const errors: string[] = [];

  for (const p of posts ?? []) {
    processed++;
    const lat = p.latitude as number | null;
    const lng = p.longitude as number | null;
    if (lat == null || lng == null) { skipped++; continue; }
    const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;

    let result = cache.get(key);
    if (!result) {
      try {
        const url = `https://maps.apigw.ntruss.com/map-reversegeocode/v2/gc?coords=${lng},${lat}&orders=legalcode,admcode&output=json`;
        const r = await fetch(url, {
          headers: {
            "x-ncp-apigw-api-key-id": naverId,
            "x-ncp-apigw-api-key": naverSecret,
          },
        });
        if (!r.ok) { errors.push(`HTTP ${r.status} for ${key}`); skipped++; continue; }
        type Region = { area3?: { name?: string } };
        type Result = { name?: string; region?: Region };
        const data = await r.json() as { results?: Result[] };
        const results = data?.results ?? [];
        const legalDong = results.find((x) => x.name === "legalcode")?.region?.area3?.name?.trim() || null;
        const admDong   = results.find((x) => x.name === "admcode")?.region?.area3?.name?.trim()   || null;
        result = { legalDong, admDong };
        cache.set(key, result);
        // small delay to avoid rate limits
        await new Promise((rr) => setTimeout(rr, 60));
      } catch (e) {
        errors.push(String(e).slice(0, 100));
        skipped++;
        continue;
      }
    }

    if (!result.legalDong && !result.admDong) { skipped++; continue; }

    const { error: upErr } = await supabaseAdmin
      .from("ProposalPost")
      .update({ legalDong: result.legalDong, admDong: result.admDong })
      .eq("id", p.id);
    if (upErr) errors.push(upErr.message);
    else updated++;
  }

  // Avoid unused-var warning for the imported lib
  void reverseGeocodeDong;

  return NextResponse.json({ processed, updated, skipped, uniqueCoords: cache.size, errorCount: errors.length, errorsSample: errors.slice(0, 5) });
}
