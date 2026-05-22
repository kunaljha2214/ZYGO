import { create } from 'zustand';

export const FOOD_DELIVERY_RADIUS_KM = 7;

export type FoodDeliveryLocation = {
  source: 'current' | 'saved';
  id: string;
  label: string;
  line1: string;
  coordinates: { lat: number; lng: number };
};

type State = {
  selected: FoodDeliveryLocation | null;
  setSelected: (loc: FoodDeliveryLocation | null) => void;
};

export const useFoodDeliveryLocationStore = create<State>((set) => ({
  selected: null,
  setSelected: (loc) => set({ selected: loc }),
}));
