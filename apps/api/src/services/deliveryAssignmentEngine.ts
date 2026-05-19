import { Types } from 'mongoose';
import { FoodOrder, type IFoodOrder } from '../models/FoodOrder';
import { User } from '../models/User';
import { Restaurant } from '../models/Restaurant';
import { DeliveryPartnerProfile } from '../models/DeliveryPartnerProfile';
import { haversineKm, estimateDurationMin, computeFoodDeliveryEtaMinutes, normalizeLatLng } from '../utils/geo';
import { emitToPartner, emitToOrder, emitToUser } from '../socket/io';

const REQUEST_TIMEOUT_MS = 15_000;
const SEARCH_RADIUS_KM = Number(process.env.DELIVERY_SEARCH_RADIUS_KM || 5);

type DispatchState = {
  orderId: string;
  riderIds: string[];
  index: number;
  timeout?: NodeJS.Timeout;
};

const dispatches = new Map<string, DispatchState>();

function estimateEarnings(restaurantKm: number, customerKm: number): number {
  return Math.round(25 + restaurantKm * 4 + customerKm * 6);
}

export async function findEligibleRiders(
  restaurantCoords: { lat: number; lng: number },
  excludeIds: string[] = [],
  maxRadiusKm: number = SEARCH_RADIUS_KM
): Promise<
  {
    id: string;
    name: string;
    distanceKm: number;
    rating: number;
  }[]
> {
  const excludeSet = new Set(excludeIds);
  const approved = await DeliveryPartnerProfile.find({ approvalStatus: 'approved' }).lean();
  const approvedIds = approved
    .map((p) => p.partnerId.toString())
    .filter((id) => !excludeSet.has(id));

  if (approvedIds.length === 0) return [];

  const riders = await User.find({
    _id: { $in: approvedIds.map((id) => new Types.ObjectId(id)) },
    role: 'delivery_partner',
    isDeliveryOnline: true,
    isDeliveryBusy: { $ne: true },
    currentLocation: { $exists: true, $ne: null },
  }).lean();

  const ranked = riders
    .map((r) => {
      const coords = r.currentLocation!.coordinates;
      const lng = coords[0];
      const lat = coords[1];
      const distanceKm = haversineKm(restaurantCoords, { lat, lng });
      const profile = approved.find((p) => p.partnerId.toString() === r._id.toString());
      return {
        id: r._id.toString(),
        name: r.name,
        distanceKm,
        rating: profile?.rating ?? 4.5,
      };
    })
    .filter((r) => r.distanceKm <= maxRadiusKm)
    .sort((a, b) => {
      if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
      if (b.rating !== a.rating) return b.rating - a.rating;
      return a.name.localeCompare(b.name);
    });

  return ranked;
}

async function resolveRestaurantCoords(
  order: IFoodOrder
): Promise<{ lat: number; lng: number }> {
  if (order.restaurantCoords?.lat != null && order.restaurantCoords.lng != null) {
    return normalizeLatLng(order.restaurantCoords);
  }
  const restaurant = await Restaurant.findById(order.restaurantId).lean();
  if (restaurant?.location?.coordinates?.length === 2) {
    return normalizeLatLng({
      lat: restaurant.location.coordinates[1],
      lng: restaurant.location.coordinates[0],
    });
  }
  return { lat: 12.9716, lng: 77.5946 };
}

/** Online approved riders without distance filter (fallback for GPS / demo data mismatch). */
async function findEligibleRidersAnyDistance(excludeIds: string[] = []) {
  const excludeSet = new Set(excludeIds);
  const approved = await DeliveryPartnerProfile.find({ approvalStatus: 'approved' }).lean();
  const approvedIds = approved
    .map((p) => p.partnerId.toString())
    .filter((id) => !excludeSet.has(id));
  if (approvedIds.length === 0) return [];

  const riders = await User.find({
    _id: { $in: approvedIds.map((id) => new Types.ObjectId(id)) },
    role: 'delivery_partner',
    isDeliveryOnline: true,
    isDeliveryBusy: { $ne: true },
    currentLocation: { $exists: true, $ne: null },
  }).lean();

  return riders.map((r) => {
    const profile = approved.find((p) => p.partnerId.toString() === r._id.toString());
    return {
      id: r._id.toString(),
      name: r.name,
      distanceKm: 0,
      rating: profile?.rating ?? 4.5,
    };
  });
}

