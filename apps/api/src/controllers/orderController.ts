import createError from 'http-errors';
import { validationResult } from 'express-validator';
import type { Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import type { AuthedRequest } from '../middleware/auth';
import { FoodOrder } from '../models/FoodOrder';
import { MenuItem } from '../models/MenuItem';
import { Restaurant } from '../models/Restaurant';
import { generateOrderNumber } from '../utils/geo';
import type { IMenuItem } from '../models/MenuItem';
import { ShopOffer } from '../models/ShopOffer';
import { validateShopOffer } from '../services/offerValidation';
import {
  getRestaurantContactForCustomer,
  getRiderContactForCustomer,
  getRestaurantSummaryForListing,
  getRiderDisplayName,
} from '../services/orderPeerContact';

type OrderLineInput = {
  menuItemId: string;
  quantity: number;
  variantName?: string;
  addOnNames?: string[];
};

function resolveOrderLine(
  mi: IMenuItem,
  line: OrderLineInput
): { name: string; price: number } {
  let price = mi.price;
  let name = mi.name;

  if (line.variantName?.trim()) {
    const key = line.variantName.trim().toLowerCase();
    const variant = mi.variants.find((v) => v.name.trim().toLowerCase() === key);
    if (!variant) {
      throw createError(400, `Invalid variant "${line.variantName}" for ${mi.name}`);
    }
    price = variant.price;
    name = `${mi.name} (${variant.name})`;
  }

  const addOnNames = line.addOnNames?.filter((n) => n.trim()) ?? [];
  for (const addOnName of addOnNames) {
    const key = addOnName.trim().toLowerCase();
    const addOn = mi.addOns.find((a) => a.name.trim().toLowerCase() === key);
    if (!addOn) {
      throw createError(400, `Invalid add-on "${addOnName}" for ${mi.name}`);
    }
    price += addOn.price;
    name += ` + ${addOn.name}`;
  }

  return { name, price };
}

export async function createOrder(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      next(createError(401));
      return;
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      next(createError(400, errors.array()[0].msg));
      return;
    }
    const { restaurantId, items, deliveryAddress, customerNotes, couponCode } = req.body as {
      restaurantId: string;
      items: OrderLineInput[];
      deliveryAddress: {
        label: string;
        line1: string;
        coordinates: { lat: number; lng: number };
      };
      customerNotes?: string;
      couponCode?: string;
    };

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant || !restaurant.isActive) {
      next(createError(404, 'Restaurant not found'));
      return;
    }
    if (restaurant.isAcceptingOrders === false) {
      next(createError(403, 'Restaurant is closed and not accepting orders right now'));
      return;
    }

    const lineItems: {
      menuItemId: Types.ObjectId;
      name: string;
      price: number;
      quantity: number;
    }[] = [];
    let total = 0;

    for (const line of items) {
      const mi = await MenuItem.findOne({
        _id: line.menuItemId,
        restaurantId: restaurant._id,
        isAvailable: true,
      });
      if (!mi) {
        next(createError(400, `Invalid menu item: ${line.menuItemId}`));
        return;
      }
      let resolved: { name: string; price: number };
      try {
        resolved = resolveOrderLine(mi, line);
      } catch (e) {
        next(e);
        return;
      }
      const qty = line.quantity;
      lineItems.push({
        menuItemId: mi._id,
        name: resolved.name,
        price: resolved.price,
        quantity: qty,
      });
      total += resolved.price * qty;
    }

    const subtotal = Math.round(total * 100) / 100;
    let discountAmount = 0;
    let appliedCode: string | undefined;
    let offerId: Types.ObjectId | undefined;

    if (couponCode?.trim()) {
      const cartItemNames = lineItems.map((li) => li.name);
      const validated = await validateShopOffer({
        restaurantId: restaurant._id,
        userId: req.user.sub,
        subtotal,
        couponCode,
        cartItemNames,
      });
      discountAmount = validated.discountAmount;
      appliedCode = validated.code;
      offerId = new Types.ObjectId(validated.offerId);
    }

    const orderTotal = Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100);

    const [lng, lat] = restaurant.location.coordinates;
    const order = await FoodOrder.create({
      userId: req.user.sub,
      restaurantId: restaurant._id,
      orderNumber: generateOrderNumber(),
      restaurantName: restaurant.name,
      restaurantCoords: { lat, lng },
      items: lineItems,
      subtotal,
      discountAmount,
      couponCode: appliedCode,
      offerId,
      total: orderTotal,
      status: 'placed',
      deliveryAddress,
      customerNotes: customerNotes?.trim().slice(0, 500) || undefined,
    });

    if (offerId) {
      await ShopOffer.updateOne({ _id: offerId }, { $inc: { usageCount: 1 } });
    }

    res.status(201).json(formatOrder(order));
  } catch (e) {
    next(e);
  }
}

export async function listOrders(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      next(createError(401));
      return;
    }
    const orders = await FoodOrder.find({ userId: req.user.sub })
      .sort({ createdAt: -1 })
      .populate('restaurantId', 'name location')
      .lean();
    res.json(orders.map((o) => formatOrderLean(o as Record<string, unknown>)));
  } catch (e) {
    next(e);
  }
}

