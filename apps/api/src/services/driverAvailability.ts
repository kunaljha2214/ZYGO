import { Types } from 'mongoose';
import { RideBooking } from '../models/RideBooking';
import { User } from '../models/User';

/** Fix rides that have captainId but are still marked dispatching. */
export async function normalizeDriverRideRecords(driverId: string): Promise<void> {
  await RideBooking.updateMany(
    {
      captainId: new Types.ObjectId(driverId),
      status: 'dispatching',
    },
    {
      $set: {
        status: 'assigned',
        assignmentState: 'assigned',
        pendingDriverId: null,
        dispatchExpiresAt: null,
      },
    }
  );
}

/** Clear stuck isDriverBusy when there is no active (non-terminal) ride. */
export async function syncDriverBusyState(driverId: string): Promise<{ isBusy: boolean }> {
  await normalizeDriverRideRecords(driverId);

  const active = await RideBooking.findOne({
    captainId: new Types.ObjectId(driverId),
    status: { $nin: ['completed', 'cancelled'] },
  })
    .select('_id')
    .lean();

  if (!active) {
    await User.findByIdAndUpdate(driverId, {
      isDriverBusy: false,
      activeRideId: null,
    });
    return { isBusy: false };
  }

  await User.findByIdAndUpdate(driverId, {
    isDriverBusy: true,
    activeRideId: active._id,
  });
  return { isBusy: true };
}
