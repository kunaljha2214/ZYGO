export type NotificationRole = 'customer' | 'restaurant' | 'delivery_partner' | 'driver';

export type NotificationDomain = 'food' | 'ride';

export type CustomerFoodNotificationType =
  | 'order_placed'
  | 'payment_success'
  | 'order_accepted'
  | 'order_rejected'
  | 'food_preparing'
  | 'driver_assigned'
  | 'food_picked_up'
  | 'driver_nearby'
  | 'order_delivered'
  | 'refund_processed'
  | 'driver_reassigning';

export type RestaurantFoodNotificationType =
  | 'new_order'
  | 'order_paid'
  | 'driver_assigned'
  | 'driver_arrived'
  | 'order_completed'
  | 'order_cancelled'
  | 'driver_reassigning'
  | 'new_review'
  | 'low_stock_warning';

export type DeliveryPartnerFoodNotificationType =
  | 'food_pickup_now'
  | 'order_cancelled'
  | 'delivery_earnings';

export type CustomerRideNotificationType =
  | 'ride_accepted'
  | 'driver_moving'
  | 'driver_arrived'
  | 'ride_started'
  | 'ride_completed'
  | 'ride_cancelled'
  | 'driver_cancelled'
  | 'payment_success';

export type DriverRideNotificationType =
  | 'ride_requested'
  | 'ride_cancelled'
  | 'ride_completed_earnings'
  | 'payment_received'
  | 'incentive_earned';

export type NotificationPayload = {
  title: string;
  body: string;
  data: Record<string, string>;
};

type FoodContext = {
  orderNumber?: string;
  restaurantName?: string;
  restaurantId?: string;
  amount?: number;
  reason?: string;
  itemName?: string;
  menuItemId?: string;
  reviewId?: string;
  rating?: number;
  earnings?: number;
};

type RideContext = {
  vehicleType?: string;
  fare?: number;
  earnings?: number;
  etaMinutes?: number;
  incentiveLabel?: string;
};

function foodData(
  orderId: string,
  role: NotificationRole,
  type: string,
  context: FoodContext = {}
): Record<string, string> {
  return {
    domain: 'food',
    type,
    role,
    orderId,
    ...(context.restaurantId ? { restaurantId: context.restaurantId } : {}),
    ...(context.menuItemId ? { menuItemId: context.menuItemId } : {}),
    ...(context.reviewId ? { reviewId: context.reviewId } : {}),
  };
}

function rideData(
  rideId: string,
  role: NotificationRole,
  type: string
): Record<string, string> {
  return {
    domain: 'ride',
    type,
    role,
    rideId,
  };
}

function orderLabel(orderNumber?: string): string {
  return orderNumber ? `order ${orderNumber}` : 'your order';
}

function amountLabel(amount?: number): string {
  return typeof amount === 'number' ? `Rs.${Math.round(amount)}` : 'the order amount';
}

export function buildCustomerFoodNotification(
  orderId: string,
  type: CustomerFoodNotificationType,
  context: FoodContext = {}
): NotificationPayload {
  const order = orderLabel(context.orderNumber);
  const restaurant = context.restaurantName || 'the restaurant';

  const templates: Record<CustomerFoodNotificationType, Omit<NotificationPayload, 'data'>> = {
    order_placed: {
      title: 'Order placed',
      body: `Your ${order} from ${restaurant} has been placed.`,
    },
    payment_success: {
      title: 'Payment successful',
      body: `Payment for ${order} from ${restaurant} was successful.`,
    },
    order_accepted: {
      title: 'Order accepted',
      body: `${restaurant} accepted ${order}.`,
    },
    order_rejected: {
      title: 'Order rejected',
      body: `${restaurant} rejected ${order}${context.reason ? `: ${context.reason}` : '.'}`,
    },
    food_preparing: {
      title: 'Food preparing',
      body: `${restaurant} is preparing ${order}.`,
    },
    driver_assigned: {
      title: 'Driver assigned',
      body: `A delivery partner has been assigned for ${order}.`,
    },
    food_picked_up: {
      title: 'Food picked up',
      body: `Your order is on the way from ${restaurant}.`,
    },
    driver_nearby: {
      title: 'Driver nearby',
      body: `Your delivery partner is nearby with ${order}.`,
    },
    order_delivered: {
      title: 'Order delivered',
      body: `${order} has been delivered. Enjoy your meal!`,
    },
    refund_processed: {
      title: 'Refund processed',
      body: `Refund for ${order} has been processed.`,
    },
    driver_reassigning: {
      title: 'Finding another driver',
      body: `We are assigning a new delivery partner for ${order}.`,
    },
  };

  return {
    ...templates[type],
    data: foodData(orderId, 'customer', type, context),
  };
}

export function buildRestaurantFoodNotification(
  orderId: string,
  type: RestaurantFoodNotificationType,
  context: FoodContext = {}
): NotificationPayload {
  const order = orderLabel(context.orderNumber);

  const templates: Record<RestaurantFoodNotificationType, Omit<NotificationPayload, 'data'>> = {
    new_order: {
      title: 'New order received',
      body: `Order ${context.orderNumber ?? orderId} for ${amountLabel(context.amount)} is waiting for acceptance.`,
    },
    order_paid: {
      title: 'Payment received',
      body: `Payment of ${amountLabel(context.amount)} received for ${order}.`,
    },
    driver_assigned: {
      title: 'Driver assigned',
      body: `A delivery partner has been assigned for ${order}.`,
    },
    driver_arrived: {
      title: 'Driver arrived',
      body: `The delivery partner has arrived at your restaurant for ${order}.`,
    },
    order_completed: {
      title: 'Order completed',
      body: `${order} has been delivered successfully.`,
    },
    order_cancelled: {
      title: 'Order cancelled',
      body: `${order} was cancelled by the customer.`,
    },
    driver_reassigning: {
      title: 'Reassigning driver',
      body: `Finding another delivery partner for ${order}.`,
    },
    new_review: {
      title: 'New review',
      body: `You received a ${context.rating ?? 'new'} star review.`,
    },
    low_stock_warning: {
      title: 'Low stock warning',
      body: `${context.itemName ?? 'A menu item'} is marked out of stock.`,
    },
  };

  return {
    ...templates[type],
    data: foodData(orderId, 'restaurant', type, context),
  };
}

