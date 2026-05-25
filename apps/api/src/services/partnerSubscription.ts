import createError from 'http-errors';
import { Types } from 'mongoose';
import { User, type IUser, type UserRole } from '../models/User';
import { OwnerRestaurant } from '../models/OwnerRestaurant';
import { DeliveryPartnerProfile } from '../models/DeliveryPartnerProfile';
import { DriverProfile } from '../models/DriverProfile';
import { FoodOrder } from '../models/FoodOrder';
import {
  PartnerSubscriptionPayment,
  type IPartnerSubscriptionPayment,
} from '../models/PartnerSubscriptionPayment';
import { getPartnerPlan, type PartnerPlanKey } from '../config/partnerSubscriptionPlans';
import {
  createRazorpayOrder,
  getRazorpayKeyId,
  toPaise,
  verifyPaymentSignature,
} from './razorpayService';

const SUBSCRIPTION_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;
/** One free day after the partner completes their first order. */
export const SUBSCRIPTION_GRACE_MS = 24 * 60 * 60 * 1000;

function addPeriod(from: Date): Date {
  return new Date(from.getTime() + SUBSCRIPTION_PERIOD_MS);
}

export type PartnerAccessReason =
  | 'first_order_free'
  | 'grace_waiver'
  | 'paid_subscription'
  | 'inactive';

export type SubscriptionFields = {
  subscriptionExpiresAt?: Date | null;
  subscriptionPlanKey?: string | null;
  partnerFirstOrderCompletedAt?: Date | null;
  subscriptionGraceExpiresAt?: Date | null;
};

const SUBSCRIPTION_FIELD_SELECT =
  'subscriptionExpiresAt subscriptionPlanKey partnerFirstOrderCompletedAt subscriptionGraceExpiresAt';

async function loadSubscriptionFields(
  userId: string,
  role: UserRole
): Promise<SubscriptionFields | null> {
  if (role === 'shop_owner') {
    return OwnerRestaurant.findOne({ ownerId: userId }).select(SUBSCRIPTION_FIELD_SELECT).lean();
  }
  if (role === 'delivery_partner') {
    return DeliveryPartnerProfile.findOne({ partnerId: userId })
      .select(SUBSCRIPTION_FIELD_SELECT)
      .lean();
  }
  if (role === 'driver') {
    return DriverProfile.findOne({ driverId: userId }).select(SUBSCRIPTION_FIELD_SELECT).lean();
  }
  return null;
}

async function saveSubscriptionFields(
  userId: string,
  role: UserRole,
  expiresAt: Date,
  planKey: PartnerPlanKey
): Promise<void> {
  const update = { subscriptionExpiresAt: expiresAt, subscriptionPlanKey: planKey };
  if (role === 'shop_owner') {
    await OwnerRestaurant.findOneAndUpdate({ ownerId: userId }, update);
    return;
  }
  if (role === 'delivery_partner') {
    await DeliveryPartnerProfile.findOneAndUpdate({ partnerId: userId }, update);
    return;
  }
  if (role === 'driver') {
    await DriverProfile.findOneAndUpdate({ driverId: userId }, update);
  }
}

async function legacyHasCompletedFirstOrder(userId: string, role: UserRole): Promise<boolean> {
  if (role === 'delivery_partner') {
    const p = await DeliveryPartnerProfile.findOne({ partnerId: userId })
      .select('partnerFirstOrderCompletedAt totalDeliveries')
      .lean();
    if (p?.partnerFirstOrderCompletedAt) return true;
    return (p?.totalDeliveries ?? 0) > 0;
  }
  if (role === 'driver') {
    const p = await DriverProfile.findOne({ driverId: userId })
      .select('partnerFirstOrderCompletedAt totalRides')
      .lean();
    if (p?.partnerFirstOrderCompletedAt) return true;
    return (p?.totalRides ?? 0) > 0;
  }
  if (role === 'shop_owner') {
    const reg = await OwnerRestaurant.findOne({ ownerId: userId })
      .select('partnerFirstOrderCompletedAt restaurantListingId')
      .lean();
    if (reg?.partnerFirstOrderCompletedAt) return true;
    if (!reg?.restaurantListingId) return false;
    const n = await FoodOrder.countDocuments({
      restaurantId: reg.restaurantListingId,
      status: {
        $in: [
          'confirmed',
          'preparing',
          'ready_for_pickup',
          'rider_assigned',
          'out_for_delivery',
          'delivered',
        ],
      },
    });
    return n > 0;
  }
  return false;
}

