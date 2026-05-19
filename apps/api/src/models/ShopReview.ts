import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IShopReview extends Document {
  restaurantId: Types.ObjectId;
  userId: Types.ObjectId;
  orderId?: Types.ObjectId;
  rating: number;
  comment: string;
  createdAt: Date;
  updatedAt: Date;
}

const ShopReviewSchema = new Schema<IShopReview>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'FoodOrder' },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, maxlength: 1000, default: '' },
  },
  { timestamps: true }
);

export const ShopReview = mongoose.model<IShopReview>('ShopReview', ShopReviewSchema);
