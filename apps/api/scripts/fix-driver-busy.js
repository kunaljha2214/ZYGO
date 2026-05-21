require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI missing');
  await mongoose.connect(uri);
  const users = mongoose.connection.collection('users');
  const r = await users.findOne({ phone: '9222222222' });
  if (!r) {
    console.log('Driver 9222222222 not found');
    process.exit(1);
  }
  console.log('Before', {
    isDriverOnline: r.isDriverOnline,
    isDriverBusy: r.isDriverBusy,
    activeRideId: r.activeRideId,
    role: r.role,
    driverVehicleType: r.driverVehicleType,
  });
  await users.updateOne({ _id: r._id }, { $set: { isDriverBusy: false, activeRideId: null } });
  const after = await users.findOne({ _id: r._id });
  console.log('After', {
    isDriverOnline: after.isDriverOnline,
    isDriverBusy: after.isDriverBusy,
    activeRideId: after.activeRideId,
  });
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
