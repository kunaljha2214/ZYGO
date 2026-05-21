/** Compatible with former react-native-maps region shape. */
export type MapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export type MapCoordinate = {
  latitude: number;
  longitude: number;
};

export type LatLng = { lat: number; lng: number };

export function isFiniteCoord(c: LatLng): boolean {
  return Number.isFinite(c.lat) && Number.isFinite(c.lng);
}

export function toMapCoordinate(c: LatLng): MapCoordinate {
  return { latitude: c.lat, longitude: c.lng };
}

export type MapPressEvent = {
  nativeEvent: { coordinate: MapCoordinate };
};

export function zoomFromLatitudeDelta(delta: number): number {
  return Math.min(18, Math.max(3, Math.log2(360 / Math.max(delta, 0.0001)) - 1));
}

export function regionToCenter(region: MapRegion): [number, number] {
  return [region.longitude, region.latitude];
}

/** Mapbox camera bounds — positions are [longitude, latitude]. */
export type MapBounds = {
  ne: [number, number];
  sw: [number, number];
};

export function boundsFromLatLngPoints(
  points: Array<{ lat: number; lng: number }>,
  paddingRatio = 0.18,
  minSpan = 0.006
): MapBounds | null {
  const valid = points.filter(isFiniteCoord);
  if (!valid.length) return null;

  let minLat = valid[0].lat;
  let maxLat = valid[0].lat;
  let minLng = valid[0].lng;
  let maxLng = valid[0].lng;
  for (const p of valid) {
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
    minLng = Math.min(minLng, p.lng);
    maxLng = Math.max(maxLng, p.lng);
  }

  const latSpan = Math.max(maxLat - minLat, minSpan);
  const lngSpan = Math.max(maxLng - minLng, minSpan);
  const latPad = latSpan * paddingRatio;
  const lngPad = lngSpan * paddingRatio;

  return {
    ne: [maxLng + lngPad, maxLat + latPad],
    sw: [minLng - lngPad, minLat - latPad],
  };
}

export function regionFromCoordinates(
  points: Array<{ lat: number; lng: number }>,
  padding = 0.15
): MapRegion | null {
  if (!points.length) return null;
  let minLat = points[0].lat;
  let maxLat = points[0].lat;
  let minLng = points[0].lng;
  let maxLng = points[0].lng;
  for (const p of points) {
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
    minLng = Math.min(minLng, p.lng);
    maxLng = Math.max(maxLng, p.lng);
  }
  const latDelta = Math.max((maxLat - minLat) * (1 + padding), 0.008);
  const lngDelta = Math.max((maxLng - minLng) * (1 + padding), 0.008);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: latDelta,
    longitudeDelta: lngDelta,
  };
}
