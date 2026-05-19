import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IRestaurant extends Document {
  name: string;
  image: string;
  cuisine: string[];
  rating: number;
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
  isActive: boolean;
  /** Shop owner toggle — when false, customers cannot place new orders. */
  isAcceptingOrders: boolean;
  ownerId?: Types.ObjectId | null;
}

const RestaurantSchema = new Schema<IRestaurant>(
  {
    name: { type: String, required: true },
    image: { type: String, default: '' },
    cuisine: [{ type: String }],
    rating: { type: Number, default: 4.0 },
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
    isActive: { type: Boolean, default: true },
    isAcceptingOrders: { type: Boolean, default: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', default: null, sparse: true },
  },
  { timestamps: true }
);

RestaurantSchema.index({ location: '2dsphere' });

export const Restaurant = mongoose.model<IRestaurant>('Restaurant', RestaurantSchema);

export type RestaurantId = Types.ObjectId;
