require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const users = mongoose.connection.collection('users');
  const profiles = mongoose.connection.collection('driverprofiles');
  const approved = await profiles.find({ approvalStatus: 'approved' }).toArray();
  const ids = approved.map((p) => p.driverId);
  const drivers = await users
    .find({
      _id: { $in: ids },
      role: 'driver',
      isDriverOnline: true,
      isDriverBusy: { $ne: true },
      driverVehicleType: 'bike',
      currentLocation: { $exists: true, $ne: null },
    })
    .toArray();
  console.log(
    'eligible',
    drivers.map((d) => ({
      phone: d.phone,
      busy: d.isDriverBusy,
      online: d.isDriverOnline,
    }))
  );
  await mongoose.disconnect();
}

main();
