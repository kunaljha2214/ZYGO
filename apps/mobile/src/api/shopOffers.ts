import { api } from './client';
import type { OfferCampaign, ShopOffer, ShopOffersResponse, ShopOfferType, ShopCampaignType } from '../types/shopInsights';

type ShopOffersApiResponse = ShopOffersResponse & { offers?: ShopOffer[] };

function isOfferExpired(endDate: string): boolean {
  const end = new Date(endDate);
  return !Number.isNaN(end.getTime()) && end < new Date();
}

function splitOffersByExpiry(offers: ShopOffer[]): ShopOffersResponse {
  const activeOffers: ShopOffer[] = [];
  const historyOffers: ShopOffer[] = [];
  for (const offer of offers) {
    if (isOfferExpired(offer.endDate)) {
      historyOffers.push({ ...offer, isExpired: true });
    } else {
      activeOffers.push({ ...offer, isExpired: false });
    }
  }
  return { activeOffers, historyOffers };
}

function normalizeShopOffersResponse(data: ShopOffersApiResponse): ShopOffersResponse {
  if (Array.isArray(data.activeOffers) && Array.isArray(data.historyOffers)) {
    return {
      activeOffers: data.activeOffers,
      historyOffers: data.historyOffers,
    };
  }
  if (Array.isArray(data.offers)) {
    return splitOffersByExpiry(data.offers);
  }
  return { activeOffers: [], historyOffers: [] };
}

export async function fetchShopOffers(): Promise<ShopOffersResponse> {
  const { data } = await api.get<ShopOffersApiResponse>('/shop/offers');
  return normalizeShopOffersResponse(data);
}

export async function fetchAllShopOffers(): Promise<ShopOffer[]> {
  const { activeOffers, historyOffers } = await fetchShopOffers();
  return [...(activeOffers ?? []), ...(historyOffers ?? [])];
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

export async function reactivateShopOffer(id: string, validityDays = 30) {
  const { data } = await api.post<ShopOffer>(`/shop/offers/${id}/reactivate`, { validityDays });
  return data;
}
