import mongoose, { Schema, Document, Types } from 'mongoose';

export type FoodOrderStatus =
  | 'placed'
  | 'confirmed'
  | 'preparing'
  | 'ready_for_pickup'
  | 'rider_assigned'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export type DeliveryPartnerStatus =
  | 'none'
  | 'request_received'
  | 'accepted'
  | 'arriving_at_restaurant'
  | 'picked_up'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export type DeliveryAssignmentState = 'none' | 'dispatching' | 'assigned' | 'failed';

export interface IFoodOrderItem {
  menuItemId: Types.ObjectId;
  name: string;
  price: number;
  quantity: number;
}

export interface IDeliveryAddress {
  label: string;
  line1: string;
  coordinates: { lat: number; lng: number };
}

export interface IFoodOrder extends Document {
  userId: Types.ObjectId;
  restaurantId: Types.ObjectId;
  orderNumber: string;
  items: IFoodOrderItem[];
  subtotal: number;
  discountAmount: number;
  couponCode?: string;
  offerId?: Types.ObjectId;
  total: number;
  status: FoodOrderStatus;
  deliveryAddress: IDeliveryAddress;
  customerNotes?: string;
  shopNotes?: string;
  rejectReason?: string;
  estimatedPrepMinutes?: number;
  kitchenStation?: string;
  batchId?: string;
  delayRiskMinutes?: number;
  invoicePrintedAt?: Date;
  acceptedAt?: Date;
  readyAt?: Date;
  outForDeliveryAt?: Date;
  deliveredAt?: Date;
  deliveryPartnerId?: Types.ObjectId;
  deliveryStatus: DeliveryPartnerStatus;
  assignmentState: DeliveryAssignmentState;
  rejectedPartnerIds: Types.ObjectId[];
  pendingPartnerId?: Types.ObjectId | null;
  dispatchExpiresAt?: Date | null;
  estimatedRiderEarnings?: number;
  restaurantName?: string;
  restaurantCoords?: { lat: number; lng: number };
  riderAssignedAt?: Date;
  pickedUpAt?: Date;
  riderLastLocation?: { lat: number; lng: number };
  deliveryEtaMinutes?: number;
  createdAt: Date;
  updatedAt: Date;
}

const FoodOrderItemSchema = new Schema<IFoodOrderItem>(
  {
    menuItemId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const DeliveryAddressSchema = new Schema<IDeliveryAddress>(
  {
    label: { type: String, required: true },
    line1: { type: String, required: true },
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
  },
  { _id: false }
);

const FoodOrderSchema = new Schema<IFoodOrder>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    orderNumber: { type: String, required: true, unique: true, index: true },
    items: [FoodOrderItemSchema],
    subtotal: { type: Number, required: true, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    couponCode: { type: String, trim: true, uppercase: true },
    offerId: { type: Schema.Types.ObjectId, ref: 'ShopOffer' },
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: [
        'placed',
        'confirmed',
        'preparing',
        'ready_for_pickup',
        'rider_assigned',
        'out_for_delivery',
        'delivered',
        'cancelled',
      ],
      default: 'placed',
    },
    deliveryStatus: {
      type: String,
      enum: [
        'none',
        'request_received',
        'accepted',
        'arriving_at_restaurant',
        'picked_up',
        'out_for_delivery',
        'delivered',
        'cancelled',
      ],
      default: 'none',
    },
    assignmentState: {
      type: String,
      enum: ['none', 'dispatching', 'assigned', 'failed'],
      default: 'none',
    },
    rejectedPartnerIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    pendingPartnerId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    dispatchExpiresAt: { type: Date, default: null },
    estimatedRiderEarnings: { type: Number, min: 0 },
    restaurantName: { type: String, maxlength: 120 },
    restaurantCoords: {
      lat: { type: Number },
      lng: { type: Number },
    },
    deliveryPartnerId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    riderAssignedAt: { type: Date },
    pickedUpAt: { type: Date },
    riderLastLocation: {
      lat: { type: Number },
      lng: { type: Number },
    },
    deliveryEtaMinutes: { type: Number, min: 1, max: 180 },
    deliveryAddress: { type: DeliveryAddressSchema, required: true },
    customerNotes: { type: String, maxlength: 500 },
    shopNotes: { type: String, maxlength: 500 },
    rejectReason: { type: String, maxlength: 300 },
    estimatedPrepMinutes: { type: Number, min: 1, max: 120 },
    kitchenStation: { type: String, maxlength: 40 },
    batchId: { type: String, maxlength: 40 },
    delayRiskMinutes: { type: Number, min: 0, max: 120 },
    invoicePrintedAt: { type: Date },
    acceptedAt: { type: Date },
    readyAt: { type: Date },
    outForDeliveryAt: { type: Date },
    deliveredAt: { type: Date },
  },
  { timestamps: true }
);

export const FoodOrder = mongoose.model<IFoodOrder>('FoodOrder', FoodOrderSchema);
