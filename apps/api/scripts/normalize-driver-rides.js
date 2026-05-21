require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const users = mongoose.connection.collection('users');
  const rides = mongoose.connection.collection('ridebookings');
  const driver = await users.findOne({ phone: '9222222222' });
  if (!driver) throw new Error('driver not found');
  const driverId = driver._id;

  const broken = await rides
    .find({
      $or: [{ captainId: driverId }, { pendingDriverId: driverId }],
      status: { $nin: ['completed', 'cancelled'] },
    })
    .toArray();

  for (const ride of broken) {
    const patch = {};
    if (ride.captainId && ride.status === 'dispatching') {
      patch.status = 'assigned';
      patch.assignmentState = 'assigned';
      patch.pendingDriverId = null;
      patch.dispatchExpiresAt = null;
    }
    if (!ride.captainId && ride.pendingDriverId && ride.assignmentState === 'failed') {
      patch.assignmentState = 'none';
      patch.status = 'requested';
      patch.pendingDriverId = null;
      patch.dispatchExpiresAt = null;
    }
    if (Object.keys(patch).length) {
      await rides.updateOne({ _id: ride._id }, { $set: patch });
      console.log('fixed ride', ride._id.toString(), patch);
    }
  }

  const active = await rides.findOne({
    captainId: driverId,
    status: { $nin: ['completed', 'cancelled'] },
  });
  await users.updateOne(
    { _id: driverId },
    {
      $set: {
        isDriverBusy: !!active,
        activeRideId: active?._id ?? null,
      },
    }
  );
  console.log('driver', {
    busy: !!active,
    activeRideId: active?._id?.toString() ?? null,
    activeStatus: active?.status,
  });
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
