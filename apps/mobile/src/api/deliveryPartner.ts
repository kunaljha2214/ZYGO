import { api } from './client';
import type {
  DeliveryPartnerProfile,
  DeliveryRequest,
  EarningsDashboard,
  PartnerOrder,
} from '../types/deliveryPartner';

export async function fetchDeliveryProfile() {
  const { data } = await api.get<{ profile: DeliveryPartnerProfile }>('/delivery-partner/profile');
  return data.profile;
}

export async function uploadPartnerDocument(type: string, dataUrl: string, fileName?: string) {
  const { data } = await api.post<{ profile: DeliveryPartnerProfile }>('/delivery-partner/documents', {
    type,
    dataUrl,
    fileName,
  });
  return data.profile;
}

export async function submitPartnerForReview() {
  const { data } = await api.post<{ profile: DeliveryPartnerProfile }>('/delivery-partner/submit');
  return data.profile;
}

export async function setPartnerOnline(online: boolean) {
  const { data } = await api.patch<{ isOnline: boolean; isBusy: boolean }>('/delivery-partner/online', {
    online,
  });
  return data;
}

export async function updatePartnerLocation(lat: number, lng: number, orderId?: string) {
  await api.patch('/delivery-partner/location', { lat, lng, orderId });
}

export async function acceptDelivery(orderId: string) {
  const { data } = await api.post<{ order: PartnerOrder }>(`/delivery-partner/orders/${orderId}/accept`);
  return data.order;
}

export async function rejectDelivery(orderId: string) {
  await api.post(`/delivery-partner/orders/${orderId}/reject`);
}

export async function advanceDelivery(orderId: string, status?: string) {
  const { data } = await api.patch<{ order: PartnerOrder }>(`/delivery-partner/orders/${orderId}/status`, {
    status,
  });
  return data.order;
}

export async function verifyDeliveryOtp(orderId: string, otp: string) {
  const { data } = await api.post<{ ok: boolean; verifiedAt?: string }>(
    `/delivery-partner/orders/${orderId}/otp/verify`,
    { otp }
  );
  return data;
}

export async function fetchIncomingDelivery() {
  const { data } = await api.get<{ request: DeliveryRequest | null }>('/delivery-partner/incoming');
  return data.request;
}

export async function fetchActiveDelivery() {
  const { data } = await api.get<{ order: PartnerOrder | null }>('/delivery-partner/active');
  return data.order;
}

export async function fetchEarningsDashboard() {
  const { data } = await api.get<EarningsDashboard>('/delivery-partner/earnings');
  return data;
}

export async function fetchDeliveryHistory() {
  const { data } = await api.get<{
    history: {
      id: string;
      orderNumber: string;
      total: number;
      earnings?: number;
      deliveredAt?: string;
      restaurantName?: string;
    }[];
  }>('/delivery-partner/history');
  return data.history;
}

export async function fetchPartnerWallet() {
  const { data } = await api.get<{
    pending: number;
    totalEarned: number;
    entries: { id: string; amount: number; type: string; status: string; orderNumber: string; createdAt: string }[];
  }>('/delivery-partner/wallet');
  return data;
}

export type { DeliveryRequest };
