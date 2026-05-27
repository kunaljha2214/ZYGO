import createError from 'http-errors';
import { Types } from 'mongoose';
import { FoodOrder, type FoodOrderStatus } from '../models/FoodOrder';
import { OwnerRestaurant } from '../models/OwnerRestaurant';
import { User } from '../models/User';
import { toDialNumber, maskPhone } from '../utils/phone';
import { requireApprovedRestaurantId } from '../utils/menuAccess';
import {
  getCustomerDisplayName,
  type RidePeerContact,
} from './ridePeerContact';

export type OrderPeerSummary = {
  id: string;
  name: string;
};

const RESTAURANT_CONTACT_STATUSES = new Set<FoodOrderStatus>([
  'confirmed',
  'preparing',
  'ready_for_pickup',
  'rider_assigned',
  'out_for_delivery',
  'delivered',
]);

const RIDER_CONTACT_STATUSES = new Set<FoodOrderStatus>([
  'rider_assigned',
  'out_for_delivery',
  'delivered',
]);

const DELIVERY_PARTNER_CONTACT_STATUSES = new Set([
  'accepted',
  'arriving_at_restaurant',
  'picked_up',
  'out_for_delivery',
  'arrived_at_customer',
  'delivered',
]);

async function peerContactFromUser(
  user: { name?: string; phone?: string } | null,
  fallbackName: string
): Promise<RidePeerContact> {
  if (!user?.phone?.trim()) {
    throw createError(404, 'Contact not available');
  }
  const dialNumber = toDialNumber(user.phone);
  if (!dialNumber) {
    throw createError(404, 'Contact not available');
  }
  return {
    displayName: (user.name || '').trim() || fallbackName,
    maskedPhone: maskPhone(user.phone),
    dialNumber,
  };
}

async function loadCustomerOrder(orderId: string, userId: string) {
  if (!Types.ObjectId.isValid(orderId)) {
    throw createError(400, 'Invalid order id');
  }
  const order = await FoodOrder.findOne({ _id: orderId, userId }).lean();
  if (!order) {
    throw createError(404, 'Order not found');
  }
  return order;
}

async function loadOwnerOrder(orderId: string, ownerUserId: string) {
  const restaurantListingId = await requireApprovedRestaurantId(ownerUserId);
  const order = await FoodOrder.findOne({ _id: orderId, restaurantId: restaurantListingId }).lean();
  if (!order) {
    throw createError(404, 'Order not found');
  }
  return order;
}

async function loadPartnerOrder(orderId: string, partnerId: string) {
  const order = await FoodOrder.findOne({
    _id: orderId,
    deliveryPartnerId: partnerId,
  }).lean();
  if (!order) {
    throw createError(404, 'Order not found');
  }
  return order;
}

export async function getRestaurantSummaryForListing(
  restaurantListingId: Types.ObjectId | string | null | undefined
): Promise<OrderPeerSummary | null> {
  if (!restaurantListingId) return null;
  const reg = await OwnerRestaurant.findOne({
    restaurantListingId,
    approvalStatus: 'approved',
  })
    .select('name ownerId')
    .lean();
  if (!reg) return null;
  const owner = await User.findById(reg.ownerId).select('name').lean();
  const name =
    (reg.name || '').trim() ||
    (owner?.name || '').trim() ||
    'Restaurant';
  return {
    id: reg.ownerId.toString(),
    name,
  };
}

export async function getRiderDisplayName(
  partnerId: Types.ObjectId | string | null | undefined
): Promise<OrderPeerSummary | null> {
  if (!partnerId) return null;
  const rider = await User.findById(partnerId).select('name').lean();
  if (!rider) return null;
  return {
    id: partnerId.toString(),
    name: (rider.name || '').trim() || 'Delivery partner',
  };
}

export async function getRestaurantContactForCustomer(
  orderId: string,
  userId: string
): Promise<RidePeerContact> {
  const order = await loadCustomerOrder(orderId, userId);
  if (!RESTAURANT_CONTACT_STATUSES.has(order.status)) {
    throw createError(404, 'Restaurant contact not available yet');
  }
  const reg = await OwnerRestaurant.findOne({
    restaurantListingId: order.restaurantId,
    approvalStatus: 'approved',
  })
    .select('name ownerId')
    .lean();
  if (!reg) {
    throw createError(404, 'Restaurant contact not available');
  }
  const owner = await User.findById(reg.ownerId).select('name phone').lean();
  const contact = await peerContactFromUser(owner, 'Restaurant');
  const shopName = (reg.name || '').trim();
  if (shopName) {
    contact.displayName = shopName;
  }
  return contact;
}

export async function getRiderContactForCustomer(
  orderId: string,
  userId: string
): Promise<RidePeerContact> {
  const order = await loadCustomerOrder(orderId, userId);
  if (!order.deliveryPartnerId || !RIDER_CONTACT_STATUSES.has(order.status)) {
    throw createError(404, 'Rider not assigned yet');
  }
  const rider = await User.findById(order.deliveryPartnerId).select('name phone').lean();
  return peerContactFromUser(rider, 'Delivery partner');
}

export async function getCustomerContactForShopOwner(
  orderId: string,
  ownerUserId: string
): Promise<RidePeerContact> {
  const order = await loadOwnerOrder(orderId, ownerUserId);
  if (!RESTAURANT_CONTACT_STATUSES.has(order.status)) {
    throw createError(404, 'Customer contact not available yet');
  }
  const customer = await User.findById(order.userId).select('name phone').lean();
  return peerContactFromUser(customer, 'Customer');
}

export async function getCustomerContactForDeliveryPartner(
  orderId: string,
  partnerId: string
): Promise<RidePeerContact> {
  const order = await loadPartnerOrder(orderId, partnerId);
  if (!DELIVERY_PARTNER_CONTACT_STATUSES.has(order.deliveryStatus)) {
    throw createError(404, 'Customer contact not available yet');
  }
  const customer = await User.findById(order.userId).select('name phone').lean();
  return peerContactFromUser(customer, 'Customer');
}

export { getCustomerDisplayName };
