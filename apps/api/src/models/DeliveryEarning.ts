import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IDeliveryEarning extends Document {
  partnerId: Types.ObjectId;
  orderId: Types.ObjectId;
  orderNumber: string;
  amount: number;
  type: 'delivery' | 'bonus' | 'incentive';
  status: 'pending' | 'paid';
  createdAt: Date;
}

const DeliveryEarningSchema = new Schema<IDeliveryEarning>(
  {
    partnerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'FoodOrder', required: true },
    orderNumber: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    type: { type: String, enum: ['delivery', 'bonus', 'incentive'], default: 'delivery' },
    status: { type: String, enum: ['pending', 'paid'], default: 'pending' },
  },
  { timestamps: true }
);

export const DeliveryEarning = mongoose.model<IDeliveryEarning>(
  'DeliveryEarning',
  DeliveryEarningSchema
);
