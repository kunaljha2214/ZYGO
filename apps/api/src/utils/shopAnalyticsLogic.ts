import type { IFoodOrderItem } from '../models/FoodOrder';

const FOOD_COST_RATIO = 0.35;

export function parsePeriod(period?: string): number {
  if (period === '7d') return 7;
  if (period === '90d') return 90;
  return 30;
}

export function hourLabel(h: number): string {
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${suffix}`;
}

export function aggregateItemWise(
  orders: { items: IFoodOrderItem[]; status: string }[]
): { name: string; quantity: number; revenue: number; sharePercent: number }[] {
  const map = new Map<string, { quantity: number; revenue: number }>();
  let totalRev = 0;
  for (const o of orders) {
    if (o.status !== 'delivered') continue;
    for (const it of o.items) {
      const rev = it.price * it.quantity;
      totalRev += rev;
      const p = map.get(it.name) ?? { quantity: 0, revenue: 0 };
      p.quantity += it.quantity;
      p.revenue += rev;
      map.set(it.name, p);
    }
  }
  return [...map.entries()]
    .map(([name, v]) => ({
      name,
      quantity: v.quantity,
      revenue: Math.round(v.revenue),
      sharePercent: totalRev > 0 ? Math.round((v.revenue / totalRev) * 100) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

export function forecastDemand(
  dailyOrders: { date: string; orders: number }[]
): { date: string; label: string; predictedOrders: number }[] {
  const recent = dailyOrders.slice(-7);
  const avg = recent.length
    ? recent.reduce((s, d) => s + d.orders, 0) / recent.length
    : 5;
  const out: { date: string; label: string; predictedOrders: number }[] = [];
  for (let i = 1; i <= 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const weekend = d.getDay() === 0 || d.getDay() === 6;
    const predicted = Math.round(avg * (weekend ? 1.25 : 1));
    out.push({
      date: key,
      label: d.toLocaleDateString('en-IN', { weekday: 'short' }),
      predictedOrders: predicted,
    });
  }
  return out;
}

export function forecastInventory(
  itemWise: { name: string; quantity: number }[],
  days = 7
): { itemName: string; avgDailyQty: number; suggestedStock: number; daysCover: number }[] {
  return itemWise.slice(0, 8).map((it) => {
    const avgDaily = Math.max(1, Math.ceil(it.quantity / days));
    const suggestedStock = avgDaily * 5;
    return {
      itemName: it.name,
      avgDailyQty: avgDaily,
      suggestedStock,
      daysCover: 5,
    };
  });
}

export function profitMarginAnalysis(
  revenue: number,
  itemWise: { name: string; revenue: number }[]
): {
  revenue: number;
  estimatedCost: number;
  grossProfit: number;
  marginPercent: number;
  byItem: { name: string; revenue: number; marginPercent: number }[];
} {
  const estimatedCost = Math.round(revenue * FOOD_COST_RATIO);
  const grossProfit = revenue - estimatedCost;
  return {
    revenue,
    estimatedCost,
    grossProfit,
    marginPercent: revenue > 0 ? Math.round((grossProfit / revenue) * 100) : 0,
    byItem: itemWise.slice(0, 6).map((it) => ({
      name: it.name,
      revenue: it.revenue,
      marginPercent: 65,
    })),
  };
}
