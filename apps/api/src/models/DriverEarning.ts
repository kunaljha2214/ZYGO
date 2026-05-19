import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IDriverEarning extends Document {
  driverId: Types.ObjectId;
  rideId: Types.ObjectId;
  amount: number;
  platformFee: number;
  driverEarned: number;
  type: 'ride' | 'bonus' | 'incentive';
  status: 'pending' | 'paid';
  createdAt: Date;
  updatedAt: Date;
}

const DriverEarningSchema = new Schema<IDriverEarning>(
  {
    driverId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    rideId: { type: Schema.Types.ObjectId, ref: 'RideBooking', required: true },
    amount: { type: Number, required: true, min: 0 },
    platformFee: { type: Number, required: true, min: 0 },
    driverEarned: { type: Number, required: true, min: 0 },
    type: { type: String, enum: ['ride', 'bonus', 'incentive'], default: 'ride' },
    status: { type: String, enum: ['pending', 'paid'], default: 'pending' },
  },
  { timestamps: true }
);

export const DriverEarning = mongoose.model<IDriverEarning>('DriverEarning', DriverEarningSchema);
