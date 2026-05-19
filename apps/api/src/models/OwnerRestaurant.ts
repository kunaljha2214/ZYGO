import mongoose, { Schema, Document, Types } from 'mongoose';

export type FoodServiceType = 'veg' | 'non_veg' | 'both';
export type KycStatus = 'pending' | 'submitted' | 'verified' | 'rejected';
export type ApprovalStatus = 'draft' | 'pending_review' | 'approved' | 'rejected';

export interface IOpeningHour {
  day: number;
  open: string;
  close: string;
  closed: boolean;
}

export interface IBankDetails {
  accountHolderName: string;
  accountNumber: string;
  ifsc: string;
  bankName: string;
}

export interface IRestaurantAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
}

export interface IDocumentRef {
  fileName: string;
  mimeType: string;
  url: string;
  uploadedAt: Date;
}

export interface IOwnerRestaurant extends Document {
  ownerId: Types.ObjectId;
  restaurantListingId?: Types.ObjectId | null;
  name: string;
  address: IRestaurantAddress;
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
  cuisine: string[];
  foodType: FoodServiceType;
  openingHours: IOpeningHour[];
  gstNumber: string;
  panNumber: string;
  fssaiNumber: string;
  gstDocument?: IDocumentRef | null;
  panDocument?: IDocumentRef | null;
  fssaiDocument?: IDocumentRef | null;
  bankDetails: IBankDetails;
  kycStatus: KycStatus;
  approvalStatus: ApprovalStatus;
  rejectionReason?: string | null;
  adminReviewedAt?: Date | null;
  submittedAt?: Date | null;
}

const OpeningHourSchema = new Schema<IOpeningHour>(
  {
    day: { type: Number, required: true, min: 0, max: 6 },
    open: { type: String, default: '09:00' },
    close: { type: String, default: '22:00' },
    closed: { type: Boolean, default: false },
  },
  { _id: false }
);

const AddressSchema = new Schema<IRestaurantAddress>(
  {
    line1: { type: String, default: '' },
    line2: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    pincode: { type: String, default: '' },
  },
  { _id: false }
);

const BankSchema = new Schema<IBankDetails>(
  {
    accountHolderName: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    ifsc: { type: String, default: '' },
    bankName: { type: String, default: '' },
  },
  { _id: false }
);

const DocumentSchema = new Schema<IDocumentRef>(
  {
    fileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    url: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const OwnerRestaurantSchema = new Schema<IOwnerRestaurant>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    restaurantListingId: { type: Schema.Types.ObjectId, ref: 'Restaurant', default: null },
    name: { type: String, required: true, trim: true },
    address: { type: AddressSchema, required: true },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
    cuisine: [{ type: String, trim: true }],
    foodType: {
      type: String,
      enum: ['veg', 'non_veg', 'both'],
      required: true,
    },
    openingHours: { type: [OpeningHourSchema], default: [] },
    gstNumber: { type: String, default: '' },
    panNumber: { type: String, default: '' },
    fssaiNumber: { type: String, default: '' },
    gstDocument: { type: DocumentSchema, default: null },
    panDocument: { type: DocumentSchema, default: null },
    fssaiDocument: { type: DocumentSchema, default: null },
    bankDetails: { type: BankSchema, default: () => ({}) },
    kycStatus: {
      type: String,
      enum: ['pending', 'submitted', 'verified', 'rejected'],
      default: 'pending',
    },
    approvalStatus: {
      type: String,
      enum: ['draft', 'pending_review', 'approved', 'rejected'],
      default: 'draft',
    },
    rejectionReason: { type: String, default: null },
    adminReviewedAt: { type: Date, default: null },
    submittedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

OwnerRestaurantSchema.index({ location: '2dsphere' });
OwnerRestaurantSchema.index({ approvalStatus: 1 });

export const OwnerRestaurant = mongoose.model<IOwnerRestaurant>(
  'OwnerRestaurant',
  OwnerRestaurantSchema
);
