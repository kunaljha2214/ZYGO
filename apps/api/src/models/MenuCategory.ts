import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IMenuCategory extends Document {
  restaurantId: Types.ObjectId;
  name: string;
  sortOrder: number;
  isActive: boolean;
}

const MenuCategorySchema = new Schema<IMenuCategory>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    name: { type: String, required: true, trim: true },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

MenuCategorySchema.index({ restaurantId: 1, name: 1 }, { unique: true });

export const MenuCategory = mongoose.model<IMenuCategory>('MenuCategory', MenuCategorySchema);
