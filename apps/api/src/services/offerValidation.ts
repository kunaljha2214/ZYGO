import createError from 'http-errors';
import type { Types } from 'mongoose';
import { ShopOffer, type IShopOffer } from '../models/ShopOffer';

const DEFAULT_DELIVERY_WAIVER = 40;

export type ValidateOfferInput = {
  restaurantId: string | Types.ObjectId;
  userId: string;
  subtotal: number;
  couponCode: string;
  cartItemNames?: string[];
};

export type ValidatedOffer = {
  offerId: string;
  code: string;
  title: string;
  offerType: IShopOffer['offerType'];
  discountAmount: number;
  subtotal: number;
  finalTotal: number;
};

function minutesNow(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

function parseHm(hm: string): number {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + m;
}

function isWithinHappyHour(now: Date, start: string, end: string): boolean {
  const mins = minutesNow(now);
  const from = parseHm(start);
  const to = parseHm(end);
  if (from <= to) return mins >= from && mins <= to;
  return mins >= from || mins <= to;
}

function cartMatchesCombo(cartItemNames: string[], comboItemNames: string[]): boolean {
  if (comboItemNames.length === 0) return true;
  const cartLower = cartItemNames.map((n) => n.toLowerCase());
  return comboItemNames.every((combo) => {
    const key = combo.trim().toLowerCase();
    if (!key) return true;
    return cartLower.some(
      (name) => name.includes(key) || key.includes(name)
    );
  });
}

function computeDiscount(offer: IShopOffer, subtotal: number): number {
  if (offer.offerType === 'flat') {
    return offer.discountValue;
  }
  if (offer.offerType === 'percentage' || offer.offerType === 'combo') {
    return (subtotal * offer.discountValue) / 100;
  }
  if (offer.offerType === 'free_delivery') {
    return offer.discountValue > 0 ? offer.discountValue : DEFAULT_DELIVERY_WAIVER;
  }
  return 0;
}

export async function validateShopOffer(
  input: ValidateOfferInput
): Promise<ValidatedOffer> {
  const subtotal = Math.round(input.subtotal * 100) / 100;
  if (subtotal <= 0) {
    throw createError(400, 'Cart total must be greater than zero');
  }

  const code = input.couponCode.trim().toUpperCase();
  if (!code) {
    throw createError(400, 'Enter a coupon code');
  }

  const offer = await ShopOffer.findOne({
    restaurantId: input.restaurantId,
    code,
    isActive: true,
  });

  if (!offer) {
    throw createError(400, 'Invalid or inactive coupon code');
  }

  const now = new Date();
  if (now < offer.startDate) {
    throw createError(400, 'This coupon is not active yet');
  }
  if (now > offer.endDate) {
    throw createError(400, 'This coupon has expired');
  }

  if (offer.maxUses != null && offer.usageCount >= offer.maxUses) {
    throw createError(400, 'This coupon has reached its usage limit');
  }

  const targets = offer.targetCustomerIds ?? [];
  if (
    targets.length > 0 &&
    !targets.some((id) => id.toString() === input.userId)
  ) {
    throw createError(403, 'This coupon is not available for your account');
  }

  if (subtotal < offer.minOrderAmount) {
    throw createError(
      400,
      `Minimum order ₹${offer.minOrderAmount} required (your cart is ₹${subtotal})`
    );
  }

  if (
    offer.campaignType === 'happy_hour' &&
    offer.happyHourStart &&
    offer.happyHourEnd &&
    !isWithinHappyHour(now, offer.happyHourStart, offer.happyHourEnd)
  ) {
    throw createError(
      400,
      `Valid only during happy hour (${offer.happyHourStart}–${offer.happyHourEnd})`
    );
  }

  if (offer.offerType === 'combo' && offer.comboItemNames.length > 0) {
    const names = input.cartItemNames ?? [];
    if (!cartMatchesCombo(names, offer.comboItemNames)) {
      throw createError(
        400,
        `Add required items for this combo: ${offer.comboItemNames.join(', ')}`
      );
    }
  }

  let discountAmount = computeDiscount(offer, subtotal);
  discountAmount = Math.min(discountAmount, subtotal);
  discountAmount = Math.round(discountAmount * 100) / 100;
  const finalTotal = Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100);

  return {
    offerId: offer._id.toString(),
    code: offer.code,
    title: offer.title,
    offerType: offer.offerType,
    discountAmount,
    subtotal,
    finalTotal,
  };
}

export function serializePublicOffer(o: IShopOffer | Record<string, unknown>) {
  const doc = o as IShopOffer & { _id: { toString(): string } };
  let summary = '';
  if (doc.offerType === 'flat') summary = `₹${doc.discountValue} off`;
  else if (doc.offerType === 'percentage') summary = `${doc.discountValue}% off`;
  else if (doc.offerType === 'combo') summary = `${doc.discountValue}% off combo`;
  else summary = 'Free delivery';

  return {
    id: doc._id.toString(),
    title: doc.title,
    code: doc.code,
    offerType: doc.offerType,
    discountValue: doc.discountValue,
    minOrderAmount: doc.minOrderAmount,
    summary,
    campaignType: doc.campaignType,
    festivalName: doc.festivalName,
    happyHourStart: doc.happyHourStart,
    happyHourEnd: doc.happyHourEnd,
    endDate: doc.endDate,
  };
}
