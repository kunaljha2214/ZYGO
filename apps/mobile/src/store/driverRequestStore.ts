import { create } from 'zustand';
import type { RideRequest } from '../types/driver';

type State = {
  incoming: RideRequest | null;
  setIncoming: (r: RideRequest | null) => void;
};

export const useDriverRequestStore = create<State>((set) => ({
  incoming: null,
  setIncoming: (incoming) => set({ incoming }),
}));
