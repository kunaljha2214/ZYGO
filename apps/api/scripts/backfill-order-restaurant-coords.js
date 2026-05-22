/**
 * Backfill restaurantCoords + restaurantName on food orders missing coords.
 * Run: node scripts/backfill-order-restaurant-coords.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI required');
    process.exit(1);
  }
  await mongoose.connect(uri);
  const FoodOrder = mongoose.connection.collection('foodorders');
  const Restaurant = mongoose.connection.collection('restaurants');

  const missing = await FoodOrder.find({
    $or: [
      { restaurantCoords: { $exists: false } },
      { 'restaurantCoords.lat': { $exists: false } },
      { 'restaurantCoords.lat': null },
    ],
  }).toArray();

  let updated = 0;
  for (const o of missing) {
    if (!o.restaurantId) continue;
    const r = await Restaurant.findOne({ _id: o.restaurantId });
    const c = r?.location?.coordinates;
    if (!c || c.length < 2) {
      console.log('skip (no restaurant location):', o.orderNumber);
      continue;
    }
    const [lng, lat] = c;
    await FoodOrder.updateOne(
      { _id: o._id },
      {
        $set: {
          restaurantCoords: { lat, lng },
          ...(r.name && !o.restaurantName ? { restaurantName: r.name } : {}),
        },
      }
    );
    updated++;
    console.log('updated:', o.orderNumber);
  }

  console.log(`Done. Updated ${updated} of ${missing.length} orders.`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
