import mongoose, { Schema, Document, Types } from 'mongoose';

export type UserRole =
  | 'customer'
  | 'captain'
  | 'restaurant'
  | 'admin'
  | 'delivery_partner'
  | 'shop_owner'
  | 'driver';

export type DriverVehicleType = 'bike' | 'auto' | 'car';

export type SavedAddressKind = 'home' | 'work' | 'other';

export interface ISavedAddress {
  _id?: Types.ObjectId;
  label: string;
  line1: string;
  city?: string;
  area?: string;
  contactName?: string;
  contactPhone?: string;
  addressKind?: SavedAddressKind;
  isDefault?: boolean;
  coordinates: { lat: number; lng: number };
}

export interface IEmergencyContact {
  name: string;
  phone: string;
}

export interface IUser extends Document {
  phone: string;
  email?: string | null;
  emailVerified: boolean;
  passwordHash: string;
  name: string;
  role: UserRole;
  driverVehicleType?: DriverVehicleType | null;
  savedAddresses: ISavedAddress[];
  isCaptainAvailable?: boolean;
  isDriverOnline?: boolean;
  isDriverBusy?: boolean;
  activeRideId?: Types.ObjectId | null;
  isDeliveryOnline?: boolean;
  isDeliveryBusy?: boolean;
  activeDeliveryOrderId?: Types.ObjectId | null;
  currentLocation: {
    type: 'Point';
    coordinates: [number, number];
  } | null;
  /** Unique code this user shares (e.g. ZYGO7X4K2P). */
  referralCode?: string | null;
  referredByUserId?: Types.ObjectId | null;
  referralWalletBalance: number;
  referralCount: number;
  dateOfBirth?: Date | null;
  /** Set true after date of birth is saved — cannot be changed again. */
  dateOfBirthLocked?: boolean;
  emergencyContact?: IEmergencyContact | null;
  profilePhotoUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const EmergencyContactSchema = new Schema<IEmergencyContact>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const SavedAddressSchema = new Schema<ISavedAddress>(
  {
    label: { type: String, required: true },
    line1: { type: String, required: true },
    city: { type: String, default: '' },
    area: { type: String, default: '' },
    contactName: { type: String, default: '' },
    contactPhone: { type: String, default: '' },
    addressKind: {
      type: String,
      enum: ['home', 'work', 'other'],
      default: 'other',
    },
    isDefault: { type: Boolean, default: false },
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
  },
  { _id: true }
);

const UserSchema = new Schema<IUser>(
  {
    phone: { type: String, required: true, unique: true, index: true },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      sparse: true,
      unique: true,
    },
    emailVerified: { type: Boolean, default: false },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true },
    role: {
      type: String,
      enum: ['customer', 'captain', 'restaurant', 'admin', 'delivery_partner', 'shop_owner', 'driver'],
      default: 'customer',
    },
    driverVehicleType: {
      type: String,
      enum: ['bike', 'auto', 'car', null],
      default: null,
    },
    savedAddresses: [SavedAddressSchema],
    isCaptainAvailable: { type: Boolean, default: false },
    isDriverOnline: { type: Boolean, default: false },
    isDriverBusy: { type: Boolean, default: false },
    activeRideId: { type: Schema.Types.ObjectId, ref: 'RideBooking', default: null },
    isDeliveryOnline: { type: Boolean, default: false },
    isDeliveryBusy: { type: Boolean, default: false },
    activeDeliveryOrderId: { type: Schema.Types.ObjectId, ref: 'FoodOrder', default: null },
    currentLocation: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: {
        type: [Number],
      },
    },
    referralCode: { type: String, unique: true, sparse: true, uppercase: true, trim: true },
    referredByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    referralWalletBalance: { type: Number, default: 0, min: 0 },
    referralCount: { type: Number, default: 0, min: 0 },
    dateOfBirth: { type: Date, default: null },
    dateOfBirthLocked: { type: Boolean, default: false },
    emergencyContact: { type: EmergencyContactSchema, default: null },
    profilePhotoUrl: { type: String, default: null },
  },
  { timestamps: true }
);

UserSchema.index({ currentLocation: '2dsphere' }, { sparse: true });

export const User = mongoose.model<IUser>('User', UserSchema);
