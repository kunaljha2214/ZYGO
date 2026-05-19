export type SpicyLevel = 0 | 1 | 2 | 3;
export type StockStatus = 'in_stock' | 'out_of_stock';

export type MenuVariant = { name: string; price: number };
export type MenuAddOn = { name: string; price: number };

export type MenuCategory = {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
};

export type MenuItemFull = {
  id: string;
  categoryId: string | null;
  name: string;
  price: number;
  category: string;
  description: string;
  imageUrl: string;
  preparationTimeMinutes: number;
  isVeg: boolean;
  spicyLevel: SpicyLevel;
  calories: number | null;
  variants: MenuVariant[];
  addOns: MenuAddOn[];
  stockStatus: StockStatus;
  availableFrom: string | null;
  availableUntil: string | null;
  autoDisableAt: string | null;
  isAvailable: boolean;
  isActiveNow: boolean;
};

export type MenuManagementResponse = {
  approved: boolean;
  approvalStatus?: string;
  message?: string;
  restaurantId?: string;
  shopName?: string;
  categories: MenuCategory[];
  items: MenuItemFull[];
};

export type MenuItemPayload = {
  name: string;
  price: number;
  categoryId: string | null;
  category?: string;
  description: string;
  imageUrl?: string;
  imageDataUrl?: string;
  preparationTimeMinutes: number;
  isVeg: boolean;
  spicyLevel: SpicyLevel;
  calories: number | null;
  variants: MenuVariant[];
  addOns: MenuAddOn[];
  stockStatus: StockStatus;
  availableFrom: string | null;
  availableUntil: string | null;
  autoDisableAt: string | null;
  isAvailable: boolean;
};

export type AiSuggestions = {
  combos: { title: string; items: string[]; suggestedPrice: number }[];
  pricing: { itemName: string; currentPrice: number; suggestion: number; note: string }[];
  note: string;
};
