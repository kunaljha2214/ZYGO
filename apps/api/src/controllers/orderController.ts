import createError from 'http-errors';
import { validationResult } from 'express-validator';
import type { Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import type { AuthedRequest } from '../middleware/auth';
import { FoodOrder, type OrderFulfillment } from '../models/FoodOrder';
import { Restaurant } from '../models/Restaurant';
import { User } from '../models/User';
import { ShopReview } from '../models/ShopReview';
import { generateOrderNumber } from '../utils/geo';
import { validateShopOffer } from '../services/offerValidation';
import { buildOrderLines, type OrderLineInput } from '../services/orderLineBuilder';
import {
  computeOrderPricing,
  deliveryDistanceKm,
  formatCustomerQuote,
  formatCustomerQuoteFromOrder,
} from '../services/orderPricing';
import { computeOrderPayouts } from '../services/orderPayouts';
import {
  createRazorpayOrder,
  getRazorpayKeyId,
  toPaise,
  verifyPaymentSignature,
} from '../services/razorpayService';
import { assertOrderPayableByUser, markFoodOrderPaid } from '../services/orderPayment';
import { clearRestaurantAcceptTimeout } from '../services/orderAcceptTimeout';
import { refundPaidFoodOrder } from '../services/orderRefund';
import { getRazorpayConfig } from '../config/razorpay';
import {
  getRestaurantContactForCustomer,
  getRiderContactForCustomer,
  getRestaurantSummaryForListing,
  getRiderDisplayName,
} from '../services/orderPeerContact';
import {
  dispatchRestaurantOrderEvent,
  notifyFoodStakeholdersOnCustomerCancel,
} from '../services/orderNotifications';
import { dispatchRestaurantNotification } from '../services/restaurantNotifications';
import { assertRestaurantAcceptingCustomerOrders } from '../services/restaurantCustomerVisibility';
import { riderDispatchUiMessage } from '../utils/riderDispatchUi';

type PrepareCheckoutInput = {
  restaurantId: string;
  items: OrderLineInput[];
  userId: string;
  couponCode?: string;
  deliveryCoordinates: { lat: number; lng: number };
  fulfillment?: OrderFulfillment;
};

async function prepareOrderCheckout(input: PrepareCheckoutInput) {
  const restaurant = await Restaurant.findById(input.restaurantId);
  if (!restaurant || !restaurant.isActive) {
    throw createError(404, 'Restaurant not found');
  }
  await assertRestaurantAcceptingCustomerOrders(restaurant._id);

  const { lineItems, subtotal, cartItemNames } = await buildOrderLines(restaurant, input.items);

  let couponDiscount = 0;
  let appliedCode: string | undefined;
  let offerId: Types.ObjectId | undefined;
  let offerType: string | undefined;

  if (input.couponCode?.trim()) {
    const validated = await validateShopOffer({
      restaurantId: restaurant._id,
      userId: input.userId,
      subtotal,
      couponCode: input.couponCode,
      cartItemNames,
    });
    couponDiscount = validated.discountAmount;
    appliedCode = validated.code;
    offerId = new Types.ObjectId(validated.offerId);
    offerType = validated.offerType;
  }

  const fulfillment: OrderFulfillment = input.fulfillment ?? 'delivery';
  const [lng, lat] = restaurant.location.coordinates;
  const restaurantCoords = { lat, lng };
  const distanceKm =
    fulfillment === 'delivery'
      ? deliveryDistanceKm(restaurantCoords, input.deliveryCoordinates)
      : 0;

  const pricing = computeOrderPricing({
    foodSubtotal: subtotal,
    discountAmount: couponDiscount,
    offerType,
    distanceKm,
    fulfillment,
  });

  const discountAmount = pricing.foodDiscountAmount + pricing.deliveryDiscount;

  return {
    foodDiscountAmount: pricing.foodDiscountAmount,
    deliveryDiscount: pricing.deliveryDiscount,
    restaurant,
    lineItems,
    subtotal,
    discountAmount,
    appliedCode,
    offerId,
    pricing,
    restaurantCoords,
    fulfillment,
  };
}

export async function quoteOrder(
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
    const { restaurantId, items, couponCode, deliveryAddress, fulfillment } = req.body as {
      restaurantId: string;
      items: OrderLineInput[];
      couponCode?: string;
      deliveryAddress: { coordinates: { lat: number; lng: number } };
      fulfillment?: OrderFulfillment;
    };

    const prepared = await prepareOrderCheckout({
      restaurantId,
      items,
      userId: req.user.sub,
      couponCode,
      deliveryCoordinates: deliveryAddress.coordinates,
      fulfillment,
    });

    res.json({
      customer: formatCustomerQuote(prepared.pricing),
      couponCode: prepared.appliedCode,
    });
  } catch (e) {
    next(e);
  }
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
    const { restaurantId, items, deliveryAddress, customerNotes, couponCode, fulfillment } =
      req.body as {
        restaurantId: string;
        items: OrderLineInput[];
        deliveryAddress: {
          label: string;
          line1: string;
          coordinates: { lat: number; lng: number };
        };
        customerNotes?: string;
        couponCode?: string;
        fulfillment?: OrderFulfillment;
      };

    const prepared = await prepareOrderCheckout({
      restaurantId,
      items,
      userId: req.user.sub,
      couponCode,
      deliveryCoordinates: deliveryAddress.coordinates,
      fulfillment,
    });

    const { pricing } = prepared;
    const payouts = computeOrderPayouts(pricing);
    const orderNumber = generateOrderNumber();

    const order = await FoodOrder.create({
      userId: req.user.sub,
      restaurantId: prepared.restaurant._id,
      orderNumber,
      restaurantName: prepared.restaurant.name,
      restaurantCoords: prepared.restaurantCoords,
      items: prepared.lineItems,
      subtotal: prepared.subtotal,
      discountAmount: prepared.discountAmount,
      foodDiscountAmount: prepared.foodDiscountAmount,
      deliveryDiscount: prepared.deliveryDiscount,
      couponCode: prepared.appliedCode,
      offerId: prepared.offerId,
      total: pricing.customerTotal,
      fulfillment: pricing.fulfillment,
      deliveryFee: pricing.deliveryFee,
      packageFee: pricing.packageFee,
      gstAmount: pricing.gstAmount,
      deliveryDistanceKm: pricing.distanceKm,
      paymentStatus: 'pending',
      restaurantEarnings: payouts.restaurantEarnings,
      riderEarnings: payouts.riderEarnings,
      zygoEarnings: payouts.zygoEarnings,
      estimatedRiderEarnings: payouts.riderEarnings,
      status: 'payment_pending',
      deliveryAddress,
      customerNotes: customerNotes?.trim().slice(0, 500) || undefined,
    });

    const { enabled: razorpayEnabled } = getRazorpayConfig();
    if (!razorpayEnabled) {
      next(createError(503, 'Online payment is not configured. Contact support.'));
      return;
    }

    const rzOrder = await createRazorpayOrder({
      amountInr: pricing.customerTotal,
      receipt: order._id.toString(),
      notes: {
        orderNumber,
        restaurantId: prepared.restaurant._id.toString(),
      },
    });

    order.razorpayOrderId = rzOrder.id;
    await order.save();

    const customer = await User.findById(req.user.sub).select('name email phone').lean();

    res.status(201).json({
      ...formatOrder(order),
      payment: {
        keyId: getRazorpayKeyId(),
        razorpayOrderId: rzOrder.id,
        amount: toPaise(pricing.customerTotal),
        currency: 'INR',
        name: 'Zygo',
        description: `Food order ${orderNumber}`,
        prefill: {
          name: customer?.name ?? '',
          email: customer?.email ?? '',
          contact: customer?.phone ?? '',
        },
      },
    });
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
      .select('+deliveryOtpCode deliveryOtpExpiresAt deliveryOtpVerifiedAt')
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
    const otpCode = (order as unknown as { deliveryOtpCode?: string | null }).deliveryOtpCode ?? null;
    const otpExpiresAt = (order as unknown as { deliveryOtpExpiresAt?: Date | null })
      .deliveryOtpExpiresAt;
    const otpVerifiedAt = (order as unknown as { deliveryOtpVerifiedAt?: Date | null })
      .deliveryOtpVerifiedAt;

    const otpActive =
      !otpVerifiedAt &&
      otpCode &&
      otpExpiresAt &&
      otpExpiresAt.getTime() > Date.now() &&
      (formatted.deliveryStatus === 'arrived_at_customer' ||
        formatted.deliveryStatus === 'out_for_delivery' ||
        formatted.status === 'out_for_delivery');

    res.json({
      ...formatted,
      restaurant,
      rider,
      ...(otpActive ? { deliveryOtp: otpCode, deliveryOtpExpiresAt: otpExpiresAt } : {}),
    });
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

export async function checkoutOrderPayment(
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
      next(createError(404, 'Order not found'));
      return;
    }
    await assertOrderPayableByUser(order._id.toString(), req.user.sub);

    const { enabled: razorpayEnabled } = getRazorpayConfig();
    if (!razorpayEnabled) {
      next(createError(503, 'Online payment is not configured. Contact support.'));
      return;
    }

    if (!order.razorpayOrderId) {
      const rzOrder = await createRazorpayOrder({
        amountInr: order.total,
        receipt: order._id.toString(),
        notes: {
          orderNumber: order.orderNumber,
          restaurantId: order.restaurantId.toString(),
        },
      });
      order.razorpayOrderId = rzOrder.id;
      await order.save();
    }

    const customer = await User.findById(req.user.sub).select('name email phone').lean();

    res.json({
      orderId: order._id.toString(),
      total: order.total,
      payment: {
        keyId: getRazorpayKeyId(),
        razorpayOrderId: order.razorpayOrderId!,
        amount: toPaise(order.total),
        currency: 'INR',
        name: 'Zygo',
        description: `Food order ${order.orderNumber}`,
        prefill: {
          name: customer?.name ?? '',
          email: customer?.email ?? '',
          contact: customer?.phone ?? '',
        },
      },
    });
  } catch (e) {
    next(e);
  }
}

