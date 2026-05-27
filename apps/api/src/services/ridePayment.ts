import createError from 'http-errors';
import { Types } from 'mongoose';
import { RideBooking, type IRideBooking } from '../models/RideBooking';
import { DriverEarning } from '../models/DriverEarning';
import { DriverProfile } from '../models/DriverProfile';
import { User } from '../models/User';
import {
  createRazorpayOrder,
  getRazorpayKeyId,
  toPaise,
  verifyPaymentSignature,
} from './razorpayService';
import { emitToUser } from '../socket/io';
import {
  dispatchCustomerRideEvent,
  dispatchDriverRideEvent,
} from './rideNotifications';

/** Rides completed before post-pay flow may already have a DriverEarning row. */
export async function syncLegacyRidePaymentStatus(ride: IRideBooking): Promise<void> {
  if (ride.paymentStatus === 'paid' || ride.status !== 'completed') return;
  const legacyEarning = await DriverEarning.findOne({ rideId: ride._id });
  if (legacyEarning) {
    ride.paymentStatus = 'paid';
    ride.driverEarningsSettled = true;
    await ride.save();
  }
}

export async function creditDriverWalletForRide(ride: IRideBooking): Promise<void> {
  if (ride.driverEarningsSettled || !ride.captainId) return;

  const existing = await DriverEarning.findOne({ rideId: ride._id });
  if (existing) {
    ride.driverEarningsSettled = true;
    await ride.save();
    return;
  }

  const driverEarned =
    ride.driverEarned || Math.max(0, ride.fare - (ride.platformFee ?? 0));

  await DriverEarning.create({
    driverId: ride.captainId,
    rideId: ride._id,
    amount: ride.fare,
    platformFee: ride.platformFee ?? 0,
    driverEarned,
    type: 'ride',
    status: 'pending',
  });

  const profile = await DriverProfile.findOne({ driverId: ride.captainId });
  if (profile) {
    profile.walletPending += driverEarned;
    profile.walletTotalEarned += driverEarned;
    await profile.save();
  }

  ride.driverEarningsSettled = true;
  await ride.save();
}

export async function markRidePaid(
  rideId: string,
  razorpayPaymentId: string
): Promise<InstanceType<typeof RideBooking> | null> {
  const ride = await RideBooking.findById(rideId);
  if (!ride) return null;

  if (ride.paymentStatus === 'paid') {
    return ride;
  }

  ride.paymentStatus = 'paid';
  ride.razorpayPaymentId = razorpayPaymentId;
  ride.paidAt = new Date();
  await ride.save();

  await creditDriverWalletForRide(ride);

  emitToUser(ride.userId.toString(), 'ride:status', {
    rideId: ride._id.toString(),
    status: ride.status,
    paymentStatus: ride.paymentStatus,
  });

  if (ride.captainId) {
    emitToUser(ride.captainId.toString(), 'ride:status', {
      rideId: ride._id.toString(),
      status: ride.status,
      paymentStatus: ride.paymentStatus,
    });
  }

  dispatchCustomerRideEvent(ride, 'payment_success', { fare: ride.fare });
  if (ride.captainId) {
    dispatchDriverRideEvent(ride.captainId, ride, 'payment_received', { fare: ride.fare });
  }

  return ride;
}

export async function createRidePaymentCheckout(rideId: string, userId: string) {
  const ride = await RideBooking.findOne({
    _id: rideId,
    userId: new Types.ObjectId(userId),
  });
  if (!ride) {
    throw createError(404, 'Ride not found');
  }
  if (ride.status !== 'completed') {
    throw createError(400, 'Payment is available after the ride is completed');
  }
  if (ride.paymentStatus === 'paid') {
    throw createError(400, 'Ride fare is already paid');
  }

  await syncLegacyRidePaymentStatus(ride);
  const refreshed = await RideBooking.findById(ride._id);
  if (!refreshed || refreshed.paymentStatus === 'paid') {
    throw createError(400, 'Ride fare is already paid');
  }

  if (!refreshed.captainId) {
    throw createError(400, 'Ride has no assigned captain');
  }

  const customer = await User.findById(userId).select('name email phone').lean();

  if (!refreshed.razorpayOrderId) {
    const rzOrder = await createRazorpayOrder({
      amountInr: refreshed.fare,
      receipt: `ride_${refreshed._id.toString().slice(-12)}`,
      notes: {
        type: 'ride_payment',
        rideId: refreshed._id.toString(),
      },
    });
    refreshed.razorpayOrderId = rzOrder.id;
    await refreshed.save();
  }

  return {
    rideId: refreshed._id.toString(),
    fare: refreshed.fare,
    driverEarned: refreshed.driverEarned,
    payment: {
      keyId: getRazorpayKeyId(),
      razorpayOrderId: refreshed.razorpayOrderId!,
      amount: toPaise(refreshed.fare),
      currency: 'INR',
      name: 'Zygo',
      description: `Ride fare · ${refreshed.vehicleType}`,
      prefill: {
        name: customer?.name ?? '',
        email: customer?.email ?? '',
        contact: customer?.phone ?? '',
      },
    },
  };
}

export async function verifyRidePayment(
  userId: string,
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
) {
  const ride = await RideBooking.findOne({
    razorpayOrderId,
    userId: new Types.ObjectId(userId),
  });
  if (!ride) {
    throw createError(404, 'Ride not found for this payment');
  }
  if (ride.paymentStatus === 'paid') {
    return ride;
  }

  if (!verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)) {
    ride.paymentStatus = 'failed';
    await ride.save();
    throw createError(400, 'Payment verification failed');
  }

  const paid = await markRidePaid(ride._id.toString(), razorpayPaymentId);
  return paid!;
}

export async function tryCompleteRidePaymentFromWebhook(
  razorpayOrderId: string,
  razorpayPaymentId: string
): Promise<boolean> {
  const ride = await RideBooking.findOne({ razorpayOrderId });
  if (!ride || ride.paymentStatus === 'paid') return Boolean(ride);
  await markRidePaid(ride._id.toString(), razorpayPaymentId);
  return true;
}
