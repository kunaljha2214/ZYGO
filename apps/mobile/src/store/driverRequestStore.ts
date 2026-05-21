import { create } from 'zustand';
import type { RideRequest } from '../types/driver';

type State = {
  incoming: RideRequest | null;
  isOnline: boolean;
  setIncoming: (r: RideRequest | null) => void;
  setDriverOnline: (online: boolean) => void;
};

export const useDriverRequestStore = create<State>((set) => ({
  incoming: null,
  isOnline: false,
  setIncoming: (incoming) => set({ incoming }),
  setDriverOnline: (isOnline) => set({ isOnline }),
}));
