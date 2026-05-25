import { Types } from 'mongoose';
import { RideBooking } from '../models/RideBooking';
import { User } from '../models/User';
import { DriverProfile } from '../models/DriverProfile';
import { haversineKm, estimateDurationMin } from '../utils/geo';
import { emitToDriver, emitToUser } from '../socket/io';
import { syncDriverBusyState } from './driverAvailability';
import {
  assertPartnerSubscriptionActive,
  filterSubscribedPartnerIds,
  markPartnerFirstOrderCompleted,
} from './partnerSubscription';

/** Default 90s (MVP testing); override with RIDE_REQUEST_TIMEOUT_MS in `.env`. */
const REQUEST_TIMEOUT_MS = Number(process.env.RIDE_REQUEST_TIMEOUT_MS || 90_000);
const WAITING_RIDE_MAX_AGE_MS = 60 * 60 * 1000;
const SEARCH_RADIUS_KM = Number(process.env.RIDE_SEARCH_RADIUS_KM || 8);

type DispatchState = {
  rideId: string;
  driverIds: string[];
  index: number;
  timeout?: NodeJS.Timeout;
};

const dispatches = new Map<string, DispatchState>();

function computeDriverEarnings(fare: number): { platformFee: number; driverEarned: number } {
  const platformFee = Math.round(fare * 0.17);
  const driverEarned = Math.max(0, fare - platformFee);
  return { platformFee, driverEarned };
}

export async function findEligibleDrivers(
  pickupCoords: { lat: number; lng: number },
  vehicleType: string,
  excludeIds: string[] = [],
  maxRadiusKm: number = SEARCH_RADIUS_KM
): Promise<{ id: string; name: string; distanceKm: number; rating: number }[]> {
  const excludeSet = new Set(excludeIds);
  const approved = await DriverProfile.find({ approvalStatus: 'approved' }).lean();
  const approvedIds = approved
    .map((p) => p.driverId.toString())
    .filter((id) => !excludeSet.has(id));

  if (approvedIds.length === 0) return [];

  const drivers = await User.find({
    _id: { $in: approvedIds.map((id) => new Types.ObjectId(id)) },
    role: 'driver',
    isDriverOnline: true,
    isDriverBusy: { $ne: true },
    driverVehicleType: vehicleType,
    currentLocation: { $exists: true, $ne: null },
  }).lean();

  const subscribed = await filterSubscribedPartnerIds(approvedIds, 'driver');

  return drivers
    .filter((d) => subscribed.has(d._id.toString()))
    .map((d) => {
      const coords = d.currentLocation!.coordinates;
      const lng = coords[0];
      const lat = coords[1];
      const distanceKm = haversineKm(pickupCoords, { lat, lng });
      const profile = approved.find((p) => p.driverId.toString() === d._id.toString());
      return {
        id: d._id.toString(),
        name: d.name,
        distanceKm,
        rating: profile?.rating ?? 4.5,
      };
    })
    .filter((d) => d.distanceKm <= maxRadiusKm)
    .sort((a, b) => {
      if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
      return b.rating - a.rating;
    });
}

async function findEligibleDriversAnyDistance(
  vehicleType: string,
  excludeIds: string[] = []
) {
  const excludeSet = new Set(excludeIds);
  const approved = await DriverProfile.find({ approvalStatus: 'approved' }).lean();
  const approvedIds = approved
    .map((p) => p.driverId.toString())
    .filter((id) => !excludeSet.has(id));
  if (approvedIds.length === 0) return [];

  const drivers = await User.find({
    _id: { $in: approvedIds.map((id) => new Types.ObjectId(id)) },
    role: 'driver',
    isDriverOnline: true,
    isDriverBusy: { $ne: true },
    driverVehicleType: vehicleType,
    currentLocation: { $exists: true, $ne: null },
  }).lean();

  const subscribed = await filterSubscribedPartnerIds(approvedIds, 'driver');

  return drivers
    .filter((d) => subscribed.has(d._id.toString()))
    .map((d) => {
      const profile = approved.find((p) => p.driverId.toString() === d._id.toString());
      return { id: d._id.toString(), name: d.name, distanceKm: 0, rating: profile?.rating ?? 4.5 };
    });
}

async function buildRequestPayload(rideId: string, driverId: string) {
  const ride = await RideBooking.findById(rideId).lean();
  if (!ride) return null;

  const driver = await User.findById(driverId).lean();
  if (!driver?.currentLocation) return null;

  const pickup = ride.pickup.coordinates;
  const drop = ride.drop.coordinates;
  const driverCoords = {
    lat: driver.currentLocation.coordinates[1],
    lng: driver.currentLocation.coordinates[0],
  };
  const distanceToPickupKm = Math.round(haversineKm(driverCoords, pickup) * 10) / 10;
  const tripKm = ride.distanceKm;
  const estimatedEarnings =
    ride.estimatedDriverEarnings ?? computeDriverEarnings(ride.fare).driverEarned;
  const expiresAt = new Date(Date.now() + REQUEST_TIMEOUT_MS).toISOString();

  return {
    requestId: `${rideId}-${driverId}`,
    rideId: ride._id.toString(),
    pickup: ride.pickup,
    drop: ride.drop,
    vehicleType: ride.vehicleType,
    distanceToPickupKm,
    tripDistanceKm: tripKm,
    estimatedEarnings,
    estimatedFare: ride.fare,
    platformFee: ride.platformFee,
    driverEarned: ride.driverEarned,
    estimatedMinutes: ride.durationMin,
    expiresAt,
    timeoutSeconds: REQUEST_TIMEOUT_MS / 1000,
    rideType: ride.vehicleType,
  };
}

