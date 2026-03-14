/**
 * 충청남도 구시군 목록
 * councilLat/councilLng: 시/군 의회 건물 GPS 좌표
 */
export const CHUNGNAM_DISTRICTS = [
  { name: "천안시",  code: "cheonan",    centerLat: 36.815,  centerLng: 127.114, councilLat: 36.8151, councilLng: 127.1139 },
  { name: "공주시",  code: "gongju",     centerLat: 36.4465, centerLng: 127.1190, councilLat: 36.4464, councilLng: 127.1188 },
  { name: "보령시",  code: "boryeong",   centerLat: 36.3334, centerLng: 126.6130, councilLat: 36.3331, councilLng: 126.6131 },
  { name: "아산시",  code: "asan",       centerLat: 36.7898, centerLng: 127.0018, councilLat: 36.7899, councilLng: 127.0046 },
  { name: "서산시",  code: "seosan",     centerLat: 36.7845, centerLng: 126.4503, councilLat: 36.7843, councilLng: 126.4498 },
  { name: "태안군",  code: "taean",      centerLat: 36.7457, centerLng: 126.2980, councilLat: 36.7457, councilLng: 126.2978 },
  { name: "금산군",  code: "geumsan",    centerLat: 36.1087, centerLng: 127.4880, councilLat: 36.1087, councilLng: 127.4878 },
  { name: "논산시",  code: "nonsan",     centerLat: 36.1872, centerLng: 127.0987, councilLat: 36.1906, councilLng: 127.1012 },
  { name: "계룡시",  code: "gyeryong",   centerLat: 36.2744, centerLng: 127.2487, councilLat: 36.2745, councilLng: 127.2489 },
  { name: "당진시",  code: "dangjin",    centerLat: 36.8897, centerLng: 126.6298, councilLat: 36.8890, councilLng: 126.6296 },
  { name: "부여군",  code: "buyeo",      centerLat: 36.2758, centerLng: 126.9098, councilLat: 36.2769, councilLng: 126.9102 },
  { name: "서천군",  code: "seocheon",   centerLat: 36.0801, centerLng: 126.6918, councilLat: 36.0801, councilLng: 126.6925 },
  { name: "홍성군",  code: "hongseong",  centerLat: 36.6010, centerLng: 126.6608, councilLat: 36.6003, councilLng: 126.6611 },
  { name: "청양군",  code: "cheongyang", centerLat: 36.4592, centerLng: 126.8022, councilLat: 36.4592, councilLng: 126.8031 },
  { name: "예산군",  code: "yesan",      centerLat: 36.6828, centerLng: 126.8448, councilLat: 36.6830, councilLng: 126.8451 },
] as const;

export type ChungnamDistrict = (typeof CHUNGNAM_DISTRICTS)[number];

export const CHUNGNAM_CENTER = { lat: 36.5184, lng: 126.8 };
export const DEFAULT_ZOOM = 9;
export const PIN_ZOOM_THRESHOLD = 11;

/** Haversine distance in km between two GPS coordinates */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Find the nearest 충남 district to a given GPS coordinate */
export function nearestDistrict(lat: number, lng: number): ChungnamDistrict {
  return CHUNGNAM_DISTRICTS.reduce((nearest, d) =>
    haversineKm(lat, lng, d.centerLat, d.centerLng) <
    haversineKm(lat, lng, nearest.centerLat, nearest.centerLng)
      ? d : nearest
  );
}

/** Given a candidate district string like "천안시동남구", returns the matching CHUNGNAM_DISTRICTS entry */
export function findDistrictCity(candidateDistrict: string): ChungnamDistrict | null {
  return CHUNGNAM_DISTRICTS.find((d) => candidateDistrict.startsWith(d.name)) ?? null;
}
