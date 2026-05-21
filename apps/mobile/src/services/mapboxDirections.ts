import { mapboxAccessToken } from '../config/mapbox';

export type DirectionsResult = {
  coordinates: [number, number][];
  distanceKm: number;
  durationMin: number;
};

type MapboxDirectionsResponse = {
  routes?: Array<{
    distance?: number;
    duration?: number;
    geometry?: { coordinates?: [number, number][] };
  }>;
  code?: string;
  message?: string;
};

/** Driving route via Mapbox Directions API (GeoJSON geometry). */
function validCoord(c: { lat: number; lng: number }): boolean {
  return Number.isFinite(c.lat) && Number.isFinite(c.lng);
}

export async function fetchDrivingRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): Promise<DirectionsResult | null> {
  const token = mapboxAccessToken();
  if (!token || !validCoord(from) || !validCoord(to)) return null;

  const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
  const url =
    `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}` +
    `?access_token=${encodeURIComponent(token)}` +
    '&geometries=geojson&overview=full&steps=false';

  const res = await fetch(url);
  const data = (await res.json()) as MapboxDirectionsResponse;
  if (!res.ok || !data.routes?.[0]) return null;

  const route = data.routes[0];
  const line = route.geometry?.coordinates;
  if (!line?.length) return null;

  return {
    coordinates: line,
    distanceKm: Math.round(((route.distance ?? 0) / 1000) * 100) / 100,
    durationMin: Math.max(1, Math.round((route.duration ?? 0) / 60)),
  };
}
