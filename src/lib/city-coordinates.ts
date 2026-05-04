/**
 * 충청남도 시·군청 좌표.
 *
 * 게시글에 위치를 따로 안 찍고 기본값으로 시·군청 좌표가 들어간 경우를 감지하기 위함.
 * 좌표가 시·군청에서 ~600m 이내이면 "OO시 전체"로 표시 (특정 읍면동이 아니라 전 지역 단위).
 */

export const CITY_HALL_COORDS: Record<string, { lat: number; lng: number }> = {
  // 천안 — 동남구청·서북구청 동시 매칭 위해 시청 좌표 사용
  "천안시": { lat: 36.8151, lng: 127.1138 },
  "천안시 동남구": { lat: 36.8094, lng: 127.1505 },
  "천안시 서북구": { lat: 36.8284, lng: 127.0997 },
  "공주시": { lat: 36.4467, lng: 127.1190 },
  "보령시": { lat: 36.3508, lng: 126.5990 },
  "아산시": { lat: 36.7898, lng: 127.0021 },
  "서산시": { lat: 36.7848, lng: 126.4503 },
  "논산시": { lat: 36.1872, lng: 127.0982 },
  "계룡시": { lat: 36.2745, lng: 127.2486 },
  "당진시": { lat: 36.8932, lng: 126.6294 },
  "금산군": { lat: 36.1086, lng: 127.4886 },
  "부여군": { lat: 36.2756, lng: 126.9094 },
  "서천군": { lat: 36.0795, lng: 126.6916 },
  "청양군": { lat: 36.4593, lng: 126.8024 },
  "홍성군": { lat: 36.6014, lng: 126.6608 },
  "예산군": { lat: 36.6810, lng: 126.8442 },
  "태안군": { lat: 36.7458, lng: 126.2978 },
};

/** Haversine distance in km between two coords. */
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * 좌표가 city의 시·군청에서 600m 이내이면 true → 사용자가 위치를 따로 안 찍고
 * 기본 시·군청 좌표를 그대로 둔 게시글로 간주.
 */
export function isCityCenterOnly(
  city: string | null | undefined,
  lat: number | null | undefined,
  lng: number | null | undefined,
): boolean {
  if (!city || lat == null || lng == null) return false;
  // 정확히 매칭하거나, "천안시 동남구" 같은 경우 "천안시"로도 매칭
  const candidates = [city];
  const m = city.match(/^(\S+시)\s+\S+구$/);
  if (m) candidates.push(m[1]);
  for (const c of candidates) {
    const hall = CITY_HALL_COORDS[c];
    if (!hall) continue;
    if (distanceKm(lat, lng, hall.lat, hall.lng) < 0.6) return true;
  }
  return false;
}

/**
 * 게시글에 표시할 위치 라벨을 만든다.
 *  - 좌표가 시·군청 근처(기본 좌표)이면: "천안시 전체"
 *  - 그 외: "천안시 봉명1동 (봉명동)" 또는 "천안시 봉명동" (행정동==법정동)
 */
export function makeLocationLabel(opts: {
  city: string | null | undefined;
  admDong: string | null | undefined;
  legalDong: string | null | undefined;
  fallbackDong?: string | null | undefined;
  latitude: number | null | undefined;
  longitude: number | null | undefined;
}): string | null {
  const { city, admDong, legalDong, fallbackDong, latitude, longitude } = opts;
  if (isCityCenterOnly(city, latitude, longitude)) {
    return `${city} 전체`;
  }
  let dongLabel: string | null = null;
  if (admDong && legalDong) {
    dongLabel = admDong === legalDong ? admDong : `${admDong} (${legalDong})`;
  } else {
    dongLabel = admDong ?? legalDong ?? fallbackDong ?? null;
  }
  return [city, dongLabel].filter(Boolean).join(" ") || null;
}
