import {
  buildCustomerFoodNotification,
  buildCustomerRideNotification,
  buildDeliveryPartnerFoodNotification,
  buildDriverRideNotification,
  buildRestaurantFoodNotification,
  isInvalidFirebaseTokenError,
} from '../services/notificationEvents';

describe('notification events', () => {
  it('builds customer food payment notification data', () => {
    const notification = buildCustomerFoodNotification('order_1', 'payment_success', {
      orderNumber: 'ZY1234',
      restaurantName: 'Test Kitchen',
      restaurantId: 'rest_1',
    });

    expect(notification.title).toBe('Payment successful');
    expect(notification.data).toEqual({
      domain: 'food',
      type: 'payment_success',
      role: 'customer',
      orderId: 'order_1',
      restaurantId: 'rest_1',
    });
  });

  it('builds restaurant new order notification data', () => {
    const notification = buildRestaurantFoodNotification('order_2', 'new_order', {
      orderNumber: 'ZY5678',
      amount: 420,
    });

    expect(notification.title).toBe('New order received');
    expect(notification.data.type).toBe('new_order');
    expect(notification.data.role).toBe('restaurant');
    expect(notification.data.domain).toBe('food');
  });

  it('builds delivery partner pickup notification data', () => {
    const notification = buildDeliveryPartnerFoodNotification('order_3', 'food_pickup_now', {
      orderNumber: 'ZY9999',
      restaurantName: 'Kitchen',
    });

    expect(notification.data).toMatchObject({
      domain: 'food',
      type: 'food_pickup_now',
      role: 'delivery_partner',
      orderId: 'order_3',
    });
  });

  it('builds ride notifications for customer and driver', () => {
    const customer = buildCustomerRideNotification('ride_1', 'ride_accepted', {
      vehicleType: 'bike',
    });
    const driver = buildDriverRideNotification('ride_1', 'ride_requested', {
      vehicleType: 'bike',
    });

    expect(customer.data).toEqual({
      domain: 'ride',
      type: 'ride_accepted',
      role: 'customer',
      rideId: 'ride_1',
    });
    expect(driver.data).toEqual({
      domain: 'ride',
      type: 'ride_requested',
      role: 'driver',
      rideId: 'ride_1',
    });
  });

  it('recognizes Firebase invalid-token errors for cleanup', () => {
    expect(isInvalidFirebaseTokenError({ code: 'messaging/registration-token-not-registered' })).toBe(
      true
    );
    expect(isInvalidFirebaseTokenError({ errorInfo: { code: 'messaging/invalid-registration-token' } })).toBe(
      true
    );
    expect(isInvalidFirebaseTokenError(new Error('network'))).toBe(false);
  });
});
