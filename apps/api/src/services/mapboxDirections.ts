type Coord = { lat: number; lng: number };

export type DirectionsResult = {
  distanceKm: number;
  durationMin: number;
  coordinates: [number, number][];
};

type MapboxDirectionsResponse = {
  routes?: Array<{
    distance?: number;
    duration?: number;
    geometry?: { coordinates?: [number, number][] };
  }>;
};

export async function fetchMapboxDrivingRoute(
  from: Coord,
  to: Coord
): Promise<DirectionsResult | null> {
  const token = process.env.MAPBOX_ACCESS_TOKEN?.trim();
  if (!token) return null;

  const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
  const url =
    `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}` +
    `?access_token=${encodeURIComponent(token)}` +
    '&geometries=geojson&overview=full';

  const res = await fetch(url);
  if (!res.ok) return null;

  const data = (await res.json()) as MapboxDirectionsResponse;
  const route = data.routes?.[0];
  const line = route?.geometry?.coordinates;
  if (!route || !line?.length) return null;

  return {
    distanceKm: Math.round(((route.distance ?? 0) / 1000) * 100) / 100,
    durationMin: Math.max(1, Math.round((route.duration ?? 0) / 60)),
    coordinates: line,
  };
}
