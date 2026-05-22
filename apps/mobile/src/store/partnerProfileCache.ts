import type { DriverProfile } from '../types/driver';

export type PartnerGateMode = 'register' | 'status' | 'app';

type DriverSnapshot = {
  mode: PartnerGateMode;
  profile: DriverProfile;
};

let driverSnapshot: DriverSnapshot | null = null;

export function driverGateModeFromProfile(profile: DriverProfile): PartnerGateMode {
  if (profile.approvalStatus === 'draft') return 'register';
  if (
    profile.approvalStatus === 'pending' ||
    profile.approvalStatus === 'rejected' ||
    profile.approvalStatus === 'blocked'
  ) {
    return 'status';
  }
  return 'app';
}

export function setDriverProfileCache(profile: DriverProfile): void {
  driverSnapshot = {
    mode: driverGateModeFromProfile(profile),
    profile,
  };
}

export function getDriverProfileCache(): DriverSnapshot | null {
  return driverSnapshot;
}

export function clearDriverProfileCache(): void {
  driverSnapshot = null;
}
