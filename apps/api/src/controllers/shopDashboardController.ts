import createError from 'http-errors';
import type { Response, NextFunction } from 'express';
import type { AuthedRequest } from '../middleware/auth';
import { FoodOrder } from '../models/FoodOrder';
import { Restaurant } from '../models/Restaurant';
import { OwnerRestaurant } from '../models/OwnerRestaurant';
import { PENDING_APPROVAL_MSG } from '../utils/menuAccess';

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function hourLabel(h: number): string {
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${suffix}`;
}

export async function getShopDashboard(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const reg = await OwnerRestaurant.findOne({
      ownerId: req.user!.sub,
      approvalStatus: 'approved',
    });
    if (!reg?.restaurantListingId) {
      next(createError(403, PENDING_APPROVAL_MSG));
      return;
    }

    const restaurantId = reg.restaurantListingId;
    const restaurant = await Restaurant.findById(restaurantId).lean();
    const now = new Date();
    const todayStart = startOfDay(now);

    const orders = await FoodOrder.find({ restaurantId }).sort({ createdAt: -1 }).lean();

    const todayOrders = orders.filter((o) => new Date(o.createdAt) >= todayStart);
    const pendingStatuses = new Set([
      'placed',
      'confirmed',
      'preparing',
      'ready_for_pickup',
      'out_for_delivery',
    ]);

    const ordersToday = todayOrders.filter((o) => o.status !== 'cancelled').length;
    const revenueToday = todayOrders
      .filter((o) => o.status === 'delivered')
      .reduce((sum, o) => sum + o.total, 0);
    const pendingOrders = orders.filter((o) => pendingStatuses.has(o.status)).length;
    const cancelledToday = todayOrders.filter((o) => o.status === 'cancelled').length;

    const itemMap = new Map<string, { name: string; quantity: number; revenue: number }>();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    for (const o of orders) {
      if (new Date(o.createdAt) < thirtyDaysAgo || o.status === 'cancelled') continue;
      for (const item of o.items) {
        const key = item.name;
        const prev = itemMap.get(key) ?? { name: item.name, quantity: 0, revenue: 0 };
        prev.quantity += item.quantity;
        prev.revenue += item.price * item.quantity;
        itemMap.set(key, prev);
      }
    }
    const topSellingItems = [...itemMap.values()]
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    const liveOrders = orders
      .filter((o) => pendingStatuses.has(o.status))
      .slice(0, 8)
      .map((o) => ({
        id: o._id.toString(),
        orderNumber: o.orderNumber,
        status: o.status,
        total: o.total,
        itemCount: o.items.reduce((s, i) => s + i.quantity, 0),
        createdAt: o.createdAt,
      }));

    const dailySales: { label: string; date: string; revenue: number; orders: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(todayStart);
      d.setDate(d.getDate() - i);
      const key = dayKey(d);
      const dayOrders = orders.filter(
        (o) => dayKey(new Date(o.createdAt)) === key && o.status !== 'cancelled'
      );
      dailySales.push({
        label: d.toLocaleDateString('en-IN', { weekday: 'short' }),
        date: key,
        revenue: Math.round(
          dayOrders.filter((o) => o.status === 'delivered').reduce((s, o) => s + o.total, 0)
        ),
        orders: dayOrders.length,
      });
    }

    const weeklyTrends: { label: string; revenue: number; orders: number }[] = [];
    for (let w = 3; w >= 0; w--) {
      const weekEnd = new Date(todayStart);
      weekEnd.setDate(weekEnd.getDate() - w * 7);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 6);
      const weekOrders = orders.filter((o) => {
        const t = new Date(o.createdAt);
        return t >= weekStart && t <= new Date(weekEnd.getTime() + 86400000 - 1) && o.status !== 'cancelled';
      });
      weeklyTrends.push({
        label: w === 0 ? 'This week' : `${w}w ago`,
        revenue: Math.round(
          weekOrders.filter((o) => o.status === 'delivered').reduce((s, o) => s + o.total, 0)
        ),
        orders: weekOrders.length,
      });
    }

    const hourCounts = new Array(24).fill(0) as number[];
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    for (const o of orders) {
      if (new Date(o.createdAt) < sevenDaysAgo) continue;
      hourCounts[new Date(o.createdAt).getHours()] += 1;
    }
    const peakOrderTimes = hourCounts
      .map((count, hour) => ({ hour, label: hourLabel(hour), count }))
      .filter((h) => h.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const deliveredCount = orders.filter((o) => o.status === 'delivered').length;
    const rating = restaurant?.rating ?? 4.5;

    res.json({
      shopName: reg.name,
      restaurantId: restaurantId.toString(),
      customerRating: rating,
      ratingLabel:
        deliveredCount > 0 ? `${rating.toFixed(1)} ★ · ${deliveredCount}+ orders` : `${rating.toFixed(1)} ★ store rating`,
      summary: {
        ordersToday,
        revenueToday: Math.round(revenueToday),
        pendingOrders,
        cancelledToday,
      },
      topSellingItems,
      liveOrders,
      dailySales,
      weeklyTrends,
      peakOrderTimes,
    });
  } catch (e) {
    next(e);
  }
}
