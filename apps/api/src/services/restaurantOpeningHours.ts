import type { IOpeningHour } from '../models/OwnerRestaurant';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/** Opening hours are stored in local shop time (default India). */
export const DEFAULT_SHOP_TIMEZONE =
  process.env.SHOP_TIMEZONE?.trim() || 'Asia/Kolkata';

const WEEKDAY_TO_NUM: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export type ShopLocalClock = {
  dayOfWeek: number;
  minutesSinceMidnight: number;
};

/** Wall-clock time in the shop timezone (not server UTC). */
export function getShopLocalClock(
  now: Date = new Date(),
  timeZone: string = DEFAULT_SHOP_TIMEZONE
): ShopLocalClock {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? 'Sun';
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);

  return {
    dayOfWeek: WEEKDAY_TO_NUM[weekday] ?? 0,
    minutesSinceMidnight: hour * 60 + minute,
  };
}

function parseHm(hhmm: string): number {
  const [h, m] = hhmm.split(':').map((v) => Number(v));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
}

export function formatTime12h(hhmm: string): string {
  const mins = parseHm(hhmm);
  const h24 = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const period = h24 >= 12 ? 'pm' : 'am';
  const h12 = h24 % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

function isWithinSlotLocal(open: string, close: string, minutesSinceMidnight: number): boolean {
  const openM = parseHm(open);
  const closeM = parseHm(close);
  if (openM === closeM) return false;
  if (openM < closeM) {
    return minutesSinceMidnight >= openM && minutesSinceMidnight < closeM;
  }
  return minutesSinceMidnight >= openM || minutesSinceMidnight < closeM;
}

function findNextOpening(
  hours: IOpeningHour[],
  now: Date,
  timeZone: string
): { dayOffset: number; day: number; open: string } | null {
  for (let offset = 0; offset <= 7; offset += 1) {
    const probe = new Date(now.getTime() + offset * 24 * 60 * 60 * 1000);
    const { dayOfWeek, minutesSinceMidnight } = getShopLocalClock(probe, timeZone);
    const slot = hours.find((h) => h.day === dayOfWeek);
    if (!slot || slot.closed) continue;

    if (offset === 0) {
      const openM = parseHm(slot.open);
      if (minutesSinceMidnight < openM) {
        return { dayOffset: 0, day: dayOfWeek, open: slot.open };
      }
      if (isWithinSlotLocal(slot.open, slot.close, minutesSinceMidnight)) {
        return null;
      }
      continue;
    }

    return { dayOffset: offset, day: dayOfWeek, open: slot.open };
  }
  return null;
}

export type ScheduleStatus = {
  isWithinHours: boolean;
  availabilityLabel: string | null;
};

/** Customer-facing open/closed copy from daily opening hours (shop local timezone). */
export function getScheduleStatus(
  openingHours: IOpeningHour[] | undefined,
  now: Date = new Date(),
  timeZone: string = DEFAULT_SHOP_TIMEZONE
): ScheduleStatus {
  if (!openingHours?.length) {
    return { isWithinHours: true, availabilityLabel: null };
  }

  const { dayOfWeek, minutesSinceMidnight } = getShopLocalClock(now, timeZone);
  const todaySlot = openingHours.find((h) => h.day === dayOfWeek);

  if (
    todaySlot &&
    !todaySlot.closed &&
    isWithinSlotLocal(todaySlot.open, todaySlot.close, minutesSinceMidnight)
  ) {
    return { isWithinHours: true, availabilityLabel: null };
  }

  const next = findNextOpening(openingHours, now, timeZone);
  if (!next) {
    return { isWithinHours: false, availabilityLabel: 'Closed' };
  }

  if (next.dayOffset === 0) {
    return {
      isWithinHours: false,
      availabilityLabel: `Opens today at ${formatTime12h(next.open)}`,
    };
  }

  const dayLabel = next.dayOffset === 1 ? 'tomorrow' : DAY_NAMES[next.day];
  const closedPrefix =
    !todaySlot || todaySlot.closed ? 'Closed today' : 'Closed now';

  return {
    isWithinHours: false,
    availabilityLabel: `${closedPrefix} · Opens ${dayLabel} at ${formatTime12h(next.open)}`,
  };
}
