import { getScheduleStatus } from '../services/restaurantOpeningHours';
import type { IOpeningHour } from '../models/OwnerRestaurant';

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
    const status = getScheduleStatus(undefined, new Date('2026-05-27T12:00:00'));
    expect(status.isWithinHours).toBe(true);
    expect(status.availabilityLabel).toBeNull();
  });

  it('is open during configured hours', () => {
    const status = getScheduleStatus(monFri, new Date('2026-05-27T12:00:00'));
    expect(status.isWithinHours).toBe(true);
  });

  it('shows tomorrow label after closing time', () => {
    const status = getScheduleStatus(monFri, new Date('2026-05-27T23:00:00'));
    expect(status.isWithinHours).toBe(false);
    expect(status.availabilityLabel).toMatch(/tomorrow at 9:00 am/i);
  });

  it('shows closed today on Sunday', () => {
    const status = getScheduleStatus(monFri, new Date('2026-05-31T12:00:00'));
    expect(status.isWithinHours).toBe(false);
    expect(status.availabilityLabel).toMatch(/Closed today/i);
    expect(status.availabilityLabel).toMatch(/tomorrow at 9:00 am/i);
  });
});
