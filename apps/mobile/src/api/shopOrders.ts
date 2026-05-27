import { api } from './client';
import type {
  KitchenDisplay,
  OrderAlerts,
  ShopOrder,
  ShopOrderInsights,
  ShopOrdersList,
} from '../types/shopOrders';

export async function fetchShopOrders(status?: string) {
  const { data } = await api.get<ShopOrdersList>('/shop/orders', {
    params: status ? { status } : undefined,
  });
  return data;
}

export async function fetchOrderAlerts(since?: string) {
  const { data } = await api.get<OrderAlerts>('/shop/orders/alerts', {
    params: since ? { since } : undefined,
  });
  return data;
}

export async function fetchKitchenDisplay() {
  const { data } = await api.get<KitchenDisplay>('/shop/orders/kitchen');
  return data;
}

export async function fetchShopOrderInsights() {
  const { data } = await api.get<ShopOrderInsights>('/shop/orders/insights');
  return data;
}

export async function fetchShopOrder(orderId: string) {
  const { data } = await api.get<ShopOrder>(`/shop/orders/${orderId}`);
  return data;
}

export async function acceptShopOrder(orderId: string, estimatedPrepMinutes?: number) {
  const { data } = await api.post<ShopOrder>(`/shop/orders/${orderId}/accept`, {
    estimatedPrepMinutes,
  });
  return data;
}

export async function rejectShopOrder(orderId: string, reason: string) {
  const { data } = await api.post<ShopOrder>(`/shop/orders/${orderId}/reject`, { reason });
  return data;
}

export async function advanceShopOrderStatus(orderId: string, status?: string) {
  const { data } = await api.patch<ShopOrder>(`/shop/orders/${orderId}/status`, {
    status,
  });
  return data;
}

export async function updateShopOrderNotes(orderId: string, shopNotes: string) {
  const { data } = await api.patch<ShopOrder>(`/shop/orders/${orderId}/notes`, { shopNotes });
  return data;
}

export async function printShopInvoice(orderId: string) {
  const { data } = await api.post<ShopOrder>(`/shop/orders/${orderId}/print-invoice`);
  return data;
}

export async function retryShopOrderRiderDispatch(orderId: string) {
  const { data } = await api.post<ShopOrder>(`/shop/orders/${orderId}/retry-rider-dispatch`);
  return data;
}
