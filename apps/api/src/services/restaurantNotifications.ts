/** @deprecated Import from `./foodNotifications` instead. */
import {
  dispatchRestaurantMenuEvent,
  dispatchRestaurantReviewEvent,
} from './foodNotifications';

type RestaurantNotificationOptions = {
  restaurantId: string;
  type: 'low_stock_warning' | 'new_review';
  title: string;
  body: string;
  extraData?: Record<string, string>;
};

export function dispatchRestaurantNotification(options: RestaurantNotificationOptions): void {
  if (options.type === 'low_stock_warning') {
    dispatchRestaurantMenuEvent(options.restaurantId, {
      itemName: options.extraData?.itemName,
      menuItemId: options.extraData?.menuItemId,
    });
    return;
  }

  if (options.type === 'new_review') {
    dispatchRestaurantReviewEvent(options.restaurantId, {
      reviewId: options.extraData?.reviewId,
      rating: options.extraData?.rating ? Number(options.extraData.rating) : undefined,
    });
  }
}
