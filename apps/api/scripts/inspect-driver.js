require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const users = mongoose.connection.collection('users');
  const rides = mongoose.connection.collection('ridebookings');
  const u = await users.findOne({ phone: '9222222222' });
  console.log('user', {
    id: u._id.toString(),
    busy: u.isDriverBusy,
    online: u.isDriverOnline,
    activeRideId: u.activeRideId?.toString(),
  });
  if (u.activeRideId) {
    const ride = await rides.findOne({ _id: u.activeRideId });
    console.log('activeRide', ride ? { status: ride.status, assignmentState: ride.assignmentState } : 'missing');
  }
  const pending = await rides
    .find({ pendingDriverId: u._id, assignmentState: 'dispatching' })
    .sort({ createdAt: -1 })
    .limit(3)
    .toArray();
  console.log(
    'pendingOffers',
    pending.map((r) => ({
      id: r._id.toString(),
      status: r.status,
      expires: r.dispatchExpiresAt,
      vehicle: r.vehicleType,
    }))
  );
  const recent = await rides.find({}).sort({ createdAt: -1 }).limit(3).toArray();
  console.log(
    'recentRides',
    recent.map((r) => ({
      id: r._id.toString(),
      status: r.status,
      assignmentState: r.assignmentState,
      pending: r.pendingDriverId?.toString(),
      captain: r.captainId?.toString(),
    }))
  );
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
