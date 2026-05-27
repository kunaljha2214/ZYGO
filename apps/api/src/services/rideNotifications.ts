import { Types } from 'mongoose';
import type { IRideBooking } from '../models/RideBooking';
import { dispatchNotification } from './notificationDispatcher';
import {
  buildCustomerRideNotification,
  buildDriverRideNotification,
  type CustomerRideNotificationType,
  type DriverRideNotificationType,
} from './notificationEvents';

type RideNotificationContext = {
  fare?: number;
  earnings?: number;
  etaMinutes?: number;
  incentiveLabel?: string;
};

function rideId(ride: Pick<IRideBooking, '_id'>): string {
  return ride._id.toString();
}

export async function dispatchCustomerRideEvent(
  ride: IRideBooking,
  type: CustomerRideNotificationType,
  context: RideNotificationContext = {}
): Promise<void> {
  const payload = buildCustomerRideNotification(rideId(ride), type, {
    vehicleType: ride.vehicleType,
    fare: context.fare ?? ride.fare,
    etaMinutes: context.etaMinutes,
  });
  await dispatchNotification({
    userId: ride.userId,
    domain: 'ride',
    payload,
  });
}

export async function dispatchDriverRideEvent(
  driverId: string | Types.ObjectId,
  ride: IRideBooking,
  type: DriverRideNotificationType,
  context: RideNotificationContext = {}
): Promise<void> {
  const payload = buildDriverRideNotification(rideId(ride), type, {
    vehicleType: ride.vehicleType,
    fare: context.fare ?? ride.fare,
    earnings: context.earnings ?? ride.driverEarned ?? ride.estimatedDriverEarnings,
    incentiveLabel: context.incentiveLabel,
  });
  await dispatchNotification({
    userId: driverId,
    domain: 'ride',
    payload,
  });
}

export async function notifyRideStakeholdersOnCustomerCancel(ride: IRideBooking): Promise<void> {
  await dispatchCustomerRideEvent(ride, 'ride_cancelled');
  if (ride.captainId) {
    await dispatchDriverRideEvent(ride.captainId, ride, 'ride_cancelled');
  } else if (ride.pendingDriverId) {
    await dispatchDriverRideEvent(ride.pendingDriverId, ride, 'ride_cancelled');
  }
}

export async function dispatchDriverIncentiveEarned(
  driverId: string | Types.ObjectId,
  rideIdForContext: string,
  label?: string
): Promise<void> {
  const payload = buildDriverRideNotification(rideIdForContext, 'incentive_earned', {
    incentiveLabel: label,
  });
  await dispatchNotification({
    userId: driverId,
    domain: 'ride',
    payload,
  });
}
