import mongoose, { Schema, Document, Types } from 'mongoose';

export type ShopOfferType = 'flat' | 'percentage' | 'free_delivery' | 'combo';
export type ShopCampaignType = 'standard' | 'happy_hour' | 'festival';

export interface IShopOffer extends Document {
  restaurantId: Types.ObjectId;
  title: string;
  code: string;
  offerType: ShopOfferType;
  discountValue: number;
  minOrderAmount: number;
  comboItemNames: string[];
  isActive: boolean;
  startDate: Date;
  endDate: Date;
  happyHourStart?: string;
  happyHourEnd?: string;
  campaignType: ShopCampaignType;
  festivalName?: string;
  maxUses?: number;
  usageCount: number;
  targetCustomerIds: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const ShopOfferSchema = new Schema<IShopOffer>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    title: { type: String, required: true, maxlength: 120 },
    code: { type: String, required: true, uppercase: true, trim: true },
    offerType: {
      type: String,
      enum: ['flat', 'percentage', 'free_delivery', 'combo'],
      required: true,
    },
    discountValue: { type: Number, default: 0, min: 0 },
    minOrderAmount: { type: Number, default: 0, min: 0 },
    comboItemNames: [{ type: String }],
    isActive: { type: Boolean, default: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    happyHourStart: { type: String, match: /^\d{2}:\d{2}$/ },
    happyHourEnd: { type: String, match: /^\d{2}:\d{2}$/ },
    campaignType: {
      type: String,
      enum: ['standard', 'happy_hour', 'festival'],
      default: 'standard',
    },
    festivalName: { type: String, maxlength: 80 },
    maxUses: { type: Number, min: 1 },
    usageCount: { type: Number, default: 0, min: 0 },
    targetCustomerIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

ShopOfferSchema.index({ restaurantId: 1, code: 1 }, { unique: true });

export const ShopOffer = mongoose.model<IShopOffer>('ShopOffer', ShopOfferSchema);
