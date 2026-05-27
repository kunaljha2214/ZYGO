import mongoose, { Schema, Document, Types } from 'mongoose';

export type NotificationDomain = 'food' | 'ride';

export interface IUserNotification extends Document {
  userId: Types.ObjectId;
  domain: NotificationDomain;
  type: string;
  title: string;
  body: string;
  data: Record<string, string>;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserNotificationSchema = new Schema<IUserNotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    domain: { type: String, enum: ['food', 'ride'], required: true, index: true },
    type: { type: String, required: true, index: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    data: { type: Schema.Types.Mixed, default: {} },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

UserNotificationSchema.index({ userId: 1, createdAt: -1 });

export const UserNotification = mongoose.model<IUserNotification>(
  'UserNotification',
  UserNotificationSchema
);
