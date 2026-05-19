import createError from 'http-errors';
import { OwnerRestaurant } from '../models/OwnerRestaurant';

export const PENDING_APPROVAL_MSG = 'Your shop is still pending for approval';

export async function requireApprovedRestaurantId(ownerId: string): Promise<string> {
  const reg = await OwnerRestaurant.findOne({ ownerId, approvalStatus: 'approved' });
  if (!reg?.restaurantListingId) {
    throw createError(403, PENDING_APPROVAL_MSG);
  }
  return reg.restaurantListingId.toString();
}
