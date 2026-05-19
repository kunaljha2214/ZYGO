import { api } from './client';
import type { ShopAnalytics } from '../types/shopInsights';

export async function fetchShopAnalytics(period: '7d' | '30d' | '90d' = '30d') {
  const { data } = await api.get<ShopAnalytics>('/shop/analytics', { params: { period } });
  return data;
}
