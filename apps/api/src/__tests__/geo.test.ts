import { haversineKm, computeFare, estimateDurationMin, computeFoodDeliveryEtaMinutes } from '../utils/geo';

describe('geo utils', () => {
  it('computes positive distance', () => {
    const d = haversineKm({ lat: 12.9716, lng: 77.5946 }, { lat: 12.981, lng: 77.6 });
    expect(d).toBeGreaterThan(0.5);
    expect(d).toBeLessThan(20);
  });

  it('estimates duration', () => {
    expect(estimateDurationMin(5)).toBeGreaterThanOrEqual(5);
  });

  it('computes fare for bike', () => {
    const { fare } = computeFare('bike', 4, 12);
    expect(fare).toBeGreaterThan(0);
  });

  it('clamps food delivery ETA to schema max', () => {
    const eta = computeFoodDeliveryEtaMinutes(
      { lat: 12.9716, lng: 77.5946 },
      { lat: 28.4, lng: 77.5946 }
    );
    expect(eta).toBeLessThanOrEqual(180);
    expect(eta).toBeGreaterThanOrEqual(5);
  });

  it('fixes swapped lat/lng for ETA', () => {
    const eta = computeFoodDeliveryEtaMinutes(
      { lat: 12.9716, lng: 77.5946 },
      { lat: 77.5946, lng: 12.9716 }
    );
    expect(eta).toBe(5);
  });
});
