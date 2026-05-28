import createError from 'http-errors';
import type { IFoodOrder, DeliveryPartnerStatus } from '../../models/FoodOrder';
import { DEFAULT_GEOFENCE_METERS, assertWithinMeters, getUserLatLngOrThrow } from './geoValidation';
import { normalizeLatLng } from '../../utils/geo';

const FLOW: DeliveryPartnerStatus[] = [
  'accepted',
  'arriving_at_restaurant',
  'picked_up',
  'out_for_delivery',
  'arrived_at_customer',
  'delivered',
];

export function nextDeliveryPartnerStatus(
  current: DeliveryPartnerStatus
): DeliveryPartnerStatus | null {
  const idx = FLOW.indexOf(current);
  if (idx < 0 || idx >= FLOW.length - 1) return null;
  return FLOW[idx + 1];
}

export type FoodDeliveryAdvanceContext = {
  partnerId: string;
  requestedTarget?: DeliveryPartnerStatus | undefined;
  geofenceMeters?: number;
};

export async function assertCanAdvanceFoodDeliveryStatus(
  order: IFoodOrder,
  ctx: FoodDeliveryAdvanceContext
): Promise<{ target: DeliveryPartnerStatus }> {
  const target = nextDeliveryPartnerStatus(order.deliveryStatus);
  if (!target) {
    throw createError(400, 'Cannot advance delivery status');
  }
  if (ctx.requestedTarget && ctx.requestedTarget !== target) {
    throw createError(400, `Invalid status transition to ${ctx.requestedTarget}`);
  }

  if (order.status === 'cancelled') {
    throw createError(400, 'Order is cancelled');
  }
  if (!order.deliveryPartnerId || order.deliveryPartnerId.toString() !== ctx.partnerId) {
    throw createError(403);
  }

  const meters = ctx.geofenceMeters ?? DEFAULT_GEOFENCE_METERS;
  const actor = await getUserLatLngOrThrow(ctx.partnerId);

  const rest = order.restaurantCoords
    ? normalizeLatLng(order.restaurantCoords)
    : null;
  const drop = normalizeLatLng(order.deliveryAddress.coordinates);

  if (target === 'arriving_at_restaurant') {
    if (!rest) {
      throw createError(400, 'Restaurant location missing');
    }
    assertWithinMeters('Rider', actor, rest, meters, 'the restaurant');
  }

  if (target === 'picked_up') {
    if (!rest) {
      throw createError(400, 'Restaurant location missing');
    }
    // Restaurant must confirm handoff before pickup.
    const handoffConfirmedAt = (order as unknown as { handoffConfirmedAt?: Date | null })
      .handoffConfirmedAt;
    if (!handoffConfirmedAt) {
      throw createError(403, 'Restaurant has not confirmed handoff yet');
    }
    assertWithinMeters('Rider', actor, rest, meters, 'the restaurant');
  }

  if (target === 'arrived_at_customer') {
    assertWithinMeters('Rider', actor, drop, meters, 'the delivery address');
  }

  if (target === 'delivered') {
    // Require being at customer location to complete delivery.
    const otpVerifiedAt = (order as unknown as { deliveryOtpVerifiedAt?: Date | null })
      .deliveryOtpVerifiedAt;
    if (!otpVerifiedAt) {
      throw createError(403, 'Delivery OTP not verified');
    }
    assertWithinMeters('Rider', actor, drop, meters, 'the delivery address');
  }

  return { target };
}

