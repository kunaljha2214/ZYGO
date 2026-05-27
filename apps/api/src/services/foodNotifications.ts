import { Types } from 'mongoose';
import type { IFoodOrder } from '../models/FoodOrder';
import { Restaurant } from '../models/Restaurant';
import { dispatchNotificationAsync } from './notificationDispatcher';
import {
  buildCustomerFoodNotification,
  buildDeliveryPartnerFoodNotification,
  buildRestaurantFoodNotification,
  buildRestaurantMenuNotification,
  buildRestaurantReviewNotification,
  type CustomerFoodNotificationType,
  type DeliveryPartnerFoodNotificationType,
  type RestaurantFoodNotificationType,
} from './notificationEvents';

type FoodNotificationContext = {
  amount?: number;
  reason?: string;
  itemName?: string;
  menuItemId?: string;
  reviewId?: string;
  rating?: number;
  earnings?: number;
};

function orderId(order: Pick<IFoodOrder, '_id'>): string {
  return order._id.toString();
}

async function restaurantContext(order: Pick<IFoodOrder, 'restaurantId' | 'restaurantName'>) {
  const restaurant = await Restaurant.findById(order.restaurantId).select('name ownerId').lean();
  return {
    ownerId: restaurant?.ownerId,
    restaurantName: order.restaurantName ?? restaurant?.name ?? 'the restaurant',
    restaurantId: order.restaurantId.toString(),
  };
}

export function dispatchCustomerFoodEvent(
  order: IFoodOrder,
  type: CustomerFoodNotificationType,
  context: FoodNotificationContext = {}
): void {
  void (async () => {
    const { restaurantName, restaurantId } = await restaurantContext(order);
    const payload = buildCustomerFoodNotification(orderId(order), type, {
      orderNumber: order.orderNumber,
      restaurantName,
      restaurantId,
      reason: context.reason,
      earnings: context.earnings,
    });
    dispatchNotificationAsync({
      userId: order.userId,
      domain: 'food',
      payload,
    });
  })().catch((err) => {
    console.error('[notification] customer food failed', type, orderId(order), err);
  });
}

export function dispatchRestaurantFoodEvent(
  order: IFoodOrder,
  type: RestaurantFoodNotificationType,
  context: FoodNotificationContext = {}
): void {
  void (async () => {
    const { ownerId, restaurantId } = await restaurantContext(order);
    if (!ownerId) return;

    const payload = buildRestaurantFoodNotification(orderId(order), type, {
      orderNumber: order.orderNumber,
      restaurantId,
      amount: context.amount ?? order.total,
      reason: context.reason,
      itemName: context.itemName,
      menuItemId: context.menuItemId,
      reviewId: context.reviewId,
      rating: context.rating,
    });
    dispatchNotificationAsync({
      userId: ownerId,
      domain: 'food',
      payload,
    });
  })().catch((err) => {
    console.error('[notification] restaurant food failed', type, orderId(order), err);
  });
}

export function dispatchDeliveryPartnerFoodEvent(
  partnerId: string | Types.ObjectId,
  order: IFoodOrder,
  type: DeliveryPartnerFoodNotificationType,
  context: FoodNotificationContext = {}
): void {
  void (async () => {
    const { restaurantName, restaurantId } = await restaurantContext(order);
    const payload = buildDeliveryPartnerFoodNotification(orderId(order), type, {
      orderNumber: order.orderNumber,
      restaurantName,
      restaurantId,
      earnings: context.earnings ?? order.estimatedRiderEarnings ?? order.riderEarnings,
    });
    dispatchNotificationAsync({
      userId: partnerId,
      domain: 'food',
      payload,
    });
  })().catch((err) => {
    console.error('[notification] delivery partner food failed', type, orderId(order), err);
  });
}

export function dispatchRestaurantMenuEvent(
  restaurantId: string,
  context: { itemName?: string; menuItemId?: string }
): void {
  void (async () => {
    const restaurant = await Restaurant.findById(restaurantId).select('ownerId').lean();
    if (!restaurant?.ownerId) return;

    const payload = buildRestaurantMenuNotification(restaurantId, 'low_stock_warning', context);
    dispatchNotificationAsync({
      userId: restaurant.ownerId,
      domain: 'food',
      payload,
    });
  })().catch((err) => {
    console.error('[notification] restaurant menu failed', restaurantId, err);
  });
}

export function dispatchRestaurantReviewEvent(
  restaurantId: string,
  context: { reviewId?: string; rating?: number }
): void {
  void (async () => {
    const restaurant = await Restaurant.findById(restaurantId).select('ownerId').lean();
    if (!restaurant?.ownerId) return;

    const payload = buildRestaurantReviewNotification(restaurantId, context);
    dispatchNotificationAsync({
      userId: restaurant.ownerId,
      domain: 'food',
      payload,
    });
  })().catch((err) => {
    console.error('[notification] restaurant review failed', restaurantId, err);
  });
}

export function notifyFoodStakeholdersOnCustomerCancel(order: IFoodOrder): void {
  dispatchRestaurantFoodEvent(order, 'order_cancelled');
  if (order.deliveryPartnerId) {
    dispatchDeliveryPartnerFoodEvent(order.deliveryPartnerId, order, 'order_cancelled');
  } else if (order.pendingPartnerId) {
    dispatchDeliveryPartnerFoodEvent(order.pendingPartnerId, order, 'order_cancelled');
  }
}

export function notifyFoodStakeholdersOnDriverReassign(order: IFoodOrder): void {
  dispatchCustomerFoodEvent(order, 'driver_reassigning');
  dispatchRestaurantFoodEvent(order, 'driver_reassigning');
}
