import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { disconnectDriverSocket } from '../services/driverSocket';
import { disconnectDeliverySocket } from '../services/deliverySocket';
import { useDriverRequestStore } from './driverRequestStore';
import { clearDriverHubCache } from './driverHubCache';
import { clearDriverProfileCache } from './partnerProfileCache';
import { useDeliveryRequestStore } from './deliveryRequestStore';
import { queryClient } from '../queryClient';
import { api } from '../api/client';
import { unregisterCurrentPushToken } from '../services/notifications';

const STORAGE_KEY = 'zygo_auth';

export type AuthUser = {
  id: string;
  phone: string;
  name: string;
  role: string;
  email?: string | null;
  emailVerified?: boolean;
  driverVehicleType?: 'bike' | 'auto' | 'car' | null;
  profilePhotoUrl?: string | null;
};

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  hydrated: boolean;
  setAuth: (token: string, user: AuthUser) => Promise<void>;
  patchUser: (partial: Partial<AuthUser>) => Promise<void>;
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
  patchUser: async (partial) => {
    const { token, user } = get();
    if (!token || !user) return;
    const next = { ...user, ...partial };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user: next }));
    set({ user: next });
  },
  logout: async () => {
    const user = get().user;
    await goOfflineIfDriver(user);
    await unregisterCurrentPushToken();

    disconnectDriverSocket();
    disconnectDeliverySocket();
    useDriverRequestStore.getState().setIncoming(null);
    useDriverRequestStore.getState().setDriverOnline(false);
    clearDriverHubCache();
    clearDriverProfileCache();
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