export async function getOrder(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      next(createError(401));
      return;
    }
    const order = await FoodOrder.findOne({
      _id: req.params.id,
      userId: req.user.sub,
    })
      .populate('restaurantId', 'name location')
      .lean();
    if (!order) {
      next(createError(404));
      return;
    }
    const formatted = formatOrderLean(order as Record<string, unknown>);
    const [restaurant, rider] = await Promise.all([
      getRestaurantSummaryForListing(order.restaurantId),
      order.deliveryPartnerId ? getRiderDisplayName(order.deliveryPartnerId) : Promise.resolve(null),
    ]);
    const storedCoords = (order as { restaurantCoords?: { lat?: number } }).restaurantCoords;
    if (formatted.restaurantCoords && !storedCoords?.lat) {
      void FoodOrder.updateOne(
        { _id: formatted.id },
        {
          restaurantCoords: formatted.restaurantCoords,
          ...(formatted.restaurantName ? { restaurantName: formatted.restaurantName } : {}),
        }
      );
    }
    res.json({ ...formatted, restaurant, rider });
  } catch (e) {
    next(e);
  }
}

export async function getOrderRestaurantContact(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      next(createError(401));
      return;
    }
    const contact = await getRestaurantContactForCustomer(req.params.id, req.user.sub);
    res.json(contact);
  } catch (e) {
    next(e);
  }
}

export async function getOrderRiderContact(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      next(createError(401));
      return;
    }
    const contact = await getRiderContactForCustomer(req.params.id, req.user.sub);
    res.json(contact);
  } catch (e) {
    next(e);
  }
}

export async function cancelOrder(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      next(createError(401));
      return;
    }
    const order = await FoodOrder.findOne({
      _id: req.params.id,
      userId: req.user.sub,
    });
    if (!order) {
      next(createError(404));
      return;
    }
    if (order.status !== 'placed') {
      next(createError(400, 'Only placed orders can be cancelled'));
      return;
    }
    order.status = 'cancelled';
    await order.save();
    res.json(formatOrder(order));
  } catch (e) {
    next(e);
  }
}

type PopulatedRestaurant = {
  name?: string;
  location?: { coordinates?: number[] };
};

function coordsFromRestaurantLocation(
  rest: PopulatedRestaurant | null | undefined
): { lat: number; lng: number } | null {
  const c = rest?.location?.coordinates;
  if (!c || c.length < 2 || !Number.isFinite(c[0]) || !Number.isFinite(c[1])) {
    return null;
  }
  return { lat: c[1], lng: c[0] };
}

function resolveRestaurantCoords(
  stored: { lat?: number; lng?: number } | null | undefined,
  rest: PopulatedRestaurant | null | undefined
): { lat: number; lng: number } | null {
  if (
    stored?.lat != null &&
    stored?.lng != null &&
    Number.isFinite(stored.lat) &&
    Number.isFinite(stored.lng)
  ) {
    return { lat: stored.lat, lng: stored.lng };
  }
  return coordsFromRestaurantLocation(rest);
}

function formatOrder(doc: InstanceType<typeof FoodOrder>) {
  const o = doc.toObject();
  const rest = o.restaurantId as unknown as PopulatedRestaurant | undefined;
  const restaurantCoords = resolveRestaurantCoords(o.restaurantCoords, rest);
  return {
    id: o._id,
    type: 'food' as const,
    orderNumber: o.orderNumber,
    restaurantId: o.restaurantId,
    restaurantName: o.restaurantName ?? rest?.name,
    items: o.items,
    subtotal: o.subtotal ?? o.total,
    discountAmount: o.discountAmount ?? 0,
    couponCode: o.couponCode,
    total: o.total,
    status: o.status,
    deliveryAddress: o.deliveryAddress,
    customerNotes: o.customerNotes,
    estimatedPrepMinutes: o.estimatedPrepMinutes,
    deliveryStatus: o.deliveryStatus,
    deliveryEtaMinutes: o.deliveryEtaMinutes,
    restaurantCoords,
    riderLocation: o.riderLastLocation,
    createdAt: o.createdAt,
  };
}

function formatOrderLean(o: Record<string, unknown>) {
  const rest = o.restaurantId as PopulatedRestaurant | undefined;
  const total = o.total as number;
  const restaurantCoords = resolveRestaurantCoords(
    o.restaurantCoords as { lat?: number; lng?: number } | null | undefined,
    rest
  );
  return {
    id: o._id,
    type: 'food' as const,
    orderNumber: o.orderNumber,
    restaurantId: o.restaurantId,
    restaurantName: (o.restaurantName as string | undefined) ?? rest?.name,
    items: o.items,
    subtotal: (o.subtotal as number | undefined) ?? total,
    discountAmount: (o.discountAmount as number | undefined) ?? 0,
    couponCode: o.couponCode as string | undefined,
    total,
    status: o.status,
    deliveryAddress: o.deliveryAddress,
    customerNotes: o.customerNotes,
    estimatedPrepMinutes: o.estimatedPrepMinutes,
    deliveryStatus: o.deliveryStatus,
    deliveryEtaMinutes: o.deliveryEtaMinutes,
    restaurantCoords,
    riderLocation: o.riderLastLocation,
    createdAt: o.createdAt,
  };
}
