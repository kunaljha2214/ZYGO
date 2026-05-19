import { api } from './client';
import type { ShopDashboard } from '../types/shopDashboard';

export async function fetchShopDashboard() {
  const { data } = await api.get<ShopDashboard>('/shop/dashboard');
  return data;
}