export async function verifyOrderPayment(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      next(createError(401));
      return;
    }
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body as {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    };

    const order = await FoodOrder.findOne({
      razorpayOrderId: razorpay_order_id,
      userId: req.user.sub,
    });
    if (!order) {
      next(createError(404, 'Order not found for this payment'));
      return;
    }

    await assertOrderPayableByUser(order._id.toString(), req.user.sub);

    if (
      !verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)
    ) {
      order.paymentStatus = 'failed';
      await order.save();
      next(createError(400, 'Payment verification failed'));
      return;
    }

    const paid = await markFoodOrderPaid(order._id.toString(), razorpay_payment_id);
    res.json(formatOrder(paid!));
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
    if (order.status !== 'placed' && order.status !== 'payment_pending') {
      next(createError(400, 'This order can no longer be cancelled'));
      return;
    }
    order.status = 'cancelled';
    order.acceptExpiresAt = null;
    await order.save();
    clearRestaurantAcceptTimeout(order._id.toString());
    notifyFoodStakeholdersOnCustomerCancel(order);
    await refundPaidFoodOrder(order._id.toString());
    const fresh = await FoodOrder.findById(order._id);
    res.json(formatOrder(fresh ?? order));
  } catch (e) {
    next(e);
  }
}

export async function createOrderReview(
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

    const order = await FoodOrder.findOne({
      _id: req.params.id,
      userId: req.user.sub,
      status: 'delivered',
    });
    if (!order) {
      next(createError(404, 'Delivered order not found'));
      return;
    }

    const existing = await ShopReview.findOne({ orderId: order._id, userId: req.user.sub });
    if (existing) {
      next(createError(409, 'Review already submitted for this order'));
      return;
    }

    const review = await ShopReview.create({
      restaurantId: order.restaurantId,
      userId: req.user.sub,
      orderId: order._id,
      rating: Number(req.body.rating),
      comment: String(req.body.comment ?? '').trim().slice(0, 1000),
    });

    dispatchRestaurantNotification({
      restaurantId: order.restaurantId.toString(),
      type: 'new_review',
      title: 'New review',
      body: `You received a ${review.rating} star review.`,
      extraData: {
        orderId: order._id.toString(),
        reviewId: review._id.toString(),
      },
    });

    res.status(201).json({
      review: {
        id: review._id.toString(),
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
      },
    });
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
    paymentStatus: o.paymentStatus ?? 'paid',
    refundedAt: o.refundedAt ?? null,
    fulfillment: o.fulfillment ?? 'delivery',
    deliveryFee: o.deliveryFee ?? 0,
    packageFee: o.packageFee ?? 0,
    gstAmount: o.gstAmount ?? 0,
    deliveryDistanceKm: o.deliveryDistanceKm,
    foodDiscountAmount: o.foodDiscountAmount ?? 0,
    deliveryDiscount: o.deliveryDiscount ?? 0,
    pricing: formatCustomerQuoteFromOrder({
      subtotal: o.subtotal ?? o.total,
      foodDiscountAmount: o.foodDiscountAmount,
      deliveryDiscount: o.deliveryDiscount,
      discountAmount: o.discountAmount,
      deliveryFee: o.deliveryFee,
      packageFee: o.packageFee,
      gstAmount: o.gstAmount,
      deliveryDistanceKm: o.deliveryDistanceKm,
      total: o.total,
      fulfillment: o.fulfillment,
    }),
    status: o.status,
    assignmentState: o.assignmentState ?? 'none',
    riderDispatchMessage: riderDispatchUiMessage(o.status, o.assignmentState),
    rejectReason: o.rejectReason,
    acceptExpiresAt: o.acceptExpiresAt ?? null,
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
    paymentStatus: (o.paymentStatus as string | undefined) ?? 'paid',
    refundedAt: (o.refundedAt as Date | null | undefined) ?? null,
    fulfillment: (o.fulfillment as string | undefined) ?? 'delivery',
    deliveryFee: (o.deliveryFee as number | undefined) ?? 0,
    packageFee: (o.packageFee as number | undefined) ?? 0,
    gstAmount: (o.gstAmount as number | undefined) ?? 0,
    deliveryDistanceKm: o.deliveryDistanceKm as number | undefined,
    foodDiscountAmount: (o.foodDiscountAmount as number | undefined) ?? 0,
    deliveryDiscount: (o.deliveryDiscount as number | undefined) ?? 0,
    pricing: formatCustomerQuoteFromOrder({
      subtotal: (o.subtotal as number | undefined) ?? total,
      foodDiscountAmount: o.foodDiscountAmount as number | undefined,
      deliveryDiscount: o.deliveryDiscount as number | undefined,
      discountAmount: o.discountAmount as number | undefined,
      deliveryFee: o.deliveryFee as number | undefined,
      packageFee: o.packageFee as number | undefined,
      gstAmount: o.gstAmount as number | undefined,
      deliveryDistanceKm: o.deliveryDistanceKm as number | undefined,
      total,
      fulfillment: (o.fulfillment as OrderFulfillment | undefined) ?? 'delivery',
    }),
    status: o.status,
    assignmentState: (o.assignmentState as string | undefined) ?? 'none',
    riderDispatchMessage: riderDispatchUiMessage(
      String(o.status),
      o.assignmentState as string | undefined
    ),
    rejectReason: o.rejectReason as string | undefined,
    acceptExpiresAt: (o.acceptExpiresAt as Date | null | undefined) ?? null,
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
