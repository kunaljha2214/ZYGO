import createError from 'http-errors';
import { Types } from 'mongoose';
import type { IOpeningHour } from '../models/OwnerRestaurant';
import { OwnerRestaurant } from '../models/OwnerRestaurant';
import { Restaurant } from '../models/Restaurant';
import { FoodOrder } from '../models/FoodOrder';
import {
  resolvePartnerAccess,
  type PartnerAccessReason,
  type SubscriptionFields,
} from './partnerSubscription';
import { getScheduleStatus } from './restaurantOpeningHours';

type RestaurantRow = {
  _id: Types.ObjectId;
  ownerId?: Types.ObjectId | null;
  isAcceptingOrders?: boolean;
};

export type CustomerRestaurantVisibility = {
  listVisible: boolean;
  isOpenNow: boolean;
  canOrder: boolean;
  subscriptionActive: boolean;
  acceptingOrders: boolean;
  availabilityLabel: string | null;
};

async function legacyShopFirstOrderCompleted(
  ownerId: Types.ObjectId,
  restaurantListingId: Types.ObjectId
): Promise<boolean> {
  const reg = await OwnerRestaurant.findOne({ ownerId })
    .select('partnerFirstOrderCompletedAt restaurantListingId')
    .lean();
  if (reg?.partnerFirstOrderCompletedAt) return true;
  if (!reg?.restaurantListingId) return false;
  const n = await FoodOrder.countDocuments({
    restaurantId: restaurantListingId,
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

function subscriptionFieldsFromOwner(
  owner: {
    subscriptionExpiresAt?: Date | null;
    subscriptionPlanKey?: string | null;
    partnerFirstOrderCompletedAt?: Date | null;
    subscriptionGraceExpiresAt?: Date | null;
    openingHours?: IOpeningHour[];
  } | null
): SubscriptionFields | null {
  if (!owner) return null;
  return {
    subscriptionExpiresAt: owner.subscriptionExpiresAt,
    subscriptionPlanKey: owner.subscriptionPlanKey,
    partnerFirstOrderCompletedAt: owner.partnerFirstOrderCompletedAt,
    subscriptionGraceExpiresAt: owner.subscriptionGraceExpiresAt,
  };
}

export async function resolveCustomerRestaurantVisibility(
  restaurant: RestaurantRow,
  ownerReg: {
    subscriptionExpiresAt?: Date | null;
    subscriptionPlanKey?: string | null;
    partnerFirstOrderCompletedAt?: Date | null;
    subscriptionGraceExpiresAt?: Date | null;
    openingHours?: IOpeningHour[];
  } | null,
  firstOrderCompleted: boolean
): Promise<CustomerRestaurantVisibility> {
  const acceptingOrders = restaurant.isAcceptingOrders !== false;

  if (!ownerReg) {
    const schedule = getScheduleStatus([]);
    const isOpenNow = acceptingOrders && schedule.isWithinHours;
    return {
      listVisible: acceptingOrders,
      isOpenNow,
      canOrder: isOpenNow,
      subscriptionActive: true,
      acceptingOrders,
      availabilityLabel: schedule.availabilityLabel,
    };
  }

  const access = resolvePartnerAccess(subscriptionFieldsFromOwner(ownerReg), firstOrderCompleted);
  const subscriptionActive = access.active;

  if (!subscriptionActive) {
    return {
      listVisible: false,
      isOpenNow: false,
      canOrder: false,
      subscriptionActive: false,
      acceptingOrders,
      availabilityLabel: null,
    };
  }

  if (!acceptingOrders) {
    return {
      listVisible: false,
      isOpenNow: false,
      canOrder: false,
      subscriptionActive: true,
      acceptingOrders: false,
      availabilityLabel: null,
    };
  }

  const schedule = getScheduleStatus(ownerReg.openingHours ?? []);
  const isOpenNow = schedule.isWithinHours;

  return {
    listVisible: true,
    isOpenNow,
    canOrder: isOpenNow,
    subscriptionActive: true,
    acceptingOrders: true,
    availabilityLabel: schedule.availabilityLabel,
  };
}

type OwnerRegLean = {
  ownerId: Types.ObjectId;
  restaurantListingId?: Types.ObjectId | null;
  openingHours?: IOpeningHour[];
  subscriptionExpiresAt?: Date | null;
  subscriptionPlanKey?: string | null;
  partnerFirstOrderCompletedAt?: Date | null;
  subscriptionGraceExpiresAt?: Date | null;
};

export async function loadOwnerRegsForRestaurants(
  restaurants: RestaurantRow[]
): Promise<Map<string, OwnerRegLean>> {
  const listingIds = restaurants.map((r) => r._id);
  const ownerIds = restaurants
    .map((r) => r.ownerId)
    .filter((id): id is Types.ObjectId => Boolean(id));

  const regs = await OwnerRestaurant.find({
    $or: [
      { restaurantListingId: { $in: listingIds } },
      ...(ownerIds.length ? [{ ownerId: { $in: ownerIds } }] : []),
    ],
  })
    .select(
      'ownerId restaurantListingId openingHours subscriptionExpiresAt subscriptionPlanKey partnerFirstOrderCompletedAt subscriptionGraceExpiresAt'
    )
    .lean();

  const byListing = new Map<string, OwnerRegLean>();
  for (const reg of regs) {
    if (reg.restaurantListingId) {
      byListing.set(reg.restaurantListingId.toString(), reg as OwnerRegLean);
    }
  }
  return byListing;
}

export async function loadFirstOrderCompletedFlags(
  restaurants: RestaurantRow[],
  ownerByListing: Map<string, OwnerRegLean>
): Promise<Map<string, boolean>> {
  const flags = new Map<string, boolean>();
  await Promise.all(
    restaurants.map(async (r) => {
      const reg = ownerByListing.get(r._id.toString());
      if (!reg) {
        flags.set(r._id.toString(), false);
        return;
      }
      const done =
        Boolean(reg.partnerFirstOrderCompletedAt) ||
        (await legacyShopFirstOrderCompleted(reg.ownerId, r._id));
      flags.set(r._id.toString(), done);
    })
  );
  return flags;
}

export type CustomerVisibilityPreview = CustomerRestaurantVisibility & {
  restaurantId: string;
  restaurantName: string;
  isListingActive: boolean;
  subscriptionReason: PartnerAccessReason;
  firstOrderCompleted: boolean;
  subscriptionExpiresAt: string | null;
  subscriptionGraceExpiresAt: string | null;
  isWithinScheduledHours: boolean;
  checkedAt: string;
  customerListSummary: string;
};

function buildCustomerListSummary(
  visibility: CustomerRestaurantVisibility,
  subscriptionReason: PartnerAccessReason
): string {
  if (!visibility.listVisible) {
    if (!visibility.subscriptionActive) {
      if (subscriptionReason === 'grace_waiver') {
        return 'Unexpected: grace waiver should keep subscription active.';
      }
      if (subscriptionReason === 'first_order_free') {
        return 'Unexpected: first-order free period should keep subscription active.';
      }
      return 'Hidden from customer list: monthly subscription is inactive (grace period ended).';
    }
    if (!visibility.acceptingOrders) {
      return 'Hidden from customer list: shop toggle is off (not accepting orders).';
    }
    return 'Hidden from customer list.';
  }
  if (!visibility.canOrder) {
    return visibility.availabilityLabel
      ? `Shown in customer list (closed). ${visibility.availabilityLabel}`
      : 'Shown in customer list but closed by schedule.';
  }
  return 'Shown in customer list and accepting orders now.';
}

export async function buildCustomerVisibilityPreview(
  restaurantId: string | Types.ObjectId
): Promise<CustomerVisibilityPreview> {
  const restaurant = await Restaurant.findById(restaurantId).lean();
  if (!restaurant) {
    throw createError(404, 'Restaurant not found');
  }

  const ownerReg = restaurant.ownerId
    ? await OwnerRestaurant.findOne({
        $or: [{ restaurantListingId: restaurant._id }, { ownerId: restaurant.ownerId }],
      }).lean()
    : await OwnerRestaurant.findOne({ restaurantListingId: restaurant._id }).lean();

  const firstOrderCompleted = ownerReg
    ? Boolean(ownerReg.partnerFirstOrderCompletedAt) ||
      (restaurant.ownerId
        ? await legacyShopFirstOrderCompleted(restaurant.ownerId, restaurant._id)
        : false)
    : false;

  const access = ownerReg
    ? resolvePartnerAccess(subscriptionFieldsFromOwner(ownerReg), firstOrderCompleted)
    : {
        active: true,
        reason: 'first_order_free' as PartnerAccessReason,
        renewalDate: null,
        graceExpiresAt: null,
        firstOrderCompleted: false,
      };

  const schedule = getScheduleStatus(ownerReg?.openingHours ?? []);
  const visibility = await resolveCustomerRestaurantVisibility(
    restaurant,
    ownerReg,
    firstOrderCompleted
  );

  return {
    ...visibility,
    restaurantId: restaurant._id.toString(),
    restaurantName: restaurant.name,
    isListingActive: Boolean(restaurant.isActive),
    subscriptionReason: access.reason,
    firstOrderCompleted,
    subscriptionExpiresAt: ownerReg?.subscriptionExpiresAt
      ? new Date(ownerReg.subscriptionExpiresAt).toISOString()
      : null,
    subscriptionGraceExpiresAt: ownerReg?.subscriptionGraceExpiresAt
      ? new Date(ownerReg.subscriptionGraceExpiresAt).toISOString()
      : null,
    isWithinScheduledHours: schedule.isWithinHours,
    checkedAt: new Date().toISOString(),
    customerListSummary: buildCustomerListSummary(visibility, access.reason),
  };
}

export async function getCustomerVisibilityForRestaurant(
  restaurant: RestaurantRow
): Promise<CustomerRestaurantVisibility> {
  const ownerReg = restaurant.ownerId
    ? await OwnerRestaurant.findOne({
        $or: [{ restaurantListingId: restaurant._id }, { ownerId: restaurant.ownerId }],
      }).lean()
    : await OwnerRestaurant.findOne({ restaurantListingId: restaurant._id }).lean();

  const firstDone = ownerReg
    ? Boolean(ownerReg.partnerFirstOrderCompletedAt) ||
      (restaurant.ownerId
        ? await legacyShopFirstOrderCompleted(restaurant.ownerId, restaurant._id)
        : false)
    : false;

  return resolveCustomerRestaurantVisibility(restaurant, ownerReg, firstDone);
}

export async function assertRestaurantAcceptingCustomerOrders(
  restaurantId: string | Types.ObjectId
): Promise<void> {
  const restaurant = await Restaurant.findById(restaurantId).lean();
  if (!restaurant || !restaurant.isActive) {
    throw createError(404, 'Restaurant not found');
  }

  const visibility = await getCustomerVisibilityForRestaurant(restaurant);

  if (!visibility.listVisible) {
    throw createError(403, 'This restaurant is not available right now');
  }
  if (!visibility.canOrder) {
    throw createError(
      403,
      visibility.availabilityLabel ?? 'Restaurant is closed and not accepting orders right now'
    );
  }
}
