import { create } from 'zustand';
import type { DeliveryRequest } from '../types/deliveryPartner';

type State = {
  incoming: DeliveryRequest | null;
  setIncoming: (req: DeliveryRequest | null) => void;
};

export const useDeliveryRequestStore = create<State>((set) => ({
  incoming: null,
  setIncoming: (incoming) => set({ incoming }),
}));
