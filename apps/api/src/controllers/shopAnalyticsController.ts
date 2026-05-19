import type { Response, NextFunction } from 'express';
import type { AuthedRequest } from '../middleware/auth';
import { FoodOrder } from '../models/FoodOrder';
import { requireApprovedRestaurantId } from '../utils/menuAccess';
import {
  aggregateItemWise,
  forecastDemand,
  forecastInventory,
  hourLabel,
  parsePeriod,
  profitMarginAnalysis,
} from '../utils/shopAnalyticsLogic';

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function getShopAnalytics(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const restaurantId = await requireApprovedRestaurantId(req.user!.sub);
    const days = parsePeriod(req.query.period as string | undefined);
    const now = new Date();
    const periodStart = new Date(now.getTime() - days * 86400000);

    const orders = await FoodOrder.find({
      restaurantId,
      createdAt: { $gte: periodStart },
    }).lean();

    const delivered = orders.filter((o) => o.status === 'delivered');
    const cancelled = orders.filter((o) => o.status === 'cancelled');
    const revenue = delivered.reduce((s, o) => s + o.total, 0);

    const dailyMap = new Map<string, { revenue: number; orders: number }>();
    for (let i = days - 1; i >= 0; i--) {
      const d = startOfDay(now);
      d.setDate(d.getDate() - i);
      dailyMap.set(dayKey(d), { revenue: 0, orders: 0 });
    }
    for (const o of orders) {
      if (o.status === 'cancelled') continue;
      const key = dayKey(new Date(o.createdAt));
      const row = dailyMap.get(key);
      if (!row) continue;
      row.orders += 1;
      if (o.status === 'delivered') row.revenue += o.total;
    }
    const dailySales = [...dailyMap.entries()].map(([date, v]) => {
      const d = new Date(date);
      return {
        date,
        label: d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' }),
        revenue: Math.round(v.revenue),
        orders: v.orders,
      };
    });

    const itemWise = aggregateItemWise(orders);
    const hourCounts = new Array(24).fill(0) as number[];
    const hourRevenue = new Array(24).fill(0) as number[];
    for (const o of delivered) {
      const h = new Date(o.createdAt).getHours();
      hourCounts[h] += 1;
      hourRevenue[h] += o.total;
    }
    const peakHours = hourCounts
      .map((count, hour) => ({
        hour,
        label: hourLabel(hour),
        count,
        revenue: Math.round(hourRevenue[hour]),
      }))
      .filter((h) => h.count > 0)
      .sort((a, b) => b.count - a.count);

    const customerIds = new Set<string>();
    const repeatSet = new Set<string>();
    const orderCountByUser = new Map<string, number>();
    for (const o of orders) {
      const uid = o.userId.toString();
      customerIds.add(uid);
      const c = (orderCountByUser.get(uid) ?? 0) + 1;
      orderCountByUser.set(uid, c);
      if (c >= 2) repeatSet.add(uid);
    }
    const totalCustomers = customerIds.size;
    const repeatCustomers = repeatSet.size;

    const cancelReasons = new Map<string, number>();
    for (const o of cancelled) {
      const reason = o.rejectReason?.trim() || 'No reason recorded';
      cancelReasons.set(reason, (cancelReasons.get(reason) ?? 0) + 1);
    }

    const itemQtyForForecast = itemWise.map((i) => ({ name: i.name, quantity: i.quantity }));

    res.json({
      period: `${days}d`,
      salesReport: {
        totalRevenue: Math.round(revenue),
        orderCount: orders.filter((o) => o.status !== 'cancelled').length,
        deliveredCount: delivered.length,
        avgOrderValue:
          delivered.length > 0 ? Math.round(revenue / delivered.length) : 0,
        daily: dailySales,
      },
      itemWiseReport: itemWise,
      peakHours,
      customerRetention: {
        totalCustomers,
        repeatCustomers,
        repeatRate:
          totalCustomers > 0 ? Math.round((repeatCustomers / totalCustomers) * 100) : 0,
        newCustomers: totalCustomers - repeatCustomers,
      },
      cancellationAnalysis: {
        cancelledCount: cancelled.length,
        totalOrders: orders.length,
        cancellationRate:
          orders.length > 0 ? Math.round((cancelled.length / orders.length) * 100) : 0,
        reasons: [...cancelReasons.entries()].map(([reason, count]) => ({ reason, count })),
      },
      advanced: {
        demandForecast: forecastDemand(dailySales),
        inventoryForecast: forecastInventory(itemQtyForForecast, days),
        profitMargin: profitMarginAnalysis(Math.round(revenue), itemWise),
      },
    });
  } catch (e) {
    next(e);
  }
}
