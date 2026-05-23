import { api } from './client';
import type {
  OwnerRestaurantRegistration,
  RestaurantRegistrationPayload,
} from '../types/shopOwner';

export async function fetchMyRestaurantRegistration() {
  const { data } = await api.get<{ registration: OwnerRestaurantRegistration | null }>(
    '/shop/restaurant/mine'
  );
  return data.registration;
}

export async function saveRestaurantRegistration(payload: RestaurantRegistrationPayload) {
  const { data } = await api.put<{ registration: OwnerRestaurantRegistration }>(
    '/shop/restaurant',
    payload
  );
  return data.registration;
}

export async function uploadRestaurantDocument(
  type: 'gst' | 'pan' | 'fssai',
  dataUrl: string,
  fileName?: string
) {
  const { data } = await api.post<{ registration: OwnerRestaurantRegistration }>(
    '/shop/restaurant/documents',
    { type, dataUrl, fileName }
  );
  return data.registration;
}

export async function uploadRestaurantCoverPhoto(dataUrl: string) {
  const { data } = await api.post<{ registration: OwnerRestaurantRegistration }>(
    '/shop/restaurant/cover-photo',
    { dataUrl }
  );
  return data.registration;
}

export async function submitRestaurantRegistration() {
  const { data } = await api.post<{ registration: OwnerRestaurantRegistration }>(
    '/shop/restaurant/submit'
  );
  return data.registration;
}

export type ShopMenuItem = {
  id: string;
  name: string;
  price: number;
  category: string;
  isVeg: boolean;
  isAvailable: boolean;
};

export type ShopMenuResponse = {
  approved: boolean;
  approvalStatus?: string;
  message?: string;
  restaurantId?: string;
  items: ShopMenuItem[];
};

export async function fetchMyShopMenu() {
  const { data } = await api.get<ShopMenuResponse>('/shop/menu');
  return data;
}

export async function createShopMenuItem(payload: {
  name: string;
  price: number;
  category: string;
  isVeg: boolean;
}) {
  const { data } = await api.post<{ item: ShopMenuItem }>('/shop/menu', payload);
  return data.item;
}

export async function deleteShopMenuItem(itemId: string) {
  await api.delete(`/shop/menu/${itemId}`);
}

export async function fetchShopOpenStatus() {
  const { data } = await api.get<{ isAcceptingOrders: boolean; restaurantId: string }>(
    '/shop/restaurant/open-status'
  );
  return data;
}

export async function setShopOpenStatus(isAcceptingOrders: boolean) {
  const { data } = await api.patch<{ isAcceptingOrders: boolean; restaurantId: string }>(
    '/shop/restaurant/open-status',
    { isAcceptingOrders }
  );
  return data;
}
