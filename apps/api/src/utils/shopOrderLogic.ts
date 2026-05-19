import type { IFoodOrderItem } from '../models/FoodOrder';

const STATION_KEYWORDS: { station: string; keywords: string[] }[] = [
  { station: 'Grill', keywords: ['burger', 'grill', 'chicken', 'kebab', 'tikka', 'bbq', 'steak'] },
  { station: 'Fryer', keywords: ['fries', 'fried', 'pakora', 'samosa', 'nugget'] },
  { station: 'Drinks', keywords: ['juice', 'lassi', 'coffee', 'tea', 'shake', 'cola', 'soda', 'drink'] },
  { station: 'Dessert', keywords: ['ice', 'cake', 'sweet', 'dessert', 'kulfi'] },
];

export const SHOP_STATUS_FLOW = [
  'placed',
  'confirmed',
  'preparing',
  'ready_for_pickup',
  'rider_assigned',
  'out_for_delivery',
  'delivered',
] as const;

export type ShopFlowStatus = (typeof SHOP_STATUS_FLOW)[number];

export function nextStatus(current: string): ShopFlowStatus | null {
  const idx = SHOP_STATUS_FLOW.indexOf(current as ShopFlowStatus);
  if (idx < 0 || idx >= SHOP_STATUS_FLOW.length - 1) return null;
  const next = SHOP_STATUS_FLOW[idx + 1];
  /** After ready, rider dispatch handles rider_assigned → delivery */
  if (current === 'ready_for_pickup') return null;
  return next;
}

export function canTransition(from: string, to: string): boolean {
  if (from === 'placed' && to === 'confirmed') return true;
  if (from === 'placed' && to === 'cancelled') return true;
  return nextStatus(from) === to;
}

export function routeKitchenStation(items: IFoodOrderItem[]): string {
  const names = items.map((i) => i.name.toLowerCase()).join(' ');
  for (const { station, keywords } of STATION_KEYWORDS) {
    if (keywords.some((k) => names.includes(k))) return station;
  }
  return 'Main';
}

export function estimatePrepMinutes(itemCount: number, queueDepth: number): number {
  const base = 8 + itemCount * 3;
  const queuePenalty = queueDepth * 4;
  return Math.min(60, base + queuePenalty);
}

export function predictDelayMinutes(
  queueDepth: number,
  avgPrep: number,
  estimatedPrep?: number
): number {
  const prep = estimatedPrep ?? avgPrep;
  const load = queueDepth * 3;
  const risk = Math.max(0, load + prep - 25);
  return Math.round(risk);
}

export type BatchGroup = {
  batchId: string;
  orderIds: string[];
  reason: string;
  suggestedStartTogether: boolean;
};

export function suggestBatches(
  orders: { id: string; createdAt: Date; status: string; items: IFoodOrderItem[] }[]
): BatchGroup[] {
  const active = orders.filter((o) =>
    ['confirmed', 'preparing', 'placed'].includes(o.status)
  );
  const groups: BatchGroup[] = [];
  const used = new Set<string>();

  for (let i = 0; i < active.length; i++) {
    const a = active[i];
    if (used.has(a.id)) continue;
    const peers: string[] = [a.id];
    const aTime = new Date(a.createdAt).getTime();
    const aNames = new Set(a.items.map((it) => it.name.toLowerCase()));

    for (let j = i + 1; j < active.length; j++) {
      const b = active[j];
      if (used.has(b.id)) continue;
      const bTime = new Date(b.createdAt).getTime();
      if (Math.abs(aTime - bTime) > 5 * 60 * 1000) continue;
      const overlap = b.items.some((it) => aNames.has(it.name.toLowerCase()));
      if (overlap || Math.abs(aTime - bTime) < 2 * 60 * 1000) {
        peers.push(b.id);
        used.add(b.id);
      }
    }
    used.add(a.id);
    if (peers.length > 1) {
      groups.push({
        batchId: `batch-${a.id.slice(-6)}`,
        orderIds: peers,
        reason: 'Orders placed within 5 min with overlapping items',
        suggestedStartTogether: true,
      });
    }
  }
  return groups;
}
