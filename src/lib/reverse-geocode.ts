/**
 * Naver Maps Reverse Geocoding — admin-dong (행정동) + legal-dong (법정동) lookup.
 *
 * Returns: { admDong, legalDong, formatted }
 *   - admDong: 행정동 이름 (예: "봉명1동")
 *   - legalDong: 법정동 이름 (예: "봉명동")
 *   - formatted: 사용자 표시용 — 같으면 "봉명동", 다르면 "봉명1동 (봉명동)"
 *
 * Uses in-memory cache keyed on rounded lat/lng (~10m precision) so we don't
 * burn API quota re-querying the same point.
 */

const cache = new Map<string, { admDong: string | null; legalDong: string | null; formatted: string | null; expires: number }>();
const TTL_MS = 24 * 60 * 60 * 1000; // 24h

function cacheKey(lat: number, lng: number) {
  // ~10m precision, plenty for a dong-level result
  return `${lat.toFixed(4)},${lng.toFixed(4)}`;
}

export async function reverseGeocodeDong(lat: number, lng: number): Promise<{
  admDong: string | null;
  legalDong: string | null;
  formatted: string | null;
}> {
  if (typeof lat !== "number" || typeof lng !== "number" || !isFinite(lat) || !isFinite(lng)) {
    return { admDong: null, legalDong: null, formatted: null };
  }

  const key = cacheKey(lat, lng);
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && cached.expires > now) {
    return { admDong: cached.admDong, legalDong: cached.legalDong, formatted: cached.formatted };
  }

  const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;
  const clientSecret = process.env.NAVER_MAP_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return { admDong: null, legalDong: null, formatted: null };
  }

  try {
    // 신 endpoint (maps.apigw.ntruss.com) — 구 endpoint(naveropenapi)는 별도 구독 필요해서 Permission Denied.
    const url = `https://maps.apigw.ntruss.com/map-reversegeocode/v2/gc?coords=${lng},${lat}&orders=legalcode,admcode&output=json`;
    const res = await fetch(url, {
      headers: {
        "x-ncp-apigw-api-key-id": clientId,
        "x-ncp-apigw-api-key": clientSecret,
      },
      // Short-lived: use Next's fetch cache to dedupe in-flight requests
      next: { revalidate: 86400 },
    });
    if (!res.ok) {
      return { admDong: null, legalDong: null, formatted: null };
    }
    const data = await res.json();
    type Region = { area3?: { name?: string } };
    type Result = { name?: string; region?: Region };
    const results = (data?.results ?? []) as Result[];
    const legal = results.find((r) => r.name === "legalcode");
    const adm   = results.find((r) => r.name === "admcode");
    const legalDong: string | null = legal?.region?.area3?.name?.trim() || null;
    const admDong: string | null   = adm?.region?.area3?.name?.trim()   || null;

    let formatted: string | null = null;
    if (admDong && legalDong) {
      formatted = admDong === legalDong ? admDong : `${admDong} (${legalDong})`;
    } else {
      formatted = admDong ?? legalDong ?? null;
    }

    cache.set(key, { admDong, legalDong, formatted, expires: now + TTL_MS });
    return { admDong, legalDong, formatted };
  } catch {
    return { admDong: null, legalDong: null, formatted: null };
  }
}
