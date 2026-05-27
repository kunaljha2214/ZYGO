import type { IOpeningHour } from '../models/OwnerRestaurant';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

function parseHm(hhmm: string): number {
  const [h, m] = hhmm.split(':').map((v) => Number(v));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
}

function toMinutes(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

export function formatTime12h(hhmm: string): string {
  const mins = parseHm(hhmm);
  const h24 = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const period = h24 >= 12 ? 'pm' : 'am';
  const h12 = h24 % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

function isWithinSlot(open: string, close: string, now: Date): boolean {
  const nowM = toMinutes(now);
  const openM = parseHm(open);
  const closeM = parseHm(close);
  if (openM === closeM) return false;
  if (openM < closeM) {
    return nowM >= openM && nowM < closeM;
  }
  return nowM >= openM || nowM < closeM;
}

function findNextOpening(
  hours: IOpeningHour[],
  from: Date
): { dayOffset: number; day: number; open: string } | null {
  for (let offset = 0; offset <= 7; offset += 1) {
    const probe = new Date(from);
    probe.setDate(probe.getDate() + offset);
    const day = probe.getDay();
    const slot = hours.find((h) => h.day === day);
    if (!slot || slot.closed) continue;

    if (offset === 0) {
      const nowM = toMinutes(from);
      const openM = parseHm(slot.open);
      if (nowM < openM) {
        return { dayOffset: 0, day, open: slot.open };
      }
      if (isWithinSlot(slot.open, slot.close, from)) {
        return null;
      }
      continue;
    }

    return { dayOffset: offset, day, open: slot.open };
  }
  return null;
}

export type ScheduleStatus = {
  isWithinHours: boolean;
  availabilityLabel: string | null;
};

/** Customer-facing open/closed copy from daily opening hours. */
export function getScheduleStatus(
  openingHours: IOpeningHour[] | undefined,
  now: Date = new Date()
): ScheduleStatus {
  if (!openingHours?.length) {
    return { isWithinHours: true, availabilityLabel: null };
  }

  const today = now.getDay();
  const todaySlot = openingHours.find((h) => h.day === today);

  if (todaySlot && !todaySlot.closed && isWithinSlot(todaySlot.open, todaySlot.close, now)) {
    return { isWithinHours: true, availabilityLabel: null };
  }

  const next = findNextOpening(openingHours, now);
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
