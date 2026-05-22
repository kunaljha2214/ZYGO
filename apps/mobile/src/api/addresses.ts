import { api } from './client';

export type SavedAddressKind = 'home' | 'work' | 'other';

export type SavedAddress = {
  _id: string;
  label: string;
  line1: string;
  city?: string;
  area?: string;
  contactName?: string;
  contactPhone?: string;
  addressKind?: SavedAddressKind;
  isDefault?: boolean;
  coordinates: { lat: number; lng: number };
};

export type CreateSavedAddressBody = {
  label: string;
  line1: string;
  city?: string;
  area?: string;
  contactName?: string;
  contactPhone?: string;
  addressKind?: SavedAddressKind;
  isDefault?: boolean;
  coordinates: { lat: number; lng: number };
};

export async function fetchSavedAddresses() {
  const { data } = await api.get<SavedAddress[]>('/users/addresses');
  return data;
}

export async function createSavedAddress(body: CreateSavedAddressBody) {
  const { data } = await api.post<SavedAddress>('/users/addresses', body);
  return data;
}

export async function setDefaultSavedAddress(id: string) {
  const { data } = await api.patch<SavedAddress>(`/users/addresses/${id}/default`);
  return data;
}

export async function deleteSavedAddress(id: string) {
  await api.delete(`/users/addresses/${id}`);
}
