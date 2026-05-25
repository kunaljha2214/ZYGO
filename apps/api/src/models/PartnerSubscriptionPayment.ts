import mongoose, { Schema, Document, Types } from 'mongoose';
import type { PartnerPlanKey } from '../config/partnerSubscriptionPlans';
import type { UserRole } from './User';

export type SubscriptionPaymentStatus = 'pending' | 'paid' | 'failed';

export interface IPartnerSubscriptionPayment extends Document {
  userId: Types.ObjectId;
  role: UserRole;
  planKey: PartnerPlanKey;
  amountInr: number;
  periodStart: Date;
  periodEnd: Date;
  status: SubscriptionPaymentStatus;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PartnerSubscriptionPaymentSchema = new Schema<IPartnerSubscriptionPayment>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, required: true },
    planKey: { type: String, required: true },
    amountInr: { type: Number, required: true, min: 1 },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed'],
      default: 'pending',
    },
    razorpayOrderId: { type: String, required: true, index: true },
    razorpayPaymentId: { type: String, sparse: true },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

export const PartnerSubscriptionPayment = mongoose.model<IPartnerSubscriptionPayment>(
  'PartnerSubscriptionPayment',
  PartnerSubscriptionPaymentSchema
);
