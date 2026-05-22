require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log('MONGODB_URI missing');
    process.exit(1);
  }
  await mongoose.connect(uri);
  const FoodOrder = mongoose.connection.collection('foodorders');
  const Restaurant = mongoose.connection.collection('restaurants');
  const recent = await FoodOrder.find({
    status: { $in: ['out_for_delivery', 'rider_assigned'] },
  })
    .sort({ updatedAt: -1 })
    .limit(5)
    .toArray();
  for (const o of recent) {
    const r = o.restaurantId
      ? await Restaurant.findOne({ _id: o.restaurantId })
      : null;
    console.log(
      JSON.stringify({
        orderNumber: o.orderNumber,
        status: o.status,
        restaurantCoords: o.restaurantCoords,
        restaurantName: o.restaurantName,
        restHasLoc: Boolean(r?.location?.coordinates?.length),
        restCoords: r?.location?.coordinates,
      })
    );
  }
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
