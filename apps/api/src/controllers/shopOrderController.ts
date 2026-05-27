import createError from 'http-errors';
import { validationResult } from 'express-validator';
import type { Response, NextFunction } from 'express';
import type { AuthedRequest } from '../middleware/auth';
import { FoodOrder, type FoodOrderStatus } from '../models/FoodOrder';
import { requireApprovedRestaurantId } from '../utils/menuAccess';
import {
  canTransition,
  estimatePrepMinutes,
  nextStatus,
  predictDelayMinutes,
  routeKitchenStation,
  suggestBatches,
  SHOP_STATUS_FLOW,
} from '../utils/shopOrderLogic';
import { clearDispatchRetry } from '../services/deliveryDispatchRetry';
import { startDeliveryDispatch } from '../services/deliveryAssignmentEngine';
import { riderDispatchUiMessage } from '../utils/riderDispatchUi';
import {
  assertPartnerSubscriptionActive,
  markPartnerFirstOrderCompleted,
} from '../services/partnerSubscription';
import {
  getCustomerContactForShopOwner,
  getCustomerDisplayName,
} from '../services/orderPeerContact';
import { clearRestaurantAcceptTimeout } from '../services/orderAcceptTimeout';
import { refundPaidFoodOrder } from '../services/orderRefund';
import {
  dispatchCustomerFoodEvent,
  dispatchRestaurantFoodEvent,
} from '../services/foodNotifications';
import { settleFoodOrderOnDelivered } from '../services/orderSettlement';

function formatShopOrder(o: Record<string, unknown>) {
  const items = o.items as { name: string; price: number; quantity: number }[];
  const itemCount = items?.reduce((s, i) => s + i.quantity, 0) ?? 0;
  return {
    id: String(o._id),
    orderNumber: o.orderNumber,
    status: o.status,
    items,
    itemCount,
    total: o.total,
    deliveryAddress: o.deliveryAddress,
    customerNotes: o.customerNotes ?? null,
    shopNotes: o.shopNotes ?? null,
    rejectReason: o.rejectReason ?? null,
    acceptExpiresAt: o.acceptExpiresAt ?? null,
    estimatedPrepMinutes: o.estimatedPrepMinutes ?? null,
    kitchenStation: o.kitchenStation ?? null,
    batchId: o.batchId ?? null,
    delayRiskMinutes: o.delayRiskMinutes ?? null,
    invoicePrintedAt: o.invoicePrintedAt ?? null,
    acceptedAt: o.acceptedAt ?? null,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    nextAction: nextStatus(o.status as string),
    shouldPrintInvoice:
      o.status === 'confirmed' && !o.invoicePrintedAt,
    assignmentState: (o.assignmentState as string | undefined) ?? 'none',
    riderDispatchMessage: riderDispatchUiMessage(
      String(o.status),
      o.assignmentState as string | undefined
    ),
  };
}

async function getOwnerOrder(req: AuthedRequest, orderId: string) {
  const restaurantId = await requireApprovedRestaurantId(req.user!.sub);
  const order = await FoodOrder.findOne({ _id: orderId, restaurantId });
  if (!order) throw createError(404, 'Order not found');
  return { order, restaurantId };
}

async function refreshDelayAndStation(order: InstanceType<typeof FoodOrder>, restaurantId: string) {
  const queue = await FoodOrder.countDocuments({
    restaurantId,
    status: { $in: ['placed', 'confirmed', 'preparing'] },
  });
  const itemCount = order.items.reduce((s, i) => s + i.quantity, 0);
  if (!order.estimatedPrepMinutes) {
    order.estimatedPrepMinutes = estimatePrepMinutes(itemCount, queue);
  }
  order.kitchenStation = routeKitchenStation(order.items);
  order.delayRiskMinutes = predictDelayMinutes(queue, 18, order.estimatedPrepMinutes);
  await order.save();
}

export async function listShopOrders(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const restaurantId = await requireApprovedRestaurantId(req.user!.sub);
    const status = req.query.status as string | undefined;
    const since = req.query.since as string | undefined;
    const filter: Record<string, unknown> = { restaurantId };
    if (status) filter.status = status;
    if (since) filter.updatedAt = { $gt: new Date(since) };

    const orders = await FoodOrder.find(filter).sort({ createdAt: -1 }).limit(100).lean();
    const active = orders.filter((o) =>
      ['placed', 'confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery'].includes(o.status)
    );
    const batches = suggestBatches(
      active.map((o) => ({
        id: o._id.toString(),
        createdAt: o.createdAt,
        status: o.status,
        items: o.items,
      }))
    );

    res.json({
      orders: orders.map((o) => formatShopOrder(o as unknown as Record<string, unknown>)),
      batches,
      statusFlow: SHOP_STATUS_FLOW,
    });
  } catch (e) {
    next(e);
  }
}

