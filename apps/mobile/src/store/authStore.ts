import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { disconnectDriverSocket } from '../services/driverSocket';
import { disconnectDeliverySocket } from '../services/deliverySocket';
import { useDriverRequestStore } from './driverRequestStore';
import { useDeliveryRequestStore } from './deliveryRequestStore';
import { queryClient } from '../queryClient';
import { api } from '../api/client';

const STORAGE_KEY = 'zygo_auth';

export type AuthUser = {
  id: string;
  phone: string;
  name: string;
  role: string;
  email?: string | null;
  emailVerified?: boolean;
  driverVehicleType?: 'bike' | 'auto' | 'car' | null;
};

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  hydrated: boolean;
  setAuth: (token: string, user: AuthUser) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
};

async function goOfflineIfDriver(user: AuthUser | null): Promise<void> {
  if (user?.role !== 'driver') return;
  try {
    await api.patch('/driver/online', { online: false });
  } catch {
    /* best-effort before token cleared */
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  hydrated: false,
  setAuth: async (token, user) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }));
    set({ token, user });
  },
  logout: async () => {
    const user = get().user;
    await goOfflineIfDriver(user);

    disconnectDriverSocket();
    disconnectDeliverySocket();
    useDriverRequestStore.getState().setIncoming(null);
    useDriverRequestStore.getState().setDriverOnline(false);
    useDeliveryRequestStore.getState().setIncoming(null);
    queryClient.clear();

    set({ token: null, user: null });

    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {
      /* UI already signed out */
    }
  },
  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { token: string; user: AuthUser };
        set({ token: parsed.token, user: parsed.user });
      }
    } catch {
      // ignore corrupt storage
    } finally {
      set({ hydrated: true });
    }
  },
}));
