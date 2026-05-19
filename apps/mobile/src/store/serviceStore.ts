import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const KEY = 'zygo_service';

export type ServiceMode = 'food' | 'rides';

type SvcState = {
  service: ServiceMode;
  hydrated: boolean;
  setService: (s: ServiceMode) => Promise<void>;
  hydrate: () => Promise<void>;
};

export const useServiceStore = create<SvcState>((set) => ({
  service: 'food',
  hydrated: false,
  setService: async (s) => {
    await AsyncStorage.setItem(KEY, s);
    set({ service: s });
  },
  hydrate: async () => {
    try {
      const v = await AsyncStorage.getItem(KEY);
      if (v === 'food' || v === 'rides') {
        set({ service: v });
      }
    } finally {
      set({ hydrated: true });
    }
  },
}));