export function resolvePartnerAccess(
  fields: SubscriptionFields | null,
  firstOrderCompleted: boolean
): {
  active: boolean;
  reason: PartnerAccessReason;
  renewalDate: Date | null;
  graceExpiresAt: Date | null;
  firstOrderCompleted: boolean;
} {
  const renewalDate = fields?.subscriptionExpiresAt ?? null;
  const graceExpiresAt = fields?.subscriptionGraceExpiresAt ?? null;
  const now = Date.now();

  if (renewalDate && new Date(renewalDate).getTime() > now) {
    return {
      active: true,
      reason: 'paid_subscription',
      renewalDate,
      graceExpiresAt,
      firstOrderCompleted,
    };
  }

  if (graceExpiresAt && new Date(graceExpiresAt).getTime() > now) {
    return {
      active: true,
      reason: 'grace_waiver',
      renewalDate,
      graceExpiresAt,
      firstOrderCompleted,
    };
  }

  if (!firstOrderCompleted) {
    return {
      active: true,
      reason: 'first_order_free',
      renewalDate,
      graceExpiresAt,
      firstOrderCompleted: false,
    };
  }

  return {
    active: false,
    reason: 'inactive',
    renewalDate,
    graceExpiresAt,
    firstOrderCompleted: true,
  };
}

export async function getPartnerAccess(userId: string, role: UserRole) {
  const fields = await loadSubscriptionFields(userId, role);
  const legacyDone = await legacyHasCompletedFirstOrder(userId, role);
  const firstOrderCompleted =
    Boolean(fields?.partnerFirstOrderCompletedAt) || legacyDone;
  return resolvePartnerAccess(fields, firstOrderCompleted);
}

/** After first accepted order / request, grant exactly one grace day. */
export async function markPartnerFirstOrderCompleted(
  userId: string,
  role: UserRole
): Promise<void> {
  const now = new Date();
  const graceEnd = new Date(now.getTime() + SUBSCRIPTION_GRACE_MS);

  if (role === 'shop_owner') {
    const reg = await OwnerRestaurant.findOne({ ownerId: userId });
    if (!reg || reg.partnerFirstOrderCompletedAt) return;
    reg.partnerFirstOrderCompletedAt = now;
    reg.subscriptionGraceExpiresAt = graceEnd;
    await reg.save();
    return;
  }
  if (role === 'delivery_partner') {
    const profile = await DeliveryPartnerProfile.findOne({ partnerId: userId });
    if (!profile || profile.partnerFirstOrderCompletedAt) return;
    profile.partnerFirstOrderCompletedAt = now;
    profile.subscriptionGraceExpiresAt = graceEnd;
    await profile.save();
    return;
  }
  if (role === 'driver') {
    const profile = await DriverProfile.findOne({ driverId: userId });
    if (!profile || profile.partnerFirstOrderCompletedAt) return;
    profile.partnerFirstOrderCompletedAt = now;
    profile.subscriptionGraceExpiresAt = graceEnd;
    await profile.save();
  }
}

export async function getPartnerSubscriptionStatus(user: IUser) {
  const plan = getPartnerPlan(user.role, user.driverVehicleType);
  if (!plan) {
    throw createError(400, 'Subscriptions are not available for your account type');
  }

  const access = await getPartnerAccess(user._id.toString(), user.role);
  const fields = await loadSubscriptionFields(user._id.toString(), user.role);

  const history = await PartnerSubscriptionPayment.find({
    userId: user._id,
    status: 'paid',
  })
    .sort({ paidAt: -1 })
    .limit(24)
    .lean();

  return {
    plan: {
      key: plan.key,
      amountInr: plan.amountInr,
      label: plan.label,
      description: plan.description,
    },
    active: access.active,
    accessReason: access.reason,
    renewalDate: access.renewalDate,
    graceExpiresAt: access.graceExpiresAt,
    firstOrderCompleted: access.firstOrderCompleted,
    currentPlanKey: fields?.subscriptionPlanKey ?? null,
    history: history.map((h) => ({
      id: h._id.toString(),
      amountInr: h.amountInr,
      planKey: h.planKey,
      periodStart: h.periodStart,
      periodEnd: h.periodEnd,
      paidAt: h.paidAt,
    })),
  };
}

export async function assertPartnerSubscriptionActive(
  userId: string,
  role: UserRole
): Promise<void> {
  const access = await getPartnerAccess(userId, role);
  if (access.active) return;

  throw createError(
    402,
    'Your 1-day trial after the first order has ended. Open Profile → Subscription to pay and continue accepting orders.'
  );
}

