import { api } from './client';
import type {
  AiSuggestions,
  MenuCategory,
  MenuItemFull,
  MenuItemPayload,
  MenuManagementResponse,
} from '../types/menu';

export async function fetchMenuManagement() {
  const { data } = await api.get<MenuManagementResponse>('/shop/menu/manage');
  return data;
}

export async function createCategory(name: string, sortOrder = 0) {
  const { data } = await api.post<{ category: MenuCategory }>('/shop/menu/categories', {
    name,
    sortOrder,
  });
  return data.category;
}

export async function updateCategory(
  id: string,
  patch: Partial<{ name: string; sortOrder: number; isActive: boolean }>
) {
  const { data } = await api.put<{ category: MenuCategory }>(`/shop/menu/categories/${id}`, patch);
  return data.category;
}

export async function deleteCategory(id: string) {
  await api.delete(`/shop/menu/categories/${id}`);
}

export async function createMenuItem(payload: MenuItemPayload) {
  const { data } = await api.post<{ item: MenuItemFull }>('/shop/menu/items', payload);
  return data.item;
}

export async function updateMenuItem(itemId: string, payload: Partial<MenuItemPayload>) {
  const { data } = await api.put<{ item: MenuItemFull }>(`/shop/menu/items/${itemId}`, payload);
  return data.item;
}

export async function patchItemAvailability(
  itemId: string,
  patch: {
    stockStatus?: 'in_stock' | 'out_of_stock';
    isAvailable?: boolean;
    autoDisableAt?: string | null;
  }
) {
  const { data } = await api.patch<{ item: MenuItemFull }>(
    `/shop/menu/items/${itemId}/availability`,
    patch
  );
  return data.item;
}

export async function deleteMenuItem(itemId: string) {
  await api.delete(`/shop/menu/items/${itemId}`);
}

export async function importMenuCsv(csv: string) {
  const { data } = await api.post<{ imported: number; names: string[] }>('/shop/menu/bulk/csv', {
    csv,
  });
  return data;
}

export async function exportMenuCsv() {
  const { data } = await api.get<{ csv: string }>('/shop/menu/export/csv');
  return data.csv;
}

export async function fetchAiSuggestions() {
  const { data } = await api.get<AiSuggestions>('/shop/menu/ai/suggestions');
  return data;
}
