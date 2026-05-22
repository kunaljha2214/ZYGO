import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IReferralEvent extends Document {
  referrerId: Types.ObjectId;
  referredUserId: Types.ObjectId;
  referralCode: string;
  rewardAmount: number;
  referredName: string;
  referredPhone: string;
  createdAt: Date;
}

const ReferralEventSchema = new Schema<IReferralEvent>(
  {
    referrerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    referredUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    referralCode: { type: String, required: true, uppercase: true, trim: true },
    rewardAmount: { type: Number, required: true, min: 0 },
    referredName: { type: String, required: true },
    referredPhone: { type: String, required: true },
  },
  { timestamps: true }
);

export const ReferralEvent = mongoose.model<IReferralEvent>('ReferralEvent', ReferralEventSchema);
