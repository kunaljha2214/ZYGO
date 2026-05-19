import { api } from './client';
import type { PendingDeliveryPartner, PendingDriver, PendingShopRequest } from '../types/admin';

export async function fetchPendingShopRequests() {
  const { data } = await api.get<PendingShopRequest[]>('/shop/restaurant/pending');
  return data;
}

export async function approveShopRequest(registrationId: string) {
  const { data } = await api.post<{ registration: unknown }>(
    `/shop/restaurant/${registrationId}/approve`
  );
  return data;
}

export async function rejectShopRequest(registrationId: string, reason: string) {
  const { data } = await api.post<{ registration: unknown }>(
    `/shop/restaurant/${registrationId}/reject`,
    { reason }
  );
  return data;
}

export async function fetchPendingDeliveryPartners() {
  const { data } = await api.get<{ partners: PendingDeliveryPartner[] }>('/delivery-partner/admin/pending');
  return data.partners;
}

export async function approveDeliveryPartner(partnerId: string) {
  await api.post(`/delivery-partner/admin/${partnerId}/approve`);
}

export async function rejectDeliveryPartner(partnerId: string, reason: string) {
  await api.post(`/delivery-partner/admin/${partnerId}/reject`, { reason });
}

export async function fetchPendingDrivers() {
  const { data } = await api.get<{ drivers: PendingDriver[] }>('/driver/admin/pending');
  return data.drivers;
}

export async function approveDriver(driverId: string) {
  await api.post(`/driver/admin/${driverId}/approve`);
}

export async function rejectDriver(driverId: string, reason: string) {
  await api.post(`/driver/admin/${driverId}/reject`, { reason });
}

export async function blockDriver(driverId: string) {
  await api.post(`/driver/admin/${driverId}/block`);
}