async function buildRequestPayload(orderId: string, riderId: string) {
  const order = await FoodOrder.findById(orderId).lean();
  if (!order) return null;
  const restaurant = await Restaurant.findById(order.restaurantId).lean();
  const restCoords = order.restaurantCoords ?? {
    lat: restaurant?.location.coordinates[1] ?? 0,
    lng: restaurant?.location.coordinates[0] ?? 0,
  };
  const customerCoords = order.deliveryAddress.coordinates;
  const rider = await User.findById(riderId).lean();
  if (!rider?.currentLocation) return null;

  const riderCoords = {
    lat: rider.currentLocation.coordinates[1],
    lng: rider.currentLocation.coordinates[0],
  };
  const distanceToRestaurantKm = Math.round(haversineKm(riderCoords, restCoords) * 10) / 10;
  const distanceToCustomerKm = Math.round(haversineKm(restCoords, customerCoords) * 10) / 10;
  const estimatedEarnings =
    order.estimatedRiderEarnings ?? estimateEarnings(distanceToRestaurantKm, distanceToCustomerKm);
  const expiresAt = new Date(Date.now() + REQUEST_TIMEOUT_MS).toISOString();

  return {
    requestId: `${orderId}-${riderId}`,
    orderId: order._id.toString(),
    orderNumber: order.orderNumber,
    restaurantName: order.restaurantName ?? restaurant?.name ?? 'Restaurant',
    restaurantAddress: restaurant ? `${order.restaurantName}` : '',
    restaurantCoords: restCoords,
    customerAddress: order.deliveryAddress.line1,
    customerCoords,
    distanceToRestaurantKm,
    distanceToCustomerKm,
    estimatedEarnings,
    estimatedMinutes: estimateDurationMin(distanceToRestaurantKm + distanceToCustomerKm),
    expiresAt,
    timeoutSeconds: REQUEST_TIMEOUT_MS / 1000,
    items: order.items,
  };
}

async function sendToNextRider(orderId: string): Promise<void> {
  const state = dispatches.get(orderId);
  if (!state) return;

  if (state.index >= state.riderIds.length) {
    dispatches.delete(orderId);
    await FoodOrder.findByIdAndUpdate(orderId, {
      assignmentState: 'failed',
      pendingPartnerId: null,
      dispatchExpiresAt: null,
    });
    const order = await FoodOrder.findById(orderId).lean();
    if (order) {
      emitToUser(order.userId.toString(), 'delivery:no_rider', { orderId });
    }
    return;
  }

  const riderId = state.riderIds[state.index];
  const payload = await buildRequestPayload(orderId, riderId);
  if (!payload) {
    state.index += 1;
    await sendToNextRider(orderId);
    return;
  }

  await FoodOrder.findByIdAndUpdate(orderId, {
    pendingPartnerId: new Types.ObjectId(riderId),
    dispatchExpiresAt: new Date(payload.expiresAt),
    deliveryStatus: 'request_received',
    assignmentState: 'dispatching',
  });

  emitToPartner(riderId, 'delivery:request', payload);

  if (state.timeout) clearTimeout(state.timeout);
  state.timeout = setTimeout(() => {
    void handleRequestTimeout(orderId, riderId);
  }, REQUEST_TIMEOUT_MS);
}

async function handleRequestTimeout(orderId: string, riderId: string): Promise<void> {
  const order = await FoodOrder.findById(orderId);
  if (!order || order.assignmentState === 'assigned') return;
  if (order.pendingPartnerId?.toString() !== riderId) return;

  emitToPartner(riderId, 'delivery:request_expired', { orderId });

  order.rejectedPartnerIds = [...(order.rejectedPartnerIds ?? []), new Types.ObjectId(riderId)];
  await order.save();

  const state = dispatches.get(orderId);
  if (!state) return;
  state.index += 1;
  await sendToNextRider(orderId);
}

