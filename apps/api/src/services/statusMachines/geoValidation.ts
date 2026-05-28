import createError from 'http-errors';
import { haversineKm, normalizeLatLng } from '../../utils/geo';
import { User } from '../../models/User';
import type { Types } from 'mongoose';

export const DEFAULT_GEOFENCE_METERS = Number(process.env.GEOFENCE_ARRIVAL_METERS || 50);

export type LatLng = { lat: number; lng: number };

export async function getUserLatLngOrThrow(userId: string | Types.ObjectId): Promise<LatLng> {
  const user = await User.findById(userId).select('currentLocation').lean();
  const coords = user?.currentLocation?.coordinates;
  if (!coords || coords.length !== 2) {
    throw createError(400, 'Location missing — enable GPS and try again');
  }
  const lng = coords[0];
  const lat = coords[1];
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw createError(400, 'Invalid location — enable GPS and try again');
  }
  return normalizeLatLng({ lat, lng });
}

export function distanceMeters(a: LatLng, b: LatLng): number {
  return haversineKm(normalizeLatLng(a), normalizeLatLng(b)) * 1000;
}

export function assertWithinMeters(
  actorLabel: string,
  actual: LatLng,
  expected: LatLng,
  meters: number,
  whenLabel: string
): void {
  const d = distanceMeters(actual, expected);
  if (d > meters) {
    throw createError(
      403,
      `${actorLabel} must be within ${Math.round(meters)}m of ${whenLabel} (currently ~${Math.round(
        d
      )}m away)`
    );
  }
}

