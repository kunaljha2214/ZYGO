import { create } from 'zustand';
import { lineKeyForCartLine } from './cartLineKey';

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
  setRestaurant: (id: string, name: string) => void;
  addItem: (line: CartLine, restaurant?: { id: string; name: string }) => void;
  setQty: (lineKey: string, qty: number) => void;
  clear: () => void;
};

export const useCartStore = create<CartState>((set, get) => ({
  restaurantId: null,
  restaurantName: null,
  items: [],
  setRestaurant: (id, name) =>
    set((state) => {
      if (state.restaurantId === id) {
        return { restaurantName: name };
      }
      return { restaurantId: id, restaurantName: name, items: [] };
    }),
  addItem: (line, restaurant) =>
    set((state) => {
      let { items, restaurantId, restaurantName } = state;
      if (restaurant) {
        if (restaurantId !== restaurant.id) {
          items = [];
          restaurantId = restaurant.id;
          restaurantName = restaurant.name;
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
        return { items: next, restaurantId, restaurantName };
      }
      return {
        items: [...items, line],
        restaurantId,
        restaurantName,
      };
    }),
  setQty: (lineKey, qty) => {
    const items = get().items
      .map((i) => (lineKeyForCartLine(i) === lineKey ? { ...i, quantity: qty } : i))
      .filter((i) => i.quantity > 0);
    set({ items });
  },
  clear: () =>
    set({
      restaurantId: null,
      restaurantName: null,
      items: [],
    }),
}));
