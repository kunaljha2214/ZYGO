export type NotificationData = {
  role?: string;
  domain?: string;
  orderId?: string;
  rideId?: string;
};

export type NotificationRoute =
  | {
      root: 'Main';
      screen: 'Orders';
      params: {
        screen: 'FoodOrderDetail';
        params: { orderId: string };
      };
    }
  | {
      root: 'Main';
      screen: 'Home';
      params: {
        screen: 'RideTrack';
        params: { rideId: string };
      };
    }
  | {
      root: 'PartnerMain';
      screen: 'ShopOrders';
      params: {
        screen: 'ShopOrderDetail';
        params: { orderId: string };
      };
    }
  | {
      root: 'PartnerMain';
    };

export function routeFromNotificationData(data: NotificationData): NotificationRoute | null {
  if (data.domain === 'ride' || data.rideId) {
    if (!data.rideId) return null;
    if (data.role === 'driver') {
      return { root: 'PartnerMain' };
    }
    return {
      root: 'Main',
      screen: 'Home',
      params: {
        screen: 'RideTrack',
        params: { rideId: data.rideId },
      },
    };
  }

  if (!data.orderId) return null;

  if (data.role === 'restaurant') {
    return {
      root: 'PartnerMain',
      screen: 'ShopOrders',
      params: {
        screen: 'ShopOrderDetail',
        params: { orderId: data.orderId },
      },
    };
  }

  if (data.role === 'delivery_partner') {
    return { root: 'PartnerMain' };
  }

  if (data.role === 'customer' || !data.role) {
    return {
      root: 'Main',
      screen: 'Orders',
      params: {
        screen: 'FoodOrderDetail',
        params: { orderId: data.orderId },
      },
    };
  }

  return null;
}
