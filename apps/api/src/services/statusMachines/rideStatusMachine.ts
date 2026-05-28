import createError from 'http-errors';
import type { IRideBooking, RideStatus } from '../../models/RideBooking';
import { DEFAULT_GEOFENCE_METERS, assertWithinMeters, getUserLatLngOrThrow } from './geoValidation';
import { normalizeLatLng } from '../../utils/geo';

const FLOW: RideStatus[] = ['assigned', 'arriving', 'arrived', 'in_progress', 'completed'];

export function nextRideStatus(current: RideStatus): RideStatus | null {
  const idx = FLOW.indexOf(current);
  if (idx < 0 || idx >= FLOW.length - 1) return null;
  return FLOW[idx + 1];
}

export type RideAdvanceContext = {
  driverId: string;
  requestedTarget?: RideStatus | undefined;
  geofenceMeters?: number;
};

export async function assertCanAdvanceRideStatus(
  ride: IRideBooking,
  ctx: RideAdvanceContext
): Promise<{ target: RideStatus }> {
  const target = nextRideStatus(ride.status);
  if (!target) {
    throw createError(400, 'Cannot advance ride status');
  }
  if (ctx.requestedTarget && ctx.requestedTarget !== target) {
    throw createError(400, `Invalid status transition to ${ctx.requestedTarget}`);
  }
  if (ride.status === 'cancelled') {
    throw createError(400, 'Ride is cancelled');
  }

  const meters = ctx.geofenceMeters ?? DEFAULT_GEOFENCE_METERS;
  const actor = await getUserLatLngOrThrow(ctx.driverId);
  const pickup = normalizeLatLng(ride.pickup.coordinates);
  const drop = normalizeLatLng(ride.drop.coordinates);

  if (target === 'arrived') {
    assertWithinMeters('Driver', actor, pickup, meters, 'the pickup point');
  }
  if (target === 'completed') {
    const otpVerifiedAt = (ride as unknown as { rideOtpVerifiedAt?: Date | null }).rideOtpVerifiedAt;
    if (!otpVerifiedAt) {
      throw createError(403, 'Ride OTP not verified');
    }
    assertWithinMeters('Driver', actor, drop, meters, 'the drop location');
  }

  return { target };
}

