import mongoose, { Schema, Document, Types } from 'mongoose';
import type { UserRole } from './User';

export type PushPlatform = 'android' | 'ios';

export interface IPushToken extends Document {
  userId: Types.ObjectId;
  role: UserRole;
  token: string;
  platform: PushPlatform;
  enabled: boolean;
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PushTokenSchema = new Schema<IPushToken>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: {
      type: String,
      enum: ['customer', 'captain', 'restaurant', 'admin', 'delivery_partner', 'shop_owner', 'driver'],
      required: true,
      index: true,
    },
    token: { type: String, required: true, unique: true, index: true },
    platform: { type: String, enum: ['android', 'ios'], required: true },
    enabled: { type: Boolean, default: true, index: true },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

PushTokenSchema.index({ userId: 1, platform: 1 });

export const PushToken = mongoose.model<IPushToken>('PushToken', PushTokenSchema);
