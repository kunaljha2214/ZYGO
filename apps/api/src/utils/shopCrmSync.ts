import { Types } from 'mongoose';
import { FoodOrder } from '../models/FoodOrder';
import { ShopCustomerProfile } from '../models/ShopCustomerProfile';

export async function syncCustomerProfiles(restaurantId: string): Promise<void> {
  const rid = new Types.ObjectId(restaurantId);
  const orders = await FoodOrder.find({
    restaurantId: rid,
    status: { $in: ['delivered', 'out_for_delivery', 'ready_for_pickup', 'confirmed', 'preparing', 'cancelled', 'placed'] },
  }).lean();

  const byUser = new Map<
    string,
    { totalOrders: number; totalSpent: number; lastOrderAt: Date; firstOrderAt: Date; delivered: number }
  >();

  for (const o of orders) {
    const uid = o.userId.toString();
    const prev = byUser.get(uid) ?? {
      totalOrders: 0,
      totalSpent: 0,
      lastOrderAt: new Date(o.createdAt),
      firstOrderAt: new Date(o.createdAt),
      delivered: 0,
    };
    prev.totalOrders += 1;
    if (o.status === 'delivered') {
      prev.totalSpent += o.total;
      prev.delivered += 1;
    }
    const created = new Date(o.createdAt);
    if (created > prev.lastOrderAt) prev.lastOrderAt = created;
    if (created < prev.firstOrderAt) prev.firstOrderAt = created;
    byUser.set(uid, prev);
  }

  for (const [userId, stats] of byUser) {
    const earnedPoints = Math.floor(stats.totalSpent / 100) + stats.delivered * 10;
    const existing = await ShopCustomerProfile.findOne({
      restaurantId: rid,
      userId: new Types.ObjectId(userId),
    });
    const loyaltyPoints = existing
      ? Math.max(existing.loyaltyPoints, earnedPoints)
      : earnedPoints;

    await ShopCustomerProfile.findOneAndUpdate(
      { restaurantId: rid, userId: new Types.ObjectId(userId) },
      {
        $set: {
          totalOrders: stats.totalOrders,
          totalSpent: Math.round(stats.totalSpent),
          lastOrderAt: stats.lastOrderAt,
          firstOrderAt: stats.firstOrderAt,
          loyaltyPoints,
        },
      },
      { upsert: true, new: true }
    );
  }
}
