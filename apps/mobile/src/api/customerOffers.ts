import { api } from './client';

export type CustomerOffer = {
  id: string;
  title: string;
  code: string;
  offerType: string;
  discountValue: number;
  minOrderAmount: number;
  summary: string;
  campaignType: string;
  festivalName?: string;
  happyHourStart?: string;
  happyHourEnd?: string;
  endDate: string;
};

export type ValidatedCoupon = {
  offerId: string;
  code: string;
  title: string;
  offerType: string;
  discountAmount: number;
  subtotal: number;
  finalTotal: number;
};

export async function fetchRestaurantOffers(restaurantId: string) {
  const { data } = await api.get<{ offers: CustomerOffer[] }>(
    `/restaurants/${restaurantId}/offers`
  );
  return data.offers;
}

export async function validateRestaurantCoupon(
  restaurantId: string,
  payload: { code: string; subtotal: number; cartItemNames: string[] }
) {
  const { data } = await api.post<ValidatedCoupon>(
    `/restaurants/${restaurantId}/offers/validate`,
    payload
  );
  return data;
}
