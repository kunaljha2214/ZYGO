import { api } from './client';
import type {
  CrmCustomer,
  CrmCustomerDetail,
  CrmOverview,
  CrmReview,
  PersonalizedOffer,
} from '../types/shopInsights';

export async function fetchCrmOverview() {
  const { data } = await api.get<CrmOverview>('/shop/crm');
  return data;
}

export async function fetchCrmCustomers() {
  const { data } = await api.get<{ customers: CrmCustomer[] }>('/shop/crm/customers');
  return data.customers;
}

export async function fetchCrmCustomer(userId: string) {
  const { data } = await api.get<CrmCustomerDetail>(`/shop/crm/customers/${userId}`);
  return data;
}

export async function updateLoyaltyPoints(userId: string, points: number) {
  const { data } = await api.patch<{ userId: string; loyaltyPoints: number }>(
    `/shop/crm/customers/${userId}/loyalty`,
    { points }
  );
  return data;
}

export async function fetchCrmReviews() {
  const { data } = await api.get<{ reviews: CrmReview[]; averageRating: number | null }>(
    '/shop/crm/reviews'
  );
  return data;
}

export async function fetchPersonalizedOffers() {
  const { data } = await api.get<{
    personalizedOffers: PersonalizedOffer[];
    aiNote: string;
  }>('/shop/crm/personalized-offers');
  return data;
}
