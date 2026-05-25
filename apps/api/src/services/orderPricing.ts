import { haversineKm } from '../utils/geo';

/** 5% of food value after discount — packaging / platform service on food. */
export const PACKAGE_FEE_RATE = 0.05;
/** 5% of food value after discount — GST on food leg (refine with CA for production). */
export const GST_RATE = 0.05;

export type OrderFulfillment = 'delivery' | 'pickup';

export type OrderPricingInput = {
  foodSubtotal: number;
  discountAmount: number;
  /** When coupon is `free_delivery`, discount applies to delivery, not food. */
  offerType?: string;
  distanceKm: number;
  fulfillment: OrderFulfillment;
};

export type OrderPricingBreakdown = {
  foodSubtotal: number;
  /** Discount applied to food (coupons except free delivery). */
  foodDiscountAmount: number;
  foodAfterDiscount: number;
  deliveryFee: number;
  deliveryDiscount: number;
  packageFee: number;
  gstAmount: number;
  customerTotal: number;
  distanceKm: number;
  fulfillment: OrderFulfillment;
};

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Distance-based delivery component (e.g. ~₹40 at 4 km). */
export function computeDeliveryFeeKm(distanceKm: number): number {
  const km = Math.max(0, distanceKm);
  return Math.min(65, Math.max(25, Math.round(15 + 6.25 * km)));
}

export function deliveryDistanceKm(
  restaurant: { lat: number; lng: number },
  delivery: { lat: number; lng: number }
): number {
  return Math.round(haversineKm(restaurant, delivery) * 100) / 100;
}

export function computeOrderPricing(input: OrderPricingInput): OrderPricingBreakdown {
  const foodSubtotal = roundMoney(input.foodSubtotal);
  const couponDiscount = roundMoney(input.discountAmount);
  const isFreeDeliveryCoupon = input.offerType === 'free_delivery';

  let foodDiscountAmount = 0;
  let foodAfterDiscount = foodSubtotal;
  let deliveryFee = 0;
  let deliveryDiscount = 0;

  if (input.fulfillment === 'delivery') {
    deliveryFee = computeDeliveryFeeKm(input.distanceKm);
    if (isFreeDeliveryCoupon) {
      deliveryDiscount = Math.min(couponDiscount, deliveryFee);
    } else {
      foodDiscountAmount = Math.min(couponDiscount, foodSubtotal);
      foodAfterDiscount = Math.max(0, roundMoney(foodSubtotal - foodDiscountAmount));
    }
    deliveryFee = Math.max(0, roundMoney(deliveryFee - deliveryDiscount));
  } else {
    foodDiscountAmount = Math.min(couponDiscount, foodSubtotal);
    foodAfterDiscount = Math.max(0, roundMoney(foodSubtotal - foodDiscountAmount));
  }

  const packageFee = roundMoney(foodAfterDiscount * PACKAGE_FEE_RATE);
  const gstAmount = roundMoney(foodAfterDiscount * GST_RATE);
  const customerTotal = roundMoney(
    foodAfterDiscount + packageFee + gstAmount + deliveryFee
  );

  return {
    foodSubtotal,
    foodDiscountAmount,
    foodAfterDiscount,
    deliveryFee,
    deliveryDiscount,
    packageFee,
    gstAmount,
    customerTotal,
    distanceKm: input.distanceKm,
    fulfillment: input.fulfillment,
  };
}

export type CustomerPriceBreakdown = {
  food: number;
  foodDiscount: number;
  deliveryFee: number;
  deliveryDiscount: number;
  packageFee: number;
  packageFeePercent: number;
  gstAmount: number;
  gstPercent: number;
  distanceKm: number;
  toPay: number;
  fulfillment: OrderFulfillment;
  tagline: string;
};

export function formatCustomerQuote(pricing: OrderPricingBreakdown): CustomerPriceBreakdown {
  const deliveryFeeGross =
    pricing.fulfillment === 'delivery'
      ? roundMoney(pricing.deliveryFee + pricing.deliveryDiscount)
      : 0;

  return {
    food: pricing.foodSubtotal,
    foodDiscount: pricing.foodDiscountAmount,
    deliveryFee: deliveryFeeGross,
    deliveryDiscount: pricing.deliveryDiscount,
    packageFee: pricing.packageFee,
    packageFeePercent: Math.round(PACKAGE_FEE_RATE * 100),
    gstAmount: pricing.gstAmount,
    gstPercent: Math.round(GST_RATE * 100),
    distanceKm: pricing.distanceKm,
    toPay: pricing.customerTotal,
    fulfillment: pricing.fulfillment,
    tagline:
      pricing.fulfillment === 'pickup'
        ? 'Same price as the restaurant counter. No hidden charges.'
        : 'Same menu price as the restaurant. No hidden charges.',
  };
}

export function formatCustomerQuoteFromOrder(o: {
  subtotal: number;
  foodDiscountAmount?: number;
  deliveryDiscount?: number;
  /** Legacy orders: total discount before split fields existed. */
  discountAmount?: number;
  deliveryFee?: number;
  packageFee?: number;
  gstAmount?: number;
  deliveryDistanceKm?: number;
  total: number;
  fulfillment?: OrderFulfillment;
}): CustomerPriceBreakdown {
  const food = o.subtotal;
  const deliveryDiscount = o.deliveryDiscount ?? 0;
  const foodDiscount =
    (o.foodDiscountAmount ?? 0) > 0
      ? (o.foodDiscountAmount as number)
      : deliveryDiscount > 0
        ? 0
        : (o.discountAmount ?? 0);
  const deliveryFeeNet = o.deliveryFee ?? 0;
  const deliveryFeeGross = roundMoney(deliveryFeeNet + deliveryDiscount);
  const fulfillment = o.fulfillment ?? 'delivery';

  return {
    food,
    foodDiscount,
    deliveryFee: fulfillment === 'delivery' ? deliveryFeeGross : 0,
    deliveryDiscount,
    packageFee: o.packageFee ?? 0,
    packageFeePercent: Math.round(PACKAGE_FEE_RATE * 100),
    gstAmount: o.gstAmount ?? 0,
    gstPercent: Math.round(GST_RATE * 100),
    distanceKm: o.deliveryDistanceKm ?? 0,
    toPay: o.total,
    fulfillment,
    tagline:
      fulfillment === 'pickup'
        ? 'Same price as the restaurant counter. No hidden charges.'
        : 'Same menu price as the restaurant. No hidden charges.',
  };
}
