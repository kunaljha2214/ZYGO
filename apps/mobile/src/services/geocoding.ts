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
  place_type?: string[];
  center?: [number, number];
  geometry?: { type?: string; coordinates?: [number, number] };
};

export type PlaceSearchKind = 'city' | 'area' | 'all';

/** Area lookup scoped to a selected city (colony, sector, street, etc.). */
export type AreaSearchContext = {
  areaQuery: string;
  city?: string;
  cityCoordinates?: { lat: number; lng: number };
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

function mapboxFeatureToCityPlace(feature: MapboxFeature): GeocodedPlace | null {
  const types = feature.place_type ?? [];
  const cityLevel = types.some((t) => ['place', 'region'].includes(t));
  if (types.length > 0 && !cityLevel) return null;

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

  const cityName =
    feature.text?.trim() ||
    feature.place_name?.split(',')[0]?.trim() ||
    '';
  if (!cityName || looksLikeCoordinateLine(cityName)) return null;

  const state = feature.place_name?.split(',')[1]?.trim();
  const line1 = [cityName, state, 'India'].filter(Boolean).join(', ');
  return { label: cityName, line1, coordinates };
}

async function searchPlacesMapbox(
  query: string,
  token: string,
  kind: PlaceSearchKind
): Promise<GeocodedPlace[]> {
  const types =
    kind === 'city'
      ? 'place,region'
      : kind === 'area'
        ? 'locality,neighborhood,address,poi,street'
        : 'address,poi,place,locality,neighborhood';
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${encodeURIComponent(token)}&country=in&limit=12&types=${types}&language=en`;
  const data = await fetchJson<{ features?: MapboxFeature[] }>(url);
  if (!data?.features?.length) return [];

  const mapper =
    kind === 'city'
      ? mapboxFeatureToCityPlace
      : mapboxFeatureToPlace;

  const seen = new Set<string>();
  const out: GeocodedPlace[] = [];
  for (const feature of data.features) {
    const place = mapper(feature);
    if (!place) continue;
    const key = place.label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(place);
    if (out.length >= 8) break;
  }
  return out;
}

function nominatimCityName(
  addr?: NominatimAddress,
  name?: string,
  type?: string
): string | null {
  const city = addr?.city || addr?.town || addr?.village;
  if (city) return city;
  if (type && ['city', 'town', 'village', 'administrative'].includes(type) && name) {
    return name;
  }
  return name && !addr?.road && !addr?.house_number ? name : null;
}

async function searchCitiesNominatim(query: string): Promise<GeocodedPlace[]> {
  const url = `${NOMINATIM}/search?q=${encodeURIComponent(query)}&format=json&limit=12&countrycodes=in&addressdetails=1&featuretype=city`;
  const data = await fetchJson<
    Array<{
      lat: string;
      lon: string;
      display_name: string;
      name?: string;
      type?: string;
      address?: NominatimAddress;
    }>
  >(url, { headers: HEADERS });

  if (!data) return [];
  const seen = new Set<string>();
  const places: GeocodedPlace[] = [];
  for (const item of data) {
    const coordinates = normalizeLatLng(item.lat, item.lon);
    if (!coordinates) continue;
    const cityName = nominatimCityName(item.address, item.name, item.type);
    if (!cityName) continue;
    const key = cityName.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const state = item.address?.state;
    places.push({
      label: cityName,
      line1: [cityName, state, 'India'].filter(Boolean).join(', '),
      coordinates,
    });
    if (places.length >= 8) break;
  }
  return places;
}

type NominatimSearchItem = {
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  type?: string;
  class?: string;
  address?: NominatimAddress;
};

function nominatimAreaLabel(item: NominatimSearchItem, city?: string): string | null {
  const addr = item.address;
  const label =
    item.name?.trim() ||
    addr?.neighbourhood ||
    addr?.suburb ||
    addr?.quarter ||
    addr?.road ||
    shortLabel(item.display_name);
  if (!label || looksLikeCoordinateLine(label)) return null;
  if (city && label.toLowerCase() === city.trim().toLowerCase()) return null;
  return label;
}

function isWholeCityResult(item: NominatimSearchItem, city?: string): boolean {
  const t = (item.type ?? '').toLowerCase();
  if (t === 'city' || t === 'town') return true;
  if (!city) return false;
  const name = item.name?.trim().toLowerCase();
  return name === city.trim().toLowerCase();
}

function nominatimItemToAreaPlace(item: NominatimSearchItem, city?: string): GeocodedPlace | null {
  if (isWholeCityResult(item, city)) return null;
  const coordinates = normalizeLatLng(item.lat, item.lon);
  if (!coordinates) return null;
  const label = nominatimAreaLabel(item, city);
  if (!label) return null;
  const { line1 } = formatFromNominatimAddress(item.display_name, item.address, item.name);
  return { label, line1, coordinates };
}

async function searchAreasNominatim(query: string, city?: string): Promise<GeocodedPlace[]> {
  const url = `${NOMINATIM}/search?q=${encodeURIComponent(query)}&format=json&limit=15&countrycodes=in&addressdetails=1`;
  const data = await fetchJson<NominatimSearchItem[]>(url, { headers: HEADERS });
  if (!data) return [];

  const seen = new Set<string>();
  const places: GeocodedPlace[] = [];
  for (const item of data) {
    const place = nominatimItemToAreaPlace(item, city);
    if (!place) continue;
    const key = place.label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    places.push(place);
    if (places.length >= 10) break;
  }
  return places;
}

/** Nominatim search with city parameter (better for colonies inside a city). */
async function searchAreasNominatimStructured(
  areaQuery: string,
  city: string
): Promise<GeocodedPlace[]> {
  const params = new URLSearchParams({
    q: areaQuery,
    city,
    country: 'India',
    format: 'json',
    limit: '15',
    addressdetails: '1',
    countrycodes: 'in',
  });
  const url = `${NOMINATIM}/search?${params.toString()}`;
  const data = await fetchJson<NominatimSearchItem[]>(url, { headers: HEADERS });
  if (!data) return [];

  const seen = new Set<string>();
  const places: GeocodedPlace[] = [];
  for (const item of data) {
    const place = nominatimItemToAreaPlace(item, city);
    if (!place) continue;
    const key = place.label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    places.push(place);
    if (places.length >= 10) break;
  }
  return places;
}

async function searchPlacesMapboxArea(
  query: string,
  token: string,
  proximity?: { lat: number; lng: number },
  city?: string
): Promise<GeocodedPlace[]> {
  const types = 'address,poi,neighborhood,locality,district,place';
  let url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json` +
    `?access_token=${encodeURIComponent(token)}&country=in&limit=12&types=${types}&language=en`;
  if (proximity) {
    url += `&proximity=${proximity.lng},${proximity.lat}`;
  }
  const data = await fetchJson<{ features?: MapboxFeature[] }>(url);
  if (!data?.features?.length) return [];

  const seen = new Set<string>();
  const out: GeocodedPlace[] = [];
  for (const feature of data.features) {
    const types = feature.place_type ?? [];
    if (
      city &&
      types.length === 1 &&
      types[0] === 'place' &&
      feature.text?.trim().toLowerCase() === city.trim().toLowerCase()
    ) {
      continue;
    }
    const place = mapboxFeatureToPlace(feature);
    if (!place) continue;
    if (city && place.label.toLowerCase() === city.trim().toLowerCase()) continue;
    const key = place.label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(place);
    if (out.length >= 10) break;
  }
  return out;
}

async function searchAreas(ctx: AreaSearchContext): Promise<GeocodedPlace[]> {
  const areaQuery = ctx.areaQuery.trim();
  const city = ctx.city?.trim();
  if (areaQuery.length < 2) return [];

  const queryVariants = city
    ? [
        `${areaQuery}, ${city}, India`,
        `${areaQuery}, ${city}`,
        `${city}, ${areaQuery}`,
      ]
    : [`${areaQuery}, India`, areaQuery];

  const token = mapboxAccessToken();
  const merged: GeocodedPlace[] = [];
  const seen = new Set<string>();

  function append(list: GeocodedPlace[]) {
    for (const p of list) {
      const key = `${p.label.toLowerCase()}|${p.coordinates.lat.toFixed(3)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(p);
    }
  }

  for (const q of queryVariants) {
    if (token) {
      append(await searchPlacesMapboxArea(q, token, ctx.cityCoordinates, city));
    }
    append(await searchAreasNominatim(q, city));
    if (merged.length >= 10) break;
  }

  if (city && merged.length < 8) {
    append(await searchAreasNominatimStructured(areaQuery, city));
  }

  return merged.slice(0, 10);
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

export async function searchPlaces(
  query: string,
  kind: PlaceSearchKind = 'all',
  areaContext?: AreaSearchContext
): Promise<GeocodedPlace[]> {
  if (kind === 'area') {
    return searchAreas(
      areaContext ?? {
        areaQuery: query.trim(),
      }
    );
  }

  const q = query.trim();
  if (q.length < 2) return [];

  const token = mapboxAccessToken();
  if (token) {
    const results = await searchPlacesMapbox(q, token, kind);
    if (results.length > 0) return results;
  }

  if (kind === 'city') {
    return searchCitiesNominatim(q);
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
