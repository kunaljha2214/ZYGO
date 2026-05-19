import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IShopCustomerProfile extends Document {
  restaurantId: Types.ObjectId;
  userId: Types.ObjectId;
  loyaltyPoints: number;
  totalOrders: number;
  totalSpent: number;
  lastOrderAt?: Date;
  firstOrderAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ShopCustomerProfileSchema = new Schema<IShopCustomerProfile>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    loyaltyPoints: { type: Number, default: 0, min: 0 },
    totalOrders: { type: Number, default: 0, min: 0 },
    totalSpent: { type: Number, default: 0, min: 0 },
    lastOrderAt: { type: Date },
    firstOrderAt: { type: Date },
  },
  { timestamps: true }
);

ShopCustomerProfileSchema.index({ restaurantId: 1, userId: 1 }, { unique: true });

export const ShopCustomerProfile = mongoose.model<IShopCustomerProfile>(
  'ShopCustomerProfile',
  ShopCustomerProfileSchema
);
