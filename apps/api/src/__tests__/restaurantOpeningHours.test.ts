import {
  DEFAULT_SHOP_TIMEZONE,
  getScheduleStatus,
} from '../services/restaurantOpeningHours';
import type { IOpeningHour } from '../models/OwnerRestaurant';

const TZ = DEFAULT_SHOP_TIMEZONE;

const monFri: IOpeningHour[] = [
  { day: 0, open: '09:00', close: '22:00', closed: true },
  { day: 1, open: '09:00', close: '22:00', closed: false },
  { day: 2, open: '09:00', close: '22:00', closed: false },
  { day: 3, open: '09:00', close: '22:00', closed: false },
  { day: 4, open: '09:00', close: '22:00', closed: false },
  { day: 5, open: '09:00', close: '22:00', closed: false },
  { day: 6, open: '09:00', close: '22:00', closed: false },
];

describe('restaurantOpeningHours', () => {
  it('treats missing hours as always within schedule', () => {
    const status = getScheduleStatus(undefined, new Date('2026-05-27T04:40:00.000Z'), TZ);
    expect(status.isWithinHours).toBe(true);
    expect(status.availabilityLabel).toBeNull();
  });

  it('is open during configured hours (10:10 IST on a Wednesday)', () => {
    const status = getScheduleStatus(monFri, new Date('2026-05-27T04:40:00.000Z'), TZ);
    expect(status.isWithinHours).toBe(true);
    expect(status.availabilityLabel).toBeNull();
  });

  it('shows opens today before 9am IST', () => {
    const status = getScheduleStatus(monFri, new Date('2026-05-27T03:00:00.000Z'), TZ);
    expect(status.isWithinHours).toBe(false);
    expect(status.availabilityLabel).toMatch(/Opens today at 9:00 am/i);
  });

  it('does not treat UTC morning as before 9am IST when shop is already open', () => {
    // 04:40 UTC = 10:10 IST — would wrongly fail if server used UTC wall clock
    const status = getScheduleStatus(monFri, new Date('2026-05-27T04:40:00.000Z'), TZ);
    expect(status.isWithinHours).toBe(true);
  });

  it('shows tomorrow label after closing time (23:00 IST)', () => {
    const status = getScheduleStatus(monFri, new Date('2026-05-27T17:30:00.000Z'), TZ);
    expect(status.isWithinHours).toBe(false);
    expect(status.availabilityLabel).toMatch(/tomorrow at 9:00 am/i);
  });

  it('shows closed today on Sunday noon IST', () => {
    const status = getScheduleStatus(monFri, new Date('2026-05-31T06:30:00.000Z'), TZ);
    expect(status.isWithinHours).toBe(false);
    expect(status.availabilityLabel).toMatch(/Closed today/i);
    expect(status.availabilityLabel).toMatch(/tomorrow at 9:00 am/i);
  });
});
