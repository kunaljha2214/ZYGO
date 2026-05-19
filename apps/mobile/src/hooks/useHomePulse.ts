import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

export type ActivityPeriodDays = 1 | 7 | 30;

export const ACTIVITY_PERIOD_OPTIONS: { days: ActivityPeriodDays; label: string }[] = [
  { days: 1, label: '1 day' },
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
];

type FoodRow = {
  id: string;
  total: number;
  status: string;
  createdAt: string;
};

type RideRow = {
  id: string;
  fare: number;
  status: string;
  createdAt: string;
};

const FOOD_ACTIVE = new Set([
  'placed',
  'confirmed',
  'preparing',
  'ready_for_pickup',
  'rider_assigned',
  'out_for_delivery',
]);

const RIDE_ACTIVE = new Set([
  'requested',
  'dispatching',
  'assigned',
  'arriving',
  'arrived',
  'in_progress',
]);

export type HomePulseStats = {
  periodDays: ActivityPeriodDays;
  periodLabel: string;
  activeCount: number;
  activeGaugeProgress: number;
  periodTotal: number;
  periodFood: number;
  periodRides: number;
  periodSpent: number;
  activityBars: Array<{ label: string; value: number; highlight?: boolean }>;
  highlightBarCount: string;
  hasLiveActivity: boolean;
};

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function dayLabel(d: Date): string {
  return ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()];
}

function dateLabel(d: Date): string {
  return `${d.getDate()}`;
}

type UnifiedItem = (FoodRow | RideRow) & { kind: 'food' | 'ride' };

function buildActivityBars(
  all: UnifiedItem[],
  periodDays: ActivityPeriodDays,
  todayStart: number
): { bars: HomePulseStats['activityBars']; highlightBarCount: string } {
  if (periodDays === 1) {
    const slots = [
      { label: '12a', startH: 0, endH: 6 },
      { label: '6a', startH: 6, endH: 12 },
      { label: '12p', startH: 12, endH: 18 },
      { label: '6p', startH: 18, endH: 24 },
    ];
    const counts = slots.map((slot) => {
      return all.filter((x) => {
        const d = new Date(x.createdAt);
        if (d.getTime() < todayStart) return false;
        const h = d.getHours();
        return h >= slot.startH && h < slot.endH;
      }).length;
    });
    const max = Math.max(...counts, 1);
    const totalToday = counts.reduce((a, b) => a + b, 0);
    return {
      bars: counts.map((count, i) => ({
        label: slots[i].label,
        value: count / max,
        highlight: count > 0 && count === Math.max(...counts),
      })),
      highlightBarCount: String(totalToday),
    };
  }

  if (periodDays === 7) {
    const dayCounts: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = todayStart - i * 24 * 60 * 60 * 1000;
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;
      dayCounts.push(
        all.filter((x) => {
          const t = new Date(x.createdAt).getTime();
          return t >= dayStart && t < dayEnd;
        }).length
      );
    }
    const maxDay = Math.max(...dayCounts, 1);
    const todayCount = dayCounts[6] ?? 0;
    return {
      bars: dayCounts.map((count, i) => {
        const d = new Date(todayStart - (6 - i) * 24 * 60 * 60 * 1000);
        return {
          label: dayLabel(d),
          value: count / maxDay,
          highlight: i === 6,
        };
      }),
      highlightBarCount: String(todayCount),
    };
  }

  // 30 days → 6 buckets (~5 days each) for readable chart
  const periodStart = todayStart - 29 * 24 * 60 * 60 * 1000;
  const bucketCount = 6;
  const bucketMs = (30 * 24 * 60 * 60 * 1000) / bucketCount;
  const counts: number[] = [];
  for (let b = 0; b < bucketCount; b++) {
    const bStart = periodStart + b * bucketMs;
    const bEnd = bStart + bucketMs;
    counts.push(
      all.filter((x) => {
        const t = new Date(x.createdAt).getTime();
        return t >= bStart && t < bEnd;
      }).length
    );
  }
  const max = Math.max(...counts, 1);
  const lastBucket = counts[bucketCount - 1] ?? 0;
  return {
    bars: counts.map((count, i) => ({
      label: `W${i + 1}`,
      value: count / max,
      highlight: i === bucketCount - 1 && count > 0,
    })),
    highlightBarCount: String(lastBucket),
  };
}

export function computeHomePulse(
  food: FoodRow[],
  rides: RideRow[],
  periodDays: ActivityPeriodDays
): HomePulseStats {
  const now = new Date();
  const todayStart = startOfDay(now).getTime();
  const periodStart = todayStart - (periodDays - 1) * 24 * 60 * 60 * 1000;

  const all: UnifiedItem[] = [
    ...food.map((o) => ({ ...o, kind: 'food' as const })),
    ...rides.map((r) => ({ ...r, kind: 'ride' as const })),
  ];

  const activeCount = all.filter((x) =>
    x.kind === 'food' ? FOOD_ACTIVE.has(x.status) : RIDE_ACTIVE.has(x.status)
  ).length;

  const periodItems = all.filter((x) => new Date(x.createdAt).getTime() >= periodStart);
  const periodFood = periodItems.filter((x) => x.kind === 'food').length;
  const periodRides = periodItems.filter((x) => x.kind === 'ride').length;
  const periodTotal = periodFood + periodRides;

  const periodSpent = periodItems.reduce((sum, x) => {
    if (x.kind === 'food' && x.status === 'delivered') return sum + x.total;
    if (x.kind === 'ride' && x.status === 'completed') return sum + x.fare;
    return sum;
  }, 0);

  const { bars, highlightBarCount } = buildActivityBars(all, periodDays, todayStart);

  const periodLabel =
    periodDays === 1 ? 'Today' : periodDays === 7 ? '7 days' : '30 days';

  return {
    periodDays,
    periodLabel,
    activeCount,
    activeGaugeProgress: activeCount === 0 ? 0 : Math.min(1, activeCount / 5),
    periodTotal,
    periodFood,
    periodRides,
    periodSpent,
    activityBars: bars,
    highlightBarCount,
    hasLiveActivity: activeCount > 0,
  };
}

function emptyStats(periodDays: ActivityPeriodDays): HomePulseStats {
  const periodLabel =
    periodDays === 1 ? 'Today' : periodDays === 7 ? '7 days' : '30 days';
  const barCount = periodDays === 1 ? 4 : periodDays === 7 ? 7 : 6;
  const labels =
    periodDays === 1
      ? ['12a', '6a', '12p', '6p']
      : periodDays === 7
        ? ['M', 'T', 'W', 'T', 'F', 'S', 'S']
        : ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'];
  return {
    periodDays,
    periodLabel,
    activeCount: 0,
    activeGaugeProgress: 0,
    periodTotal: 0,
    periodFood: 0,
    periodRides: 0,
    periodSpent: 0,
    activityBars: labels.map((label, i) => ({
      label,
      value: 0,
      highlight: i === labels.length - 1,
    })),
    highlightBarCount: '0',
    hasLiveActivity: false,
  };
}

export function useHomePulse(periodDays: ActivityPeriodDays) {
  return useQuery({
    queryKey: ['home-pulse', periodDays],
    queryFn: async () => {
      const [foodRes, rideRes] = await Promise.all([
        api.get<FoodRow[]>('/orders'),
        api.get<RideRow[]>('/rides'),
      ]);
      return computeHomePulse(foodRes.data, rideRes.data, periodDays);
    },
    staleTime: 30_000,
    placeholderData: emptyStats(periodDays),
  });
}