export async function getOrderAlerts(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const restaurantId = await requireApprovedRestaurantId(req.user!.sub);
    const since = req.query.since ? new Date(String(req.query.since)) : new Date(Date.now() - 60000);
    const newOrders = await FoodOrder.find({
      restaurantId,
      status: 'placed',
      createdAt: { $gt: since },
    })
      .sort({ createdAt: -1 })
      .lean();

    const pendingCount = await FoodOrder.countDocuments({
      restaurantId,
      status: { $in: ['placed', 'confirmed', 'preparing'] },
    });

    res.json({
      alerts: newOrders.map((o) => formatShopOrder(o as unknown as Record<string, unknown>)),
      pendingCount,
      polledAt: new Date().toISOString(),
    });
  } catch (e) {
    next(e);
  }
}

export async function getKitchenDisplay(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const restaurantId = await requireApprovedRestaurantId(req.user!.sub);
    const orders = await FoodOrder.find({
      restaurantId,
      status: { $in: ['confirmed', 'preparing', 'ready_for_pickup'] },
    })
      .sort({ acceptedAt: 1, createdAt: 1 })
      .lean();

    const byStation = new Map<string, ReturnType<typeof formatShopOrder>[]>();
    for (const o of orders) {
      const station = (o.kitchenStation as string) || routeKitchenStation(o.items);
      const list = byStation.get(station) ?? [];
      list.push(formatShopOrder(o as unknown as Record<string, unknown>));
      byStation.set(station, list);
    }

    res.json({
      stations: [...byStation.entries()].map(([station, stationOrders]) => ({
        station,
        orders: stationOrders,
      })),
      orders: orders.map((o) => formatShopOrder(o as unknown as Record<string, unknown>)),
    });
  } catch (e) {
    next(e);
  }
}

export async function getShopOrderInsights(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const restaurantId = await requireApprovedRestaurantId(req.user!.sub);
    const active = await FoodOrder.find({
      restaurantId,
      status: { $in: ['placed', 'confirmed', 'preparing', 'ready_for_pickup'] },
    })
      .sort({ createdAt: -1 })
      .lean();

    const batches = suggestBatches(
      active.map((o) => ({
        id: o._id.toString(),
        createdAt: o.createdAt,
        status: o.status,
        items: o.items,
      }))
    );

    const queueDepth = active.filter((o) =>
      ['placed', 'confirmed', 'preparing'].includes(o.status)
    ).length;

    res.json({
      smartBatching: batches,
      autoKitchenRouting: active.map((o) => ({
        orderId: o._id.toString(),
        orderNumber: o.orderNumber,
        station: o.kitchenStation || routeKitchenStation(o.items),
      })),
      delayPredictions: active.map((o) => ({
        orderId: o._id.toString(),
        orderNumber: o.orderNumber,
        delayRiskMinutes:
          o.delayRiskMinutes ??
          predictDelayMinutes(queueDepth, 18, o.estimatedPrepMinutes ?? undefined),
        estimatedPrepMinutes: o.estimatedPrepMinutes,
      })),
    });
  } catch (e) {
    next(e);
  }
}

async function formatShopOrderWithCustomer(order: InstanceType<typeof FoodOrder>) {
  const customer = await getCustomerDisplayName(order.userId);
  return {
    ...formatShopOrder(order.toObject() as unknown as Record<string, unknown>),
    customer,
  };
}

export async function getShopOrder(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { order } = await getOwnerOrder(req, req.params.id);
    res.json(await formatShopOrderWithCustomer(order));
  } catch (e) {
    next(e);
  }
}

export async function getShopOrderCustomerContact(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const contact = await getCustomerContactForShopOwner(req.params.id, req.user!.sub);
    res.json(contact);
  } catch (e) {
    next(e);
  }
}

