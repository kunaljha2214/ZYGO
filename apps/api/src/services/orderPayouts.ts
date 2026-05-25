import type { OrderPricingBreakdown } from './orderPricing';

/** Commission on food value (after discount). */
export const RESTAURANT_COMMISSION_RATE = 0.05;
/** Rider share of gross delivery fee (e.g. ₹35 of ₹40). */
export const RIDER_DELIVERY_SHARE = 0.875;

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export type OrderPayoutSnapshot = {
  restaurantEarnings: number;
  riderEarnings: number;
  zygoEarnings: number;
};

export function computeOrderPayouts(pricing: OrderPricingBreakdown): OrderPayoutSnapshot {
  const foodAfter = pricing.foodAfterDiscount;
  const restaurantCommission = roundMoney(foodAfter * RESTAURANT_COMMISSION_RATE);
  const restaurantEarnings = roundMoney(foodAfter - restaurantCommission);

  const deliveryGross = roundMoney(pricing.deliveryFee + pricing.deliveryDiscount);
  const riderEarnings =
    pricing.fulfillment === 'delivery' ? roundMoney(deliveryGross * RIDER_DELIVERY_SHARE) : 0;

  const zygoEarnings = roundMoney(
    Math.max(0, pricing.customerTotal - restaurantEarnings - riderEarnings)
  );

  return { restaurantEarnings, riderEarnings, zygoEarnings };
}
