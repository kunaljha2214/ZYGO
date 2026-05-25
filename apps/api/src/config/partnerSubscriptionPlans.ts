import type { UserRole } from '../models/User';

export type PartnerPlanKey =
  | 'shop_owner'
  | 'delivery_partner'
  | 'driver_bike'
  | 'driver_auto'
  | 'driver_car';

export type PartnerPlan = {
  key: PartnerPlanKey;
  amountInr: number;
  label: string;
  description: string;
};

export const PARTNER_SUBSCRIPTION_PLANS: Record<PartnerPlanKey, PartnerPlan> = {
  shop_owner: {
    key: 'shop_owner',
    amountInr: 499,
    label: 'Restaurant partner',
    description: 'Accept food orders on Zygo',
  },
  delivery_partner: {
    key: 'delivery_partner',
    amountInr: 299,
    label: 'Food delivery rider',
    description: 'Accept delivery requests',
  },
  driver_bike: {
    key: 'driver_bike',
    amountInr: 299,
    label: 'Bike captain',
    description: 'Accept bike ride requests',
  },
  driver_auto: {
    key: 'driver_auto',
    amountInr: 349,
    label: 'Auto captain',
    description: 'Accept auto ride requests',
  },
  driver_car: {
    key: 'driver_car',
    amountInr: 399,
    label: 'Car captain',
    description: 'Accept car ride requests',
  },
};

const DRIVER_VEHICLE_PLAN: Record<string, PartnerPlanKey> = {
  bike: 'driver_bike',
  auto: 'driver_auto',
  car: 'driver_car',
};

export function resolvePartnerPlanKey(
  role: UserRole,
  driverVehicleType?: string | null
): PartnerPlanKey | null {
  if (role === 'shop_owner') return 'shop_owner';
  if (role === 'delivery_partner') return 'delivery_partner';
  if (role === 'driver') {
    const vt = driverVehicleType?.trim().toLowerCase();
    if (vt && DRIVER_VEHICLE_PLAN[vt]) return DRIVER_VEHICLE_PLAN[vt];
    return 'driver_bike';
  }
  return null;
}

export function getPartnerPlan(
  role: UserRole,
  driverVehicleType?: string | null
): PartnerPlan | null {
  const key = resolvePartnerPlanKey(role, driverVehicleType);
  return key ? PARTNER_SUBSCRIPTION_PLANS[key] : null;
}
