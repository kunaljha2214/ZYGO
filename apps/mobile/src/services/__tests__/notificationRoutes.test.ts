import { routeFromNotificationData } from '../notificationRoutes';

describe('notificationRoutes', () => {
  it('routes customer food notifications to food order detail', () => {
    expect(
      routeFromNotificationData({ role: 'customer', domain: 'food', orderId: 'order_1' })
    ).toEqual({
      root: 'Main',
      screen: 'Orders',
      params: {
        screen: 'FoodOrderDetail',
        params: { orderId: 'order_1' },
      },
    });
  });

  it('routes restaurant order notifications to shop order detail', () => {
    expect(
      routeFromNotificationData({ role: 'restaurant', domain: 'food', orderId: 'order_2' })
    ).toEqual({
      root: 'PartnerMain',
      screen: 'ShopOrders',
      params: {
        screen: 'ShopOrderDetail',
        params: { orderId: 'order_2' },
      },
    });
  });

  it('routes delivery partner notifications to partner home', () => {
    expect(
      routeFromNotificationData({ role: 'delivery_partner', domain: 'food', orderId: 'order_3' })
    ).toEqual({ root: 'PartnerMain' });
  });

  it('routes customer ride notifications to ride track', () => {
    expect(routeFromNotificationData({ role: 'customer', domain: 'ride', rideId: 'ride_1' })).toEqual(
      {
        root: 'Main',
        screen: 'Home',
        params: {
          screen: 'RideTrack',
          params: { rideId: 'ride_1' },
        },
      }
    );
  });

  it('routes driver ride notifications to partner home', () => {
    expect(routeFromNotificationData({ role: 'driver', domain: 'ride', rideId: 'ride_2' })).toEqual({
      root: 'PartnerMain',
    });
  });
});
