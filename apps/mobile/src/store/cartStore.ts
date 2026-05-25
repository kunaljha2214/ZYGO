import { create } from 'zustand';
import { lineKeyForCartLine } from './cartLineKey';
import type { ValidatedCoupon } from '../api/customerOffers';

export type CartLine = {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  /** Size / style option (e.g. Small, Large). */
  variantName?: string;
  addOnNames?: string[];
};

type CartState = {
  restaurantId: string | null;
  restaurantName: string | null;
  items: CartLine[];
  customerNotes: string;
  appliedCoupon: ValidatedCoupon | null;
  setRestaurant: (id: string, name: string) => void;
  addItem: (line: CartLine, restaurant?: { id: string; name: string }) => void;
  setQty: (lineKey: string, qty: number) => void;
  setCustomerNotes: (notes: string) => void;
  setAppliedCoupon: (coupon: ValidatedCoupon | null) => void;
  clear: () => void;
};

export const useCartStore = create<CartState>((set, get) => ({
  restaurantId: null,
  restaurantName: null,
  items: [],
  customerNotes: '',
  appliedCoupon: null,
  setRestaurant: (id, name) =>
    set((state) => {
      if (state.restaurantId === id) {
        return { restaurantName: name };
      }
      return { restaurantId: id, restaurantName: name, items: [], customerNotes: '', appliedCoupon: null };
    }),
  addItem: (line, restaurant) =>
    set((state) => {
      let { items, restaurantId, restaurantName, customerNotes, appliedCoupon } = state;
      if (restaurant) {
        if (restaurantId !== restaurant.id) {
          items = [];
          restaurantId = restaurant.id;
          restaurantName = restaurant.name;
          customerNotes = '';
          appliedCoupon = null;
        } else {
          restaurantName = restaurant.name;
        }
      }
      if (!restaurantId) return state;

      const key = lineKeyForCartLine(line);
      const idx = items.findIndex((i) => lineKeyForCartLine(i) === key);
      if (idx >= 0) {
        const next = [...items];
        next[idx] = {
          ...next[idx],
          quantity: next[idx].quantity + line.quantity,
        };
        return { items: next, restaurantId, restaurantName, customerNotes, appliedCoupon };
      }
      return {
        items: [...items, line],
        restaurantId,
        restaurantName,
        customerNotes,
        appliedCoupon,
      };
    }),
  setQty: (lineKey, qty) => {
    const items = get().items
      .map((i) => (lineKeyForCartLine(i) === lineKey ? { ...i, quantity: qty } : i))
      .filter((i) => i.quantity > 0);
    set({ items });
  },
  setCustomerNotes: (notes) => set({ customerNotes: notes.slice(0, 500) }),
  setAppliedCoupon: (coupon) => set({ appliedCoupon: coupon }),
  clear: () =>
    set({
      restaurantId: null,
      restaurantName: null,
      items: [],
      customerNotes: '',
      appliedCoupon: null,
    }),
}));
