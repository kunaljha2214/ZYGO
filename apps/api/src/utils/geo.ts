import { getVehicleType } from '../config/app';

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371;
  const dLat = deg2rad(b.lat - a.lat);
  const dLon = deg2rad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(a.lat)) * Math.cos(deg2rad(b.lat)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * c;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

/** Rough duration from distance (urban average speed ~25 km/h). */
export function estimateDurationMin(distanceKm: number): number {
  const speedKmh = 25;
  return Math.max(5, Math.round((distanceKm / speedKmh) * 60));
}

export const MAX_DELIVERY_ETA_MIN = 180;
/** Cap implausible single-hop distances for urban food delivery. */
export const MAX_URBAN_DELIVERY_KM = 50;

export function normalizeLatLng(coords: { lat: number; lng: number }): { lat: number; lng: number } {
  let { lat, lng } = coords;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { lat: 0, lng: 0 };
  }
  // Common data entry bug: lat/lng swapped (e.g. lat=77, lng=12 for Bangalore).
  if (Math.abs(lat) > 35 && Math.abs(lng) <= 35) {
    return { lat: lng, lng: lat };
  }
  return { lat, lng };
}

export function clampDeliveryEtaMinutes(minutes: number): number {
  return Math.min(MAX_DELIVERY_ETA_MIN, Math.max(5, Math.round(minutes)));
}

/** ETA for food delivery — rider → restaurant → customer, clamped to schema max. */
export function computeFoodDeliveryEtaMinutes(
  restaurant: { lat: number; lng: number },
  customer: { lat: number; lng: number },
  rider?: { lat: number; lng: number } | null
): number {
  const rest = normalizeLatLng(restaurant);
  const cust = normalizeLatLng(customer);
  let distanceKm = haversineKm(rest, cust);
  if (rider) {
    const r = normalizeLatLng(rider);
    distanceKm = haversineKm(r, rest) + haversineKm(rest, cust);
  }
  if (distanceKm > MAX_URBAN_DELIVERY_KM) {
    distanceKm = MAX_URBAN_DELIVERY_KM;
  }
  return clampDeliveryEtaMinutes(estimateDurationMin(distanceKm));
}

export function computeFare(
  vehicleTypeId: string,
  distanceKm: number,
  durationMin: number
): { fare: number; distanceKm: number; durationMin: number } {
  const cfg = getVehicleType(vehicleTypeId);
  if (!cfg) {
    throw new Error('Invalid vehicle type');
  }
  const fare =
    Math.round(
      (cfg.baseFare + cfg.perKm * distanceKm + cfg.perMin * durationMin) * 100
    ) / 100;
  return { fare, distanceKm, durationMin };
}

export function generateOrderNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ZG-${ts}-${rnd}`;
}
