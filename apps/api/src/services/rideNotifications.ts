import { Types } from 'mongoose';
import type { IRideBooking } from '../models/RideBooking';
import { dispatchNotificationAsync } from './notificationDispatcher';
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

export function dispatchCustomerRideEvent(
  ride: IRideBooking,
  type: CustomerRideNotificationType,
  context: RideNotificationContext = {}
): void {
  const payload = buildCustomerRideNotification(rideId(ride), type, {
    vehicleType: ride.vehicleType,
    fare: context.fare ?? ride.fare,
    etaMinutes: context.etaMinutes,
  });
  dispatchNotificationAsync({
    userId: ride.userId,
    domain: 'ride',
    payload,
  });
}

export function dispatchDriverRideEvent(
  driverId: string | Types.ObjectId,
  ride: IRideBooking,
  type: DriverRideNotificationType,
  context: RideNotificationContext = {}
): void {
  const payload = buildDriverRideNotification(rideId(ride), type, {
    vehicleType: ride.vehicleType,
    fare: context.fare ?? ride.fare,
    earnings: context.earnings ?? ride.driverEarned ?? ride.estimatedDriverEarnings,
    incentiveLabel: context.incentiveLabel,
  });
  dispatchNotificationAsync({
    userId: driverId,
    domain: 'ride',
    payload,
  });
}

export function notifyRideStakeholdersOnCustomerCancel(ride: IRideBooking): void {
  dispatchCustomerRideEvent(ride, 'ride_cancelled');
  if (ride.captainId) {
    dispatchDriverRideEvent(ride.captainId, ride, 'ride_cancelled');
  } else if (ride.pendingDriverId) {
    dispatchDriverRideEvent(ride.pendingDriverId, ride, 'ride_cancelled');
  }
}

export function dispatchDriverIncentiveEarned(
  driverId: string | Types.ObjectId,
  rideIdForContext: string,
  label?: string
): void {
  const payload = buildDriverRideNotification(rideIdForContext, 'incentive_earned', {
    incentiveLabel: label,
  });
  dispatchNotificationAsync({
    userId: driverId,
    domain: 'ride',
    payload,
  });
}
