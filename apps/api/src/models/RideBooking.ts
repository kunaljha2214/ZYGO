import mongoose, { Schema, Document, Types } from 'mongoose';

export type RideStatus =
  | 'requested'
  | 'dispatching'
  | 'assigned'
  | 'arriving'
  | 'arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type RideAssignmentState = 'none' | 'dispatching' | 'assigned' | 'failed';

export interface IRidePlace {
  label: string;
  line1: string;
  coordinates: { lat: number; lng: number };
}

export interface IRideBooking extends Document {
  userId: Types.ObjectId;
  pickup: IRidePlace;
  drop: IRidePlace;
  vehicleType: string;
  distanceKm: number;
  durationMin: number;
  fare: number;
  platformFee: number;
  driverEarned: number;
  surgeMultiplier: number;
  tollCharges: number;
  status: RideStatus;
  captainId?: Types.ObjectId | null;
  pendingDriverId?: Types.ObjectId | null;
  dispatchExpiresAt?: Date | null;
  rejectedDriverIds: Types.ObjectId[];
  assignmentState: RideAssignmentState;
  estimatedDriverEarnings?: number | null;
  driverLastLocation?: { lat: number; lng: number } | null;
  customerRating?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

const RidePlaceSchema = new Schema<IRidePlace>(
  {
    label: { type: String, default: '' },
    line1: { type: String, required: true },
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
  },
  { _id: false }
);

const RideBookingSchema = new Schema<IRideBooking>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    pickup: { type: RidePlaceSchema, required: true },
    drop: { type: RidePlaceSchema, required: true },
    vehicleType: { type: String, required: true },
    distanceKm: { type: Number, required: true },
    durationMin: { type: Number, required: true },
    fare: { type: Number, required: true },
    platformFee: { type: Number, default: 0, min: 0 },
    driverEarned: { type: Number, default: 0, min: 0 },
    surgeMultiplier: { type: Number, default: 1, min: 1 },
    tollCharges: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: [
        'requested',
        'dispatching',
        'assigned',
        'arriving',
        'arrived',
        'in_progress',
        'completed',
        'cancelled',
      ],
      default: 'requested',
    },
    captainId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    pendingDriverId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    dispatchExpiresAt: { type: Date, default: null },
    rejectedDriverIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    assignmentState: {
      type: String,
      enum: ['none', 'dispatching', 'assigned', 'failed'],
      default: 'none',
    },
    estimatedDriverEarnings: { type: Number, default: null },
    driverLastLocation: {
      lat: { type: Number },
      lng: { type: Number },
    },
    customerRating: { type: Number, min: 1, max: 5, default: null },
  },
  { timestamps: true }
);

export const RideBooking = mongoose.model<IRideBooking>('RideBooking', RideBookingSchema);