export function buildDeliveryPartnerFoodNotification(
  orderId: string,
  type: DeliveryPartnerFoodNotificationType,
  context: FoodContext = {}
): NotificationPayload {
  const order = orderLabel(context.orderNumber);
  const restaurant = context.restaurantName || 'the restaurant';

  const templates: Record<
    DeliveryPartnerFoodNotificationType,
    Omit<NotificationPayload, 'data'>
  > = {
    food_pickup_now: {
      title: 'Pickup now',
      body: `Food is ready for pickup at ${restaurant} (${order}).`,
    },
    order_cancelled: {
      title: 'Order cancelled',
      body: `${order} was cancelled.`,
    },
    delivery_earnings: {
      title: 'Earnings added',
      body: `You earned ${amountLabel(context.earnings)} for completing ${order}.`,
    },
  };

  return {
    ...templates[type],
    data: foodData(orderId, 'delivery_partner', type, context),
  };
}

export function buildCustomerRideNotification(
  rideId: string,
  type: CustomerRideNotificationType,
  context: RideContext = {}
): NotificationPayload {
  const vehicle = context.vehicleType ?? 'your ride';

  const templates: Record<CustomerRideNotificationType, Omit<NotificationPayload, 'data'>> = {
    ride_accepted: {
      title: 'Driver found',
      body: `A driver has been assigned for ${vehicle}.`,
    },
    driver_moving: {
      title: 'Driver on the way',
      body: context.etaMinutes
        ? `Your driver is on the way. ETA about ${context.etaMinutes} min.`
        : 'Your driver is on the way to your pickup.',
    },
    driver_arrived: {
      title: 'Driver arrived',
      body: 'Your driver has arrived at the pickup point.',
    },
    ride_started: {
      title: 'Ride started',
      body: 'Your ride is in progress.',
    },
    ride_completed: {
      title: 'Ride completed',
      body: `Your ride is complete. Fare: ${amountLabel(context.fare)}.`,
    },
    ride_cancelled: {
      title: 'Ride cancelled',
      body: 'Your ride was cancelled.',
    },
    driver_cancelled: {
      title: 'Ride cancelled',
      body: 'Your driver cancelled the ride.',
    },
    payment_success: {
      title: 'Payment successful',
      body: `Ride payment of ${amountLabel(context.fare)} was successful.`,
    },
  };

  return {
    ...templates[type],
    data: rideData(rideId, 'customer', type),
  };
}

export function buildDriverRideNotification(
  rideId: string,
  type: DriverRideNotificationType,
  context: RideContext = {}
): NotificationPayload {
  const templates: Record<DriverRideNotificationType, Omit<NotificationPayload, 'data'>> = {
    ride_requested: {
      title: 'New ride request',
      body: `New ${context.vehicleType ?? 'ride'} request nearby.`,
    },
    ride_cancelled: {
      title: 'Ride cancelled',
      body: 'The customer cancelled this ride.',
    },
    ride_completed_earnings: {
      title: 'Earnings added',
      body: `You earned ${amountLabel(context.earnings)} for this ride.`,
    },
    payment_received: {
      title: 'Payment received',
      body: `Customer paid ${amountLabel(context.fare)} for the ride.`,
    },
    incentive_earned: {
      title: 'Incentive earned',
      body: context.incentiveLabel ?? 'You earned a new incentive bonus.',
    },
  };

  return {
    ...templates[type],
    data: rideData(rideId, 'driver', type),
  };
}

export function buildRestaurantMenuNotification(
  restaurantId: string,
  type: 'low_stock_warning',
  context: FoodContext
): NotificationPayload {
  return {
    title: 'Low stock warning',
    body: `${context.itemName ?? 'A menu item'} is marked out of stock.`,
    data: {
      domain: 'food',
      type,
      role: 'restaurant',
      restaurantId,
      ...(context.menuItemId ? { menuItemId: context.menuItemId } : {}),
    },
  };
}

export function buildRestaurantReviewNotification(
  restaurantId: string,
  context: FoodContext
): NotificationPayload {
  return {
    title: 'New review',
    body: `You received a ${context.rating ?? 'new'} star review.`,
    data: {
      domain: 'food',
      type: 'new_review',
      role: 'restaurant',
      restaurantId,
      ...(context.reviewId ? { reviewId: context.reviewId } : {}),
    },
  };
}

export function isInvalidFirebaseTokenError(err: unknown): boolean {
  const code =
    typeof err === 'object' && err !== null
      ? (err as { code?: string; errorInfo?: { code?: string } }).code ??
        (err as { errorInfo?: { code?: string } }).errorInfo?.code
      : undefined;
  return (
    code === 'messaging/registration-token-not-registered' ||
    code === 'messaging/invalid-registration-token'
  );
}
