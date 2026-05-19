import mongoose, { Schema, Document, Types } from 'mongoose';

export type DriverApprovalStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'blocked';

export type DriverDocumentType =
  | 'aadhaar'
  | 'pan'
  | 'driving_license'
  | 'rc'
  | 'insurance'
  | 'selfie';

export interface IDriverDocumentRef {
  fileName: string;
  mimeType: string;
  url: string;
  uploadedAt: Date;
}

export interface IDriverProfile extends Document {
  driverId: Types.ObjectId;
  approvalStatus: DriverApprovalStatus;
  rejectionReason?: string | null;
  submittedAt?: Date | null;
  adminReviewedAt?: Date | null;
  vehicleModel?: string | null;
  vehicleNumber?: string | null;
  aadhaarDocument?: IDriverDocumentRef | null;
  panDocument?: IDriverDocumentRef | null;
  drivingLicenseDocument?: IDriverDocumentRef | null;
  rcDocument?: IDriverDocumentRef | null;
  insuranceDocument?: IDriverDocumentRef | null;
  selfieDocument?: IDriverDocumentRef | null;
  rating: number;
  totalRides: number;
  acceptanceRate: number;
  cancellationRate: number;
  completionRate: number;
  walletPending: number;
  walletTotalEarned: number;
  onlineHoursToday: number;
  createdAt: Date;
  updatedAt: Date;
}

const DocumentRefSchema = new Schema<IDriverDocumentRef>(
  {
    fileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    url: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const DriverProfileSchema = new Schema<IDriverProfile>(
  {
    driverId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    approvalStatus: {
      type: String,
      enum: ['draft', 'pending', 'approved', 'rejected', 'blocked'],
      default: 'draft',
    },
    rejectionReason: { type: String, maxlength: 500 },
    submittedAt: { type: Date },
    adminReviewedAt: { type: Date },
    vehicleModel: { type: String, maxlength: 120 },
    vehicleNumber: { type: String, maxlength: 20 },
    aadhaarDocument: { type: DocumentRefSchema, default: null },
    panDocument: { type: DocumentRefSchema, default: null },
    drivingLicenseDocument: { type: DocumentRefSchema, default: null },
    rcDocument: { type: DocumentRefSchema, default: null },
    insuranceDocument: { type: DocumentRefSchema, default: null },
    selfieDocument: { type: DocumentRefSchema, default: null },
    rating: { type: Number, default: 4.8, min: 0, max: 5 },
    totalRides: { type: Number, default: 0, min: 0 },
    acceptanceRate: { type: Number, default: 100, min: 0, max: 100 },
    cancellationRate: { type: Number, default: 0, min: 0, max: 100 },
    completionRate: { type: Number, default: 100, min: 0, max: 100 },
    walletPending: { type: Number, default: 0, min: 0 },
    walletTotalEarned: { type: Number, default: 0, min: 0 },
    onlineHoursToday: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

export const DriverProfile = mongoose.model<IDriverProfile>('DriverProfile', DriverProfileSchema);