export async function startDeliveryDispatch(orderId: string): Promise<void> {
  const order = await FoodOrder.findById(orderId);
  if (!order) return;
  if (order.deliveryPartnerId || order.assignmentState === 'assigned') return;

  const restaurant = await Restaurant.findById(order.restaurantId).lean();
  if (!restaurant) return;

  const restCoords = {
    lat: restaurant.location.coordinates[1],
    lng: restaurant.location.coordinates[0],
  };
  const customerCoords = order.deliveryAddress.coordinates;
  const distKm = haversineKm(restCoords, customerCoords);

  order.restaurantName = restaurant.name;
  order.restaurantCoords = restCoords;
  order.estimatedRiderEarnings = estimateEarnings(0, distKm);
  order.assignmentState = 'dispatching';
  order.deliveryStatus = 'none';
  await order.save();

  const exclude = (order.rejectedPartnerIds ?? []).map((id) => id.toString());
  const radiusTiers = [SEARCH_RADIUS_KM, 25, 100];
  let riders: Awaited<ReturnType<typeof findEligibleRiders>> = [];
  for (const km of radiusTiers) {
    riders = await findEligibleRiders(restCoords, exclude, km);
    if (riders.length > 0) break;
  }
  if (riders.length === 0) {
    riders = await findEligibleRidersAnyDistance(exclude);
  }

  if (riders.length === 0) {
    order.assignmentState = 'failed';
    await order.save();
    console.warn(
      `[delivery] No riders for order ${orderId}. Partners must be approved, online, not busy, and have location set.`
    );
    emitToUser(order.userId.toString(), 'delivery:no_rider', { orderId });
    return;
  }

  dispatches.set(orderId, {
    orderId,
    riderIds: riders.map((r) => r.id),
    index: 0,
  });

  await sendToNextRider(orderId);
}

export async function acceptDeliveryRequest(
  orderId: string,
  partnerId: string
): Promise<{ ok: boolean; message?: string }> {
  const order = await FoodOrder.findById(orderId);
  if (!order) return { ok: false, message: 'Order not found' };
  if (order.pendingPartnerId?.toString() !== partnerId) {
    return { ok: false, message: 'Request expired or assigned to another rider' };
  }

  const state = dispatches.get(orderId);
  if (state?.timeout) clearTimeout(state.timeout);
  dispatches.delete(orderId);

  order.deliveryPartnerId = new Types.ObjectId(partnerId);
  order.pendingPartnerId = null;
  order.dispatchExpiresAt = null;
  order.assignmentState = 'assigned';
  order.deliveryStatus = 'accepted';
  order.status = 'rider_assigned';
  order.riderAssignedAt = new Date();

  const restCoords = await resolveRestaurantCoords(order);
  order.restaurantCoords = restCoords;

  const rider = await User.findById(partnerId).lean();
  const riderCoords = rider?.currentLocation
    ? {
        lat: rider.currentLocation.coordinates[1],
        lng: rider.currentLocation.coordinates[0],
      }
    : null;

  order.deliveryEtaMinutes = computeFoodDeliveryEtaMinutes(
    restCoords,
    order.deliveryAddress.coordinates,
    riderCoords
  );

  try {
    await order.save();
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : 'Could not assign delivery',
    };
  }

  await User.findByIdAndUpdate(partnerId, {
    isDeliveryBusy: true,
    activeDeliveryOrderId: order._id,
  });

  void emitToOrder(orderId, 'delivery:assigned', { orderId, partnerId });
  emitToUser(order.userId.toString(), 'delivery:assigned', {
    orderId,
    status: order.status,
    deliveryStatus: order.deliveryStatus,
  });

  return { ok: true };
}

export async function rejectDeliveryRequest(
  orderId: string,
  partnerId: string
): Promise<{ ok: boolean }> {
  const order = await FoodOrder.findById(orderId);
  if (!order || order.pendingPartnerId?.toString() !== partnerId) {
    return { ok: false };
  }

  const state = dispatches.get(orderId);
  if (state?.timeout) clearTimeout(state.timeout);

  order.rejectedPartnerIds = [...(order.rejectedPartnerIds ?? []), new Types.ObjectId(partnerId)];
  order.pendingPartnerId = null;
  await order.save();

  if (state) {
    state.index += 1;
    await sendToNextRider(orderId);
  }
  return { ok: true };
}

/** REST fallback when Socket.IO is unavailable — pending offer for this partner. */
export async function getPendingRequestForPartner(partnerId: string) {
  const order = await FoodOrder.findOne({
    pendingPartnerId: new Types.ObjectId(partnerId),
    dispatchExpiresAt: { $gt: new Date() },
    assignmentState: 'dispatching',
  }).lean();
  if (!order) return null;
  return buildRequestPayload(order._id.toString(), partnerId);
}

export function clearDispatch(orderId: string): void {
  const state = dispatches.get(orderId);
  if (state?.timeout) clearTimeout(state.timeout);
  dispatches.delete(orderId);
}
