import createError from 'http-errors';
import { Types } from 'mongoose';
import { RideBooking } from '../models/RideBooking';
import { User } from '../models/User';
import { toDialNumber, maskPhone } from '../utils/phone';

const CONTACT_STATUSES = new Set([
  'assigned',
  'arriving',
  'arrived',
  'in_progress',
  'completed',
]);

export type RidePeerContact = {
  displayName: string;
  maskedPhone: string;
  dialNumber: string;
};

async function peerContactFromUser(
  user: { name?: string; phone?: string } | null,
  fallbackName: string
): Promise<RidePeerContact> {
  if (!user?.phone?.trim()) {
    throw createError(404, 'Contact not available');
  }
  const dialNumber = toDialNumber(user.phone);
  if (!dialNumber) {
    throw createError(404, 'Contact not available');
  }
  return {
    displayName: (user.name || '').trim() || fallbackName,
    maskedPhone: maskPhone(user.phone),
    dialNumber,
  };
}

export async function getCaptainContactForCustomer(
  rideId: string,
  customerId: string
): Promise<RidePeerContact> {
  if (!Types.ObjectId.isValid(rideId)) {
    throw createError(400, 'Invalid ride id');
  }
  const ride = await RideBooking.findOne({
    _id: rideId,
    userId: customerId,
  })
    .select('captainId status')
    .lean();
  if (!ride) {
    throw createError(404, 'Ride not found');
  }
  if (!ride.captainId || !CONTACT_STATUSES.has(ride.status)) {
    throw createError(404, 'Captain not assigned yet');
  }
  const captain = await User.findById(ride.captainId).select('name phone').lean();
  return peerContactFromUser(captain, 'Captain');
}

export async function getCustomerContactForCaptain(
  rideId: string,
  captainId: string
): Promise<RidePeerContact> {
  if (!Types.ObjectId.isValid(rideId)) {
    throw createError(400, 'Invalid ride id');
  }
  const ride = await RideBooking.findOne({
    _id: rideId,
    captainId,
  })
    .select('userId status')
    .lean();
  if (!ride) {
    throw createError(404, 'Ride not found');
  }
  if (!CONTACT_STATUSES.has(ride.status)) {
    throw createError(404, 'Contact not available for this ride');
  }
  const customer = await User.findById(ride.userId).select('name phone').lean();
  return peerContactFromUser(customer, 'Customer');
}

export async function getCaptainDisplayName(captainId: Types.ObjectId | string | null | undefined) {
  if (!captainId) return null;
  const captain = await User.findById(captainId).select('name').lean();
  if (!captain) return null;
  return {
    id: captainId.toString(),
    name: (captain.name || '').trim() || 'Captain',
  };
}

export async function getCustomerDisplayName(userId: Types.ObjectId | string | null | undefined) {
  if (!userId) return null;
  const customer = await User.findById(userId).select('name').lean();
  if (!customer) return null;
  return {
    id: userId.toString(),
    name: (customer.name || '').trim() || 'Customer',
  };
}
