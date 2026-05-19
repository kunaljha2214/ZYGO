import { api } from './client';
import type { OfferCampaign, ShopOffer, ShopOfferType, ShopCampaignType } from '../types/shopInsights';

export async function fetchShopOffers() {
  const { data } = await api.get<{ offers: ShopOffer[] }>('/shop/offers');
  return data.offers;
}

export async function fetchOfferCampaigns() {
  const { data } = await api.get<{ campaigns: OfferCampaign[] }>('/shop/offers/campaigns');
  return data.campaigns;
}

export async function fetchAiCouponTargeting() {
  const { data } = await api.get<{
    targeting: {
      userId: string;
      segment: string;
      suggestion: { code: string; title: string; offerType: ShopOfferType; discountValue: number };
    }[];
    aiNote: string;
  }>('/shop/offers/ai-targeting');
  return data;
}

export type CreateOfferPayload = {
  title: string;
  code: string;
  offerType: ShopOfferType;
  discountValue: number;
  minOrderAmount?: number;
  comboItemNames?: string[];
  isActive?: boolean;
  startDate: string;
  endDate: string;
  happyHourStart?: string;
  happyHourEnd?: string;
  campaignType?: ShopCampaignType;
  festivalName?: string;
  maxUses?: number;
};

export async function createShopOffer(payload: CreateOfferPayload) {
  const { data } = await api.post<ShopOffer>('/shop/offers', payload);
  return data;
}

export async function updateShopOffer(id: string, payload: Partial<CreateOfferPayload>) {
  const { data } = await api.put<ShopOffer>(`/shop/offers/${id}`, payload);
  return data;
}

export async function deleteShopOffer(id: string) {
  await api.delete(`/shop/offers/${id}`);
}

export async function toggleShopOffer(id: string) {
  const { data } = await api.patch<ShopOffer>(`/shop/offers/${id}/toggle`);
  return data;
}
