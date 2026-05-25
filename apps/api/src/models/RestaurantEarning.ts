import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IRestaurantEarning extends Document {
  ownerId: Types.ObjectId;
  restaurantId: Types.ObjectId;
  orderId: Types.ObjectId;
  orderNumber: string;
  amount: number;
  status: 'pending' | 'paid';
  createdAt: Date;
}

const RestaurantEarningSchema = new Schema<IRestaurantEarning>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'FoodOrder', required: true, unique: true },
    orderNumber: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['pending', 'paid'], default: 'pending' },
  },
  { timestamps: true }
);

export const RestaurantEarning = mongoose.model<IRestaurantEarning>(
  'RestaurantEarning',
  RestaurantEarningSchema
);
