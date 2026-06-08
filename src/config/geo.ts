export const GEO_CONFIG = {
  enabled: import.meta.env.VITE_NODE_ENV === 'PRODUCTION',
  officeLat: Number(import.meta.env.VITE_OFFICE_LAT ?? 28.493753),
  officeLng: Number(import.meta.env.VITE_OFFICE_LNG ?? 77.020424),
  radiusMeters: Number(import.meta.env.VITE_OFFICE_RADIUS_METERS ?? 20),
} as const;

/** Haversine distance in metres between two coordinates. */
export function getDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