async function reofferToDriver(rideId: string, driverId: string): Promise<boolean> {
  const payload = await buildRequestPayload(rideId, driverId);
  if (!payload) return false;

  await RideBooking.findByIdAndUpdate(rideId, {
    pendingDriverId: new Types.ObjectId(driverId),
    dispatchExpiresAt: new Date(payload.expiresAt),
    status: 'dispatching',
    assignmentState: 'dispatching',
  });

  emitToDriver(driverId, 'ride:request', payload);
  ensureDispatchTimer(rideId, driverId);
  return true;
}

/** Restore in-memory timeout after API restart (e.g. Render) while DB still has a pending offer. */
function ensureDispatchTimer(rideId: string, driverId: string): void {
  let state = dispatches.get(rideId);
  if (!state) {
    state = { rideId, driverIds: [driverId], index: 0 };
    dispatches.set(rideId, state);
  }
  if (state.timeout) clearTimeout(state.timeout);
  state.timeout = setTimeout(() => {
    void handleRequestTimeout(rideId, driverId);
  }, REQUEST_TIMEOUT_MS);
}

async function sendToNextDriver(rideId: string): Promise<void> {
  const state = dispatches.get(rideId);
  if (!state) return;

  if (state.index >= state.driverIds.length) {
    dispatches.delete(rideId);
    await RideBooking.findByIdAndUpdate(rideId, {
      assignmentState: 'failed',
      pendingDriverId: null,
      dispatchExpiresAt: null,
      status: 'requested',
    });
    const ride = await RideBooking.findById(rideId).lean();
    if (ride) {
      emitToUser(ride.userId.toString(), 'ride:no_driver', { rideId });
    }
    return;
  }

  const driverId = state.driverIds[state.index];
  const payload = await buildRequestPayload(rideId, driverId);
  if (!payload) {
    state.index += 1;
    await sendToNextDriver(rideId);
    return;
  }

  await RideBooking.findByIdAndUpdate(rideId, {
    pendingDriverId: new Types.ObjectId(driverId),
    dispatchExpiresAt: new Date(payload.expiresAt),
    status: 'dispatching',
    assignmentState: 'dispatching',
  });

  emitToDriver(driverId, 'ride:request', payload);
  ensureDispatchTimer(rideId, driverId);
}

async function handleRequestTimeout(rideId: string, driverId: string): Promise<void> {
  const ride = await RideBooking.findById(rideId);
  if (!ride || ride.assignmentState === 'assigned') return;
  if (ride.pendingDriverId?.toString() !== driverId) return;

  emitToDriver(driverId, 'ride:request_expired', { rideId });

  ride.rejectedDriverIds = [...(ride.rejectedDriverIds ?? []), new Types.ObjectId(driverId)];
  await ride.save();

  const state = dispatches.get(rideId);
  if (!state) return;
  state.index += 1;
  await sendToNextDriver(rideId);
}

export async function startRideDispatch(rideId: string): Promise<void> {
  const ride = await RideBooking.findById(rideId);
  if (!ride) return;
  if (ride.captainId || ride.assignmentState === 'assigned') return;

  const onlineDrivers = await User.find({
    role: 'driver',
    isDriverOnline: true,
    driverVehicleType: ride.vehicleType,
  })
    .select('_id')
    .lean();
  for (const d of onlineDrivers) {
    await syncDriverBusyState(d._id.toString());
  }

  const pickup = ride.pickup.coordinates;
  const { platformFee, driverEarned } = computeDriverEarnings(ride.fare);
  ride.platformFee = platformFee;
  ride.driverEarned = driverEarned;
  ride.estimatedDriverEarnings = driverEarned;
  ride.assignmentState = 'dispatching';
  ride.status = 'dispatching';
  await ride.save();

  const exclude = (ride.rejectedDriverIds ?? []).map((id) => id.toString());
  const radiusTiers = [SEARCH_RADIUS_KM, 25, 100];
  let drivers: Awaited<ReturnType<typeof findEligibleDrivers>> = [];
  for (const km of radiusTiers) {
    drivers = await findEligibleDrivers(pickup, ride.vehicleType, exclude, km);
    if (drivers.length > 0) break;
  }
  if (drivers.length === 0) {
    drivers = await findEligibleDriversAnyDistance(ride.vehicleType, exclude);
  }

  if (drivers.length === 0) {
    ride.assignmentState = 'failed';
    ride.status = 'requested';
    await ride.save();
    emitToUser(ride.userId.toString(), 'ride:no_driver', { rideId });
    return;
  }

  dispatches.set(rideId, {
    rideId,
    driverIds: drivers.map((d) => d.id),
    index: 0,
  });

  await sendToNextDriver(rideId);
}

