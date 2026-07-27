export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;

/**
 * Great-circle distance in kilometres.
 *
 * Straight-line, and honest about it: in Seoul the walk between two points 800 m apart can be
 * twenty minutes if the river or a rail cutting is in the way. This is used only to ANSWER
 * "what did we save near here", where the ordering is what matters, never to promise a
 * travel time — that would need transit data we deliberately do not have.
 */
export function distanceKm(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** Distance to the closest of several points, or null when there is nothing to measure against. */
export function nearestDistanceKm(from: LatLng, targets: LatLng[]): number | null {
  let best: number | null = null;
  for (const t of targets) {
    const d = distanceKm(from, t);
    if (best === null || d < best) best = d;
  }
  return best;
}

/** "300 m" / "1.2 km" — metres below a kilometre, because that is how you think on foot. */
export function formatKm(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}