export async function acceptOrder(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      next(createError(400, errors.array()[0].msg));
      return;
    }
    const { order, restaurantId } = await getOwnerOrder(req, req.params.id);
    if (order.status !== 'placed') {
      next(createError(400, 'Only new orders can be accepted'));
      return;
    }
    await assertPartnerSubscriptionActive(req.user!.sub, 'shop_owner');
    const prep = Number(req.body.estimatedPrepMinutes) || undefined;
    const itemCount = order.items.reduce((s, i) => s + i.quantity, 0);
    const queue = await FoodOrder.countDocuments({
      restaurantId,
      status: { $in: ['confirmed', 'preparing'] },
    });

    order.status = 'confirmed';
    order.acceptedAt = new Date();
    order.estimatedPrepMinutes = prep ?? estimatePrepMinutes(itemCount, queue);
    order.kitchenStation = routeKitchenStation(order.items);
    order.delayRiskMinutes = predictDelayMinutes(queue, 18, order.estimatedPrepMinutes);
    order.acceptExpiresAt = null;
    await order.save();
    clearRestaurantAcceptTimeout(order._id.toString());
    await markPartnerFirstOrderCompleted(req.user!.sub, 'shop_owner');
    dispatchCustomerFoodEvent(order, 'order_accepted');
    res.json(await formatShopOrderWithCustomer(order));
  } catch (e) {
    next(e);
  }
}

export async function rejectOrder(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      next(createError(400, errors.array()[0].msg));
      return;
    }
    const { order } = await getOwnerOrder(req, req.params.id);
    if (order.status !== 'placed') {
      next(createError(400, 'Only new orders can be rejected'));
      return;
    }
    order.status = 'cancelled';
    order.rejectReason = String(req.body.reason).trim();
    order.acceptExpiresAt = null;
    await order.save();
    clearRestaurantAcceptTimeout(order._id.toString());
    dispatchCustomerFoodEvent(order, 'order_rejected', { reason: order.rejectReason });
    await refundPaidFoodOrder(order._id.toString());
    const fresh = await FoodOrder.findById(order._id);
    res.json(
      formatShopOrder((fresh ?? order).toObject() as unknown as Record<string, unknown>)
    );
  } catch (e) {
    next(e);
  }
}

/** Shop owner: manually restart rider search (also runs automatically every ~2 min). */
export async function retryOrderRiderDispatch(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { order } = await getOwnerOrder(req, req.params.id);
    if (order.status !== 'ready_for_pickup') {
      next(createError(400, 'Rider search only applies to orders ready for pickup'));
      return;
    }
    if (order.deliveryPartnerId) {
      next(createError(400, 'A delivery partner is already assigned'));
      return;
    }
    clearDispatchRetry(order._id.toString());
    order.rejectedPartnerIds = [];
    order.assignmentState = 'none';
    await order.save();
    void startDeliveryDispatch(order._id.toString()).catch((err) => {
      console.error('[delivery] manual retry failed', err);
    });
    const fresh = await FoodOrder.findById(order._id);
    res.json(await formatShopOrderWithCustomer(fresh ?? order));
  } catch (e) {
    next(e);
  }
}

export async function advanceOrderStatus(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { order, restaurantId } = await getOwnerOrder(req, req.params.id);
    const target = (req.body.status as FoodOrderStatus) || nextStatus(order.status);
    if (!target) {
      next(createError(400, 'Order cannot advance further'));
      return;
    }
    if (!canTransition(order.status, target)) {
      next(createError(400, `Cannot move from ${order.status} to ${target}`));
      return;
    }
    order.status = target;
    if (target === 'preparing' && !order.acceptedAt) order.acceptedAt = new Date();
    if (target === 'preparing') dispatchCustomerFoodEvent(order, 'food_preparing');
    if (target === 'ready_for_pickup') {
      order.readyAt = new Date();
      await order.save();
      void startDeliveryDispatch(order._id.toString()).catch((err) => {
        console.error('[delivery] dispatch failed', err);
      });
    }
    if (target === 'out_for_delivery') order.outForDeliveryAt = new Date();
    if (target === 'delivered') {
      order.deliveredAt = new Date();
      await settleFoodOrderOnDelivered(order);
      dispatchCustomerFoodEvent(order, 'order_delivered');
    }
    await refreshDelayAndStation(order, restaurantId);
    res.json(await formatShopOrderWithCustomer(order));
  } catch (e) {
    next(e);
  }
}

export async function updateShopOrderNotes(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { order } = await getOwnerOrder(req, req.params.id);
    if (req.body.shopNotes !== undefined) {
      order.shopNotes = String(req.body.shopNotes).trim().slice(0, 500);
    }
    await order.save();
    res.json(formatShopOrder(order.toObject() as unknown as Record<string, unknown>));
  } catch (e) {
    next(e);
  }
}

export async function markInvoicePrinted(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { order } = await getOwnerOrder(req, req.params.id);
    order.invoicePrintedAt = new Date();
    await order.save();
    res.json(formatShopOrder(order.toObject() as unknown as Record<string, unknown>));
  } catch (e) {
    next(e);
  }
}