export async function acceptRideRequest(
  rideId: string,
  driverId: string
): Promise<{ ok: boolean; message?: string }> {
  const ride = await RideBooking.findById(rideId);
  if (!ride) return { ok: false, message: 'Ride not found' };
  if (ride.pendingDriverId?.toString() !== driverId) {
    return { ok: false, message: 'Request expired or assigned to another driver' };
  }

  try {
    await assertPartnerSubscriptionActive(driverId, 'driver');
  } catch (e) {
    const err = e as { message?: string };
    return { ok: false, message: err.message ?? 'Subscription required' };
  }

  const state = dispatches.get(rideId);
  if (state?.timeout) clearTimeout(state.timeout);
  dispatches.delete(rideId);

  ride.captainId = new Types.ObjectId(driverId);
  ride.pendingDriverId = null;
  ride.dispatchExpiresAt = null;
  ride.assignmentState = 'assigned';
  ride.status = 'assigned';
  await ride.save();

  await User.findByIdAndUpdate(driverId, {
    isDriverBusy: true,
    activeRideId: ride._id,
  });

  emitToUser(ride.userId.toString(), 'ride:assigned', {
    rideId,
    driverId,
    status: ride.status,
  });

  await markPartnerFirstOrderCompleted(driverId, 'driver');

  return { ok: true };
}

export async function rejectRideRequest(rideId: string, driverId: string): Promise<{ ok: boolean }> {
  const ride = await RideBooking.findById(rideId);
  if (!ride || ride.pendingDriverId?.toString() !== driverId) {
    return { ok: false };
  }

  const state = dispatches.get(rideId);
  if (state?.timeout) clearTimeout(state.timeout);

  ride.rejectedDriverIds = [...(ride.rejectedDriverIds ?? []), new Types.ObjectId(driverId)];
  ride.pendingDriverId = null;
  await ride.save();

  if (state) {
    state.index += 1;
    await sendToNextDriver(rideId);
  }
  return { ok: true };
}

export async function getPendingRequestForDriver(driverId: string) {
  const user = await User.findById(driverId).lean();
  if (!user?.isDriverOnline || user.isDriverBusy || user.role !== 'driver') return null;

  const ride = await RideBooking.findOne({
    pendingDriverId: new Types.ObjectId(driverId),
    assignmentState: 'dispatching',
  })
    .sort({ dispatchExpiresAt: -1 })
    .lean();

  if (!ride) return null;

  const rideId = ride._id.toString();
  const expires = ride.dispatchExpiresAt;
  if (!expires || expires <= new Date()) {
    const ok = await reofferToDriver(rideId, driverId);
    if (!ok) return null;
  } else {
    ensureDispatchTimer(rideId, driverId);
  }

  return buildRequestPayload(rideId, driverId);
}

export function clearRideDispatch(rideId: string): void {
  const state = dispatches.get(rideId);
  if (state?.timeout) clearTimeout(state.timeout);
  dispatches.delete(rideId);
}

/**
 * When a driver goes online after a customer booked (common on one test phone),
 * re-offer rides that had no driver or timed out.
 */
export async function resumeDispatchForOnlineDriver(driverId: string): Promise<void> {
  await syncDriverBusyState(driverId);
  const user = await User.findById(driverId).lean();
  if (!user?.isDriverOnline || user.role !== 'driver' || !user.driverVehicleType) return;

  const since = new Date(Date.now() - WAITING_RIDE_MAX_AGE_MS);
  const rides = await RideBooking.find({
    captainId: null,
    vehicleType: user.driverVehicleType,
    status: { $in: ['requested', 'dispatching'] },
    assignmentState: { $in: ['none', 'failed', 'dispatching'] },
    createdAt: { $gte: since },
  })
    .sort({ createdAt: -1 })
    .limit(3);

  for (const ride of rides) {
    const rideId = ride._id.toString();
    const pending = ride.pendingDriverId?.toString();
    if (
      pending &&
      pending !== driverId &&
      ride.dispatchExpiresAt &&
      ride.dispatchExpiresAt > new Date()
    ) {
      continue;
    }

    if (pending === driverId && ride.assignmentState === 'dispatching') {
      const ok = await reofferToDriver(rideId, driverId);
      if (ok) return;
    }

    clearRideDispatch(rideId);
    await RideBooking.findByIdAndUpdate(rideId, {
      assignmentState: 'none',
      pendingDriverId: null,
      dispatchExpiresAt: null,
      status: 'requested',
    });
    await startRideDispatch(rideId);
    return;
  }
}
