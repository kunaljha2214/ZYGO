require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const users = mongoose.connection.collection('users');
  const rides = mongoose.connection.collection('ridebookings');
  const driver = await users.findOne({ phone: '9222222222' });
  const driverId = driver._id;

  await rides.updateMany(
    {
      $or: [{ captainId: driverId }, { pendingDriverId: driverId }],
      status: { $nin: ['completed', 'cancelled'] },
    },
    {
      $set: {
        status: 'cancelled',
        assignmentState: 'none',
        pendingDriverId: null,
        dispatchExpiresAt: null,
      },
    }
  );

  await users.updateOne(
    { _id: driverId },
    { $set: { isDriverBusy: false, activeRideId: null, isDriverOnline: true } }
  );

  const u = await users.findOne({ _id: driverId });
  console.log('Driver ready:', {
    busy: u.isDriverBusy,
    online: u.isDriverOnline,
    activeRideId: u.activeRideId,
  });
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
