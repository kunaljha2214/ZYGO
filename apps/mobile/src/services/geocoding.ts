import Config from 'react-native-config';
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

type GoogleGeocodeResult = {
  formatted_address: string;
  types?: string[];
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await withTimeout(
      fetch(url, init),
      GEO_TIMEOUT_MS,
      'geocoding'
    );
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function isValidGoogleKey(key: string): boolean {
  const k = key.trim();
  if (!k) return false;
  const lower = k.toLowerCase();
  return !lower.includes('placeholder') && !lower.startsWith('your-') && k.length > 10;
}

function googleMapsKey(): string | null {
  const key = Config.GOOGLE_MAPS_API_KEY?.trim() ?? '';
  return isValidGoogleKey(key) ? key : null;
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

  const labelParts = [
    [streetPart, road].filter(Boolean).join(' ').trim() || undefined,
    addr.neighbourhood || addr.suburb || addr.quarter,
    addr.city || addr.town || addr.village,
  ].filter(Boolean) as string[];

  const line1 = line1Parts.length > 0 ? line1Parts.join(', ') : display;
  const label =
    labelParts.length > 0 ? labelParts.join(', ') : name?.trim() || shortLabel(display, name);

  return { line1, label };
}

function shortLabel(displayName: string, name?: string): string {
  if (name?.trim()) return name.trim();
  const first = displayName.split(',')[0]?.trim();
  return first || displayName;
}

function pickBestGoogleGeocodeResult(results: GoogleGeocodeResult[]): GoogleGeocodeResult | null {
  if (!results.length) return null;
  const score = (r: GoogleGeocodeResult) => {
    const types = r.types ?? [];
    if (types.some((t) => ['establishment', 'point_of_interest', 'store', 'premise'].includes(t))) {
      return 0;
    }
    if (types.includes('street_address') || types.includes('route')) return 1;
    if (types.includes('sublocality') || types.includes('neighborhood')) return 2;
    if (types.includes('locality')) return 3;
    if (types.includes('postal_code')) return 9;
    return 5;
  };
  return [...results].sort((a, b) => score(a) - score(b))[0] ?? null;
}

async function nearbyPlaceGoogle(lat: number, lng: number, key: string): Promise<GeocodedPlace | null> {
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&rankby=distance&key=${encodeURIComponent(key)}`;
  const data = await fetchJson<{
    status: string;
    results?: Array<{
      name: string;
      vicinity?: string;
      geometry?: { location?: { lat: number; lng: number } };
    }>;
  }>(url);
  if (!data || data.status !== 'OK' || !data.results?.[0]) return null;
  const place = data.results[0];
  const loc = place.geometry?.location;
  const coords = loc ? { lat: loc.lat, lng: loc.lng } : { lat, lng };
  const vicinity = place.vicinity?.trim();
  const line1 = vicinity ? `${place.name}, ${vicinity}` : place.name;
  return { line1, label: place.name, coordinates: coords };
}

async function reverseGeocodeGoogle(lat: number, lng: number, key: string): Promise<GeocodedPlace | null> {
  const nearby = await nearbyPlaceGoogle(lat, lng, key);
  if (nearby) return nearby;

  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${encodeURIComponent(key)}`;
  const data = await fetchJson<{ status: string; results?: GoogleGeocodeResult[] }>(url);
  if (!data || data.status !== 'OK' || !data.results?.length) return null;

  const best = pickBestGoogleGeocodeResult(data.results);
  if (!best) return null;
  const formatted = best.formatted_address;
  const label = formatted.split(',')[0]?.trim() || formatted;
  return { line1: formatted, label, coordinates: { lat, lng } };
}

async function reverseGeocodeNominatim(lat: number, lng: number): Promise<GeocodedPlace> {
  const url = `${NOMINATIM}/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&zoom=18`;
  const item = await fetchJson<{
    display_name?: string;
    name?: string;
    address?: NominatimAddress;
  }>(url, { headers: HEADERS });

  if (!item) {
    return {
      line1: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      label: 'Current location',
      coordinates: { lat, lng },
    };
  }

  const display = item.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  const { line1, label } = formatFromNominatimAddress(display, item.address, item.name);
  return { line1, label, coordinates: { lat, lng } };
}

export async function reverseGeocode(lat: number, lng: number): Promise<GeocodedPlace> {
  const key = googleMapsKey();
  if (key) {
    const google = await reverseGeocodeGoogle(lat, lng, key);
    if (google) return google;
  }
  return reverseGeocodeNominatim(lat, lng);
}

export async function searchPlaces(query: string): Promise<GeocodedPlace[]> {
  const q = query.trim();
  if (q.length < 3) return [];

  const key = googleMapsKey();
  if (key) {
    const google = await searchPlacesGoogle(q, key);
    if (google.length > 0) return google;
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
  return data.map((item) => {
    const { line1, label } = formatFromNominatimAddress(item.display_name, item.address, item.name);
    return {
      line1,
      label,
      coordinates: { lat: parseFloat(item.lat), lng: parseFloat(item.lon) },
    };
  });
}

async function searchPlacesGoogle(query: string, key: string): Promise<GeocodedPlace[]> {
  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&components=country:in&key=${encodeURIComponent(key)}`;
  const data = await fetchJson<{
    status: string;
    predictions?: Array<{ description: string; place_id: string }>;
  }>(url);
  if (!data || data.status !== 'OK' || !data.predictions?.length) return [];

  const places: GeocodedPlace[] = [];
  for (const p of data.predictions.slice(0, 6)) {
    const detailUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(p.place_id)}&fields=geometry,formatted_address,name&key=${encodeURIComponent(key)}`;
    const detail = await fetchJson<{
      status: string;
      result?: {
        name?: string;
        formatted_address?: string;
        geometry?: { location?: { lat: number; lng: number } };
      };
    }>(detailUrl);
    const loc = detail?.result?.geometry?.location;
    if (!detail || detail.status !== 'OK' || !loc) continue;
    const line1 = detail.result?.formatted_address ?? p.description;
    const label = detail.result?.name ?? p.description.split(',')[0]?.trim() ?? line1;
    places.push({
      line1,
      label,
      coordinates: { lat: loc.lat, lng: loc.lng },
    });
  }
  return places;
}
