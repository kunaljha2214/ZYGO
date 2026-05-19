import mongoose, { Schema, Document } from 'mongoose';

export type RegistrationAccountType = 'customer' | 'delivery_partner' | 'shop_owner' | 'driver';

export interface IVerificationSession extends Document {
  sessionId: string;
  email: string;
  phone: string;
  passwordHash: string;
  name: string;
  accountType: RegistrationAccountType;
  driverVehicleType: 'bike' | 'auto' | 'car' | null;
  otpHash: string;
  expiresAt: Date;
  attempts: number;
}

const VerificationSessionSchema = new Schema<IVerificationSession>(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true },
    accountType: {
      type: String,
      enum: ['customer', 'delivery_partner', 'shop_owner', 'driver'],
      required: true,
    },
    driverVehicleType: {
      type: String,
      enum: ['bike', 'auto', 'car', null],
      default: null,
    },
    otpHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
  },
  { timestamps: true }
);

VerificationSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const VerificationSession = mongoose.model<IVerificationSession>(
  'VerificationSession',
  VerificationSessionSchema
);
