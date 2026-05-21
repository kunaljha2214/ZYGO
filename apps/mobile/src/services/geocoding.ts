import { mapboxAccessToken } from '../config/mapbox';
import { withTimeout } from '../utils/withTimeout';

export type GeocodedPlace = {
  line1: string;
  label: string;
  coordinates: { lat: number; lng: number };
};

const NOMINATIM = 'https://nominatim.openstreetmap.org';
const HEADERS = { 'User-Agent': 'ZygoMobile/1.0 (ride-booking)' };
const GEO_TIMEOUT_MS = 10_000;

type NominatimAddress = {
  house_number?: string;
  house_name?: string;
  road?: string;
  pedestrian?: string;
  footway?: string;
  neighbourhood?: string;
  suburb?: string;
  quarter?: string;
  city?: string;
  town?: string;
  village?: string;
  county?: string;
  state?: string;
  postcode?: string;
  country?: string;
};

type MapboxFeature = {
  place_name?: string;
  text?: string;
  center?: [number, number];
  geometry?: { type?: string; coordinates?: [number, number] };
};

function normalizeLatLng(lat: unknown, lng: unknown): { lat: number; lng: number } | null {
  const la = Number(lat);
  const ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return null;
  return { lat: la, lng: ln };
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await withTimeout(fetch(url, init), GEO_TIMEOUT_MS, 'geocoding');
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function formatFromNominatimAddress(
  display: string,
  addr?: NominatimAddress,
  name?: string
): { line1: string; label: string } {
  if (!addr) {
    return { line1: display, label: shortLabel(display, name) };
  }
  const streetPart = [addr.house_number, addr.house_name].filter(Boolean).join(' ').trim();
  const road = addr.road || addr.pedestrian || addr.footway;
  const line1Parts = [
    [streetPart, road].filter(Boolean).join(' ').trim() || undefined,
    addr.neighbourhood || addr.suburb || addr.quarter,
    addr.city || addr.town || addr.village || addr.county,
    addr.state,
    addr.postcode,
    addr.country,
  ].filter(Boolean) as string[];
  const line1 = line1Parts.join(', ') || display;
  const label = name?.trim() || addr.neighbourhood || addr.suburb || shortLabel(line1, name);
  return { line1, label };
}

function shortLabel(line1: string, name?: string): string {
  if (name?.trim()) return name.trim();
  const first = line1.split(',')[0]?.trim();
  return first || line1;
}

/** True when the string is only lat/lng numbers (not a real address). */
export function looksLikeCoordinateLine(line: string): boolean {
  const t = line.trim();
  if (!t) return true;
  if (/^near\s+-?\d/i.test(t)) return true;
  if (/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(t)) return true;
  if (/^-?\d+\.\d{4,}\s*,\s*-?\d+\.\d{4,}/.test(t)) return true;
  return false;
}

function mapboxFeatureToPlace(feature: MapboxFeature): GeocodedPlace | null {
  let lng: unknown;
  let lat: unknown;
  if (feature.center && feature.center.length >= 2) {
    [lng, lat] = feature.center;
  } else if (
    feature.geometry?.type === 'Point' &&
    feature.geometry.coordinates &&
    feature.geometry.coordinates.length >= 2
  ) {
    [lng, lat] = feature.geometry.coordinates;
  } else {
    return null;
  }
  const coordinates = normalizeLatLng(lat, lng);
  if (!coordinates) return null;
  const line1 = (feature.place_name ?? feature.text)?.trim();
  if (!line1 || looksLikeCoordinateLine(line1)) return null;
  const label = feature.text?.trim() || line1.split(',')[0]?.trim() || line1;
  return { line1, label, coordinates };
}

async function reverseGeocodeMapbox(lat: number, lng: number, token: string): Promise<GeocodedPlace | null> {
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json` +
    `?access_token=${encodeURIComponent(token)}&limit=5&language=en` +
    '&types=address,poi,place,locality,neighborhood';
  const data = await fetchJson<{ features?: MapboxFeature[] }>(url);
  for (const feature of data?.features ?? []) {
    const place = mapboxFeatureToPlace(feature);
    if (place) return place;
  }
  return null;
}

async function searchPlacesMapbox(query: string, token: string): Promise<GeocodedPlace[]> {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${encodeURIComponent(token)}&country=in&limit=8&types=address,poi,place,locality,neighborhood&language=en`;
  const data = await fetchJson<{ features?: MapboxFeature[] }>(url);
  if (!data?.features?.length) return [];
  return data.features
    .map(mapboxFeatureToPlace)
    .filter((p): p is GeocodedPlace => p != null);
}

async function reverseGeocodeNominatim(lat: number, lng: number): Promise<GeocodedPlace> {
  const url = `${NOMINATIM}/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
  const item = await fetchJson<{
    display_name: string;
    name?: string;
    address?: NominatimAddress;
  }>(url, { headers: HEADERS });

  const display = item?.display_name?.trim() ?? '';
  const { line1, label } = formatFromNominatimAddress(
    display || 'Your area',
    item?.address,
    item?.name
  );
  const safeLine1 = looksLikeCoordinateLine(line1) ? 'Your current area' : line1;
  return { line1: safeLine1, label, coordinates: { lat, lng } };
}

export async function reverseGeocode(lat: number, lng: number): Promise<GeocodedPlace> {
  const token = mapboxAccessToken();
  if (token) {
    const mapped = await reverseGeocodeMapbox(lat, lng, token);
    if (mapped) return mapped;
  }
  return reverseGeocodeNominatim(lat, lng);
}

export async function searchPlaces(query: string): Promise<GeocodedPlace[]> {
  const q = query.trim();
  if (q.length < 3) return [];

  const token = mapboxAccessToken();
  if (token) {
    const results = await searchPlacesMapbox(q, token);
    if (results.length > 0) return results;
  }

  const url = `${NOMINATIM}/search?q=${encodeURIComponent(q)}&format=json&limit=8&countrycodes=in&addressdetails=1`;
  const data = await fetchJson<
    Array<{
      lat: string;
      lon: string;
      display_name: string;
      name?: string;
      address?: NominatimAddress;
    }>
  >(url, { headers: HEADERS });

  if (!data) return [];
  const places: GeocodedPlace[] = [];
  for (const item of data) {
    const coordinates = normalizeLatLng(item.lat, item.lon);
    if (!coordinates) continue;
    const { line1, label } = formatFromNominatimAddress(item.display_name, item.address, item.name);
    places.push({ line1, label, coordinates });
  }
  return places;
}