export async function createPartnerSubscriptionCheckout(user: IUser) {
  const plan = getPartnerPlan(user.role, user.driverVehicleType);
  if (!plan) {
    throw createError(400, 'Subscriptions are not available for your account type');
  }

  const fields = await loadSubscriptionFields(user._id.toString(), user.role);
  const now = new Date();
  const currentEnd = fields?.subscriptionExpiresAt
    ? new Date(fields.subscriptionExpiresAt)
    : null;
  const periodStart =
    currentEnd && currentEnd.getTime() > now.getTime() ? currentEnd : now;
  const periodEnd = addPeriod(periodStart);

  const pending = await PartnerSubscriptionPayment.create({
    userId: user._id,
    role: user.role,
    planKey: plan.key,
    amountInr: plan.amountInr,
    periodStart,
    periodEnd,
    status: 'pending',
    razorpayOrderId: 'pending',
  });

  const rzOrder = await createRazorpayOrder({
    amountInr: plan.amountInr,
    receipt: `sub_${pending._id.toString().slice(-12)}`,
    notes: {
      type: 'partner_subscription',
      paymentId: pending._id.toString(),
      userId: user._id.toString(),
      planKey: plan.key,
    },
  });

  pending.razorpayOrderId = rzOrder.id;
  await pending.save();

  return {
    paymentId: pending._id.toString(),
    payment: {
      keyId: getRazorpayKeyId(),
      razorpayOrderId: rzOrder.id,
      amount: toPaise(plan.amountInr),
      currency: 'INR',
      name: 'Zygo Partner',
      description: `${plan.label} — 1 month`,
      prefill: {
        name: user.name,
        email: user.email ?? '',
        contact: user.phone,
      },
    },
  };
}

export async function completePartnerSubscriptionPayment(
  paymentRecord: IPartnerSubscriptionPayment,
  razorpayPaymentId: string
): Promise<IPartnerSubscriptionPayment> {
  if (paymentRecord.status === 'paid') return paymentRecord;

  paymentRecord.status = 'paid';
  paymentRecord.razorpayPaymentId = razorpayPaymentId;
  paymentRecord.paidAt = new Date();
  await paymentRecord.save();

  await saveSubscriptionFields(
    paymentRecord.userId.toString(),
    paymentRecord.role,
    paymentRecord.periodEnd,
    paymentRecord.planKey
  );

  return paymentRecord;
}

export async function verifyPartnerSubscriptionPayment(
  userId: string,
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
) {
  const record = await PartnerSubscriptionPayment.findOne({
    razorpayOrderId,
    userId: new Types.ObjectId(userId),
  });
  if (!record) {
    throw createError(404, 'Subscription payment not found');
  }
  if (record.status === 'paid') {
    return getPartnerSubscriptionStatus((await User.findById(userId)) as IUser);
  }

  if (!verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)) {
    record.status = 'failed';
    await record.save();
    throw createError(400, 'Payment verification failed');
  }

  await completePartnerSubscriptionPayment(record, razorpayPaymentId);
  const user = await User.findById(userId);
  if (!user) throw createError(404);
  return getPartnerSubscriptionStatus(user);
}

export async function tryCompleteSubscriptionFromWebhook(
  razorpayOrderId: string,
  razorpayPaymentId: string
): Promise<boolean> {
  const record = await PartnerSubscriptionPayment.findOne({ razorpayOrderId });
  if (!record) return false;
  if (record.status === 'paid') return true;
  await completePartnerSubscriptionPayment(record, razorpayPaymentId);
  return true;
}

/** Partners eligible for dispatch (first order free, grace, or paid). */
export async function filterSubscribedPartnerIds(
  partnerIds: string[],
  role: 'delivery_partner' | 'driver'
): Promise<Set<string>> {
  if (partnerIds.length === 0) return new Set();

  if (role === 'delivery_partner') {
    const rows = await DeliveryPartnerProfile.find({
      partnerId: { $in: partnerIds.map((id) => new Types.ObjectId(id)) },
    })
      .select(`${SUBSCRIPTION_FIELD_SELECT} partnerId totalDeliveries`)
      .lean();
    const activeIds: string[] = [];
    for (const r of rows) {
      const firstDone =
        Boolean(r.partnerFirstOrderCompletedAt) || (r.totalDeliveries ?? 0) > 0;
      if (resolvePartnerAccess(r, firstDone).active) {
        activeIds.push((r.partnerId as Types.ObjectId).toString());
      }
    }
    return new Set(activeIds);
  }

  const rows = await DriverProfile.find({
    driverId: { $in: partnerIds.map((id) => new Types.ObjectId(id)) },
  })
    .select(`${SUBSCRIPTION_FIELD_SELECT} driverId totalRides`)
    .lean();
  const activeIds: string[] = [];
  for (const r of rows) {
    const firstDone =
      Boolean(r.partnerFirstOrderCompletedAt) || (r.totalRides ?? 0) > 0;
    if (resolvePartnerAccess(r, firstDone).active) {
      activeIds.push((r.driverId as Types.ObjectId).toString());
    }
  }
  return new Set(activeIds);
}

export async function isShopOwnerSubscribed(ownerId: string): Promise<boolean> {
  return (await getPartnerAccess(ownerId, 'shop_owner')).active;
}
