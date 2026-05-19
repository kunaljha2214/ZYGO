import mongoose, { Schema, Document, Types } from 'mongoose';

export type SpicyLevel = 0 | 1 | 2 | 3;
export type StockStatus = 'in_stock' | 'out_of_stock';

export interface IMenuVariant {
  name: string;
  price: number;
}

export interface IMenuAddOn {
  name: string;
  price: number;
}

export interface IMenuItem extends Document {
  restaurantId: Types.ObjectId;
  categoryId?: Types.ObjectId | null;
  name: string;
  price: number;
  category: string;
  description: string;
  imageUrl: string;
  preparationTimeMinutes: number;
  isVeg: boolean;
  spicyLevel: SpicyLevel;
  calories: number | null;
  variants: IMenuVariant[];
  addOns: IMenuAddOn[];
  stockStatus: StockStatus;
  availableFrom: string | null;
  availableUntil: string | null;
  autoDisableAt: Date | null;
  isAvailable: boolean;
}

const VariantSchema = new Schema<IMenuVariant>(
  { name: { type: String, required: true }, price: { type: Number, required: true } },
  { _id: false }
);

const AddOnSchema = new Schema<IMenuAddOn>(
  { name: { type: String, required: true }, price: { type: Number, required: true } },
  { _id: false }
);

const MenuItemSchema = new Schema<IMenuItem>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'MenuCategory', default: null },
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true },
    category: { type: String, default: 'General' },
    description: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    preparationTimeMinutes: { type: Number, default: 15 },
    isVeg: { type: Boolean, default: true },
    spicyLevel: { type: Number, enum: [0, 1, 2, 3], default: 0 },
    calories: { type: Number, default: null },
    variants: { type: [VariantSchema], default: [] },
    addOns: { type: [AddOnSchema], default: [] },
    stockStatus: { type: String, enum: ['in_stock', 'out_of_stock'], default: 'in_stock' },
    availableFrom: { type: String, default: null },
    availableUntil: { type: String, default: null },
    autoDisableAt: { type: Date, default: null },
    isAvailable: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const MenuItem = mongoose.model<IMenuItem>('MenuItem', MenuItemSchema);

export function isMenuItemActiveNow(item: Pick<
  IMenuItem,
  'isAvailable' | 'stockStatus' | 'availableFrom' | 'availableUntil' | 'autoDisableAt'
>): boolean {
  if (!item.isAvailable) return false;
  if (item.stockStatus === 'out_of_stock') return false;
  if (item.autoDisableAt && item.autoDisableAt.getTime() <= Date.now()) return false;

  if (item.availableFrom && item.availableUntil) {
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    const [fh, fm] = item.availableFrom.split(':').map(Number);
    const [th, tm] = item.availableUntil.split(':').map(Number);
    const from = fh * 60 + fm;
    const to = th * 60 + tm;
    if (from <= to) {
      if (mins < from || mins > to) return false;
    } else if (mins < from && mins > to) {
      return false;
    }
  }
  return true;
}
