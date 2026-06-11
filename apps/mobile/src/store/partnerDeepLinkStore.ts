import { create } from 'zustand';

type PartnerDeepLink = 'delivery_trip' | 'driver_trip' | null;

type State = {
  target: PartnerDeepLink;
  setTarget: (target: PartnerDeepLink) => void;
  consumeTarget: () => PartnerDeepLink;
};

export const usePartnerDeepLinkStore = create<State>((set, get) => ({
  target: null,
  setTarget: (target) => set({ target }),
  consumeTarget: () => {
    const target = get().target;
    set({ target: null });
    return target;
  },
}));
