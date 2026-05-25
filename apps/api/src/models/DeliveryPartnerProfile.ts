import mongoose, { Schema, Document, Types } from 'mongoose';

export type PartnerApprovalStatus = 'draft' | 'pending_review' | 'approved' | 'rejected';

export type PartnerDocumentType =
  | 'aadhaar'
  | 'pan'
  | 'driving_license'
  | 'rc'
  | 'profile_photo';

export interface IPartnerDocumentRef {
  fileName: string;
  mimeType: string;
  url: string;
  uploadedAt: Date;
}

export interface IDeliveryPartnerProfile extends Document {
  partnerId: Types.ObjectId;
  approvalStatus: PartnerApprovalStatus;
  rejectionReason?: string | null;
  submittedAt?: Date | null;
  adminReviewedAt?: Date | null;
  aadhaarDocument?: IPartnerDocumentRef | null;
  panDocument?: IPartnerDocumentRef | null;
  drivingLicenseDocument?: IPartnerDocumentRef | null;
  rcDocument?: IPartnerDocumentRef | null;
  profilePhotoDocument?: IPartnerDocumentRef | null;
  rating: number;
  totalDeliveries: number;
  acceptanceRate: number;
  cancellationRate: number;
  onTimeRate: number;
  walletPending: number;
  walletTotalEarned: number;
  subscriptionExpiresAt?: Date | null;
  subscriptionPlanKey?: string | null;
  partnerFirstOrderCompletedAt?: Date | null;
  subscriptionGraceExpiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const DocumentRefSchema = new Schema<IPartnerDocumentRef>(
  {
    fileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    url: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const DeliveryPartnerProfileSchema = new Schema<IDeliveryPartnerProfile>(
  {
    partnerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    approvalStatus: {
      type: String,
      enum: ['draft', 'pending_review', 'approved', 'rejected'],
      default: 'draft',
    },
    rejectionReason: { type: String, maxlength: 500 },
    submittedAt: { type: Date },
    adminReviewedAt: { type: Date },
    aadhaarDocument: { type: DocumentRefSchema, default: null },
    panDocument: { type: DocumentRefSchema, default: null },
    drivingLicenseDocument: { type: DocumentRefSchema, default: null },
    rcDocument: { type: DocumentRefSchema, default: null },
    profilePhotoDocument: { type: DocumentRefSchema, default: null },
    rating: { type: Number, default: 4.8, min: 0, max: 5 },
    totalDeliveries: { type: Number, default: 0, min: 0 },
    acceptanceRate: { type: Number, default: 100, min: 0, max: 100 },
    cancellationRate: { type: Number, default: 0, min: 0, max: 100 },
    onTimeRate: { type: Number, default: 100, min: 0, max: 100 },
    walletPending: { type: Number, default: 0, min: 0 },
    walletTotalEarned: { type: Number, default: 0, min: 0 },
    subscriptionExpiresAt: { type: Date, default: null },
    subscriptionPlanKey: { type: String, default: null },
    partnerFirstOrderCompletedAt: { type: Date, default: null },
    subscriptionGraceExpiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const DeliveryPartnerProfile = mongoose.model<IDeliveryPartnerProfile>(
  'DeliveryPartnerProfile',
  DeliveryPartnerProfileSchema
);
