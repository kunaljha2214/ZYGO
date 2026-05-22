import type { DriverEarningsDashboard } from '../types/driver';

export type DriverHubCache = {
  online: boolean;
  earnings: DriverEarningsDashboard;
};

let snapshot: DriverHubCache | null = null;

export function getDriverHubCache(): DriverHubCache | null {
  return snapshot;
}

export function setDriverHubCache(data: DriverHubCache): void {
  snapshot = data;
}

export function clearDriverHubCache(): void {
  snapshot = null;
}
