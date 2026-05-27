import { FoodOrder, type IFoodOrder } from '../models/FoodOrder';
import { ShopOffer } from '../models/ShopOffer';
import { createRazorpayRefund } from './razorpayService';
import { emitToUser } from '../socket/io';
import { dispatchCustomerOrderEvent } from './orderNotifications';

export type FoodOrderRefundResult = {
  refunded: boolean;
  paymentStatus: string;
  error?: string;
};

function emitOrderPaymentUpdate(order: IFoodOrder): void {
  emitToUser(order.userId.toString(), 'order:updated', {
    orderId: order._id.toString(),
    status: order.status,
    paymentStatus: order.paymentStatus,
    rejectReason: order.rejectReason,
    refundedAt: order.refundedAt,
  });
  dispatchCustomerOrderEvent(order, 'refund_processed');
}

async function reverseOfferUsage(order: IFoodOrder): Promise<void> {
  if (!order.offerId || !order.offerUsageCounted) return;
  await ShopOffer.updateOne({ _id: order.offerId }, { $inc: { usageCount: -1 } });
  await FoodOrder.updateOne({ _id: order._id }, { offerUsageCounted: false });
}

/** Full Razorpay refund for a paid food order (idempotent). */
export async function refundPaidFoodOrder(orderId: string): Promise<FoodOrderRefundResult> {
  const existing = await FoodOrder.findById(orderId);
  if (!existing) {
    return { refunded: false, paymentStatus: 'pending', error: 'Order not found' };
  }

  if (existing.paymentStatus === 'refunded') {
    return { refunded: true, paymentStatus: 'refunded' };
  }

  if (existing.paymentStatus !== 'paid') {
    return { refunded: false, paymentStatus: existing.paymentStatus };
  }

  if (!existing.razorpayPaymentId) {
    console.warn('[refund] paid order missing razorpayPaymentId', orderId);
    return { refunded: false, paymentStatus: 'paid', error: 'No payment id on order' };
  }

  try {
    const refund = await createRazorpayRefund({
      paymentId: existing.razorpayPaymentId,
      amountInr: existing.total,
      notes: {
        orderId: existing._id.toString(),
        orderNumber: existing.orderNumber ?? '',
      },
    });

    const updated = await FoodOrder.findOneAndUpdate(
      { _id: orderId, paymentStatus: 'paid' },
      {
        paymentStatus: 'refunded',
        razorpayRefundId: refund.id,
        refundedAt: new Date(),
      },
      { new: true }
    );

    if (!updated) {
      const again = await FoodOrder.findById(orderId);
      const status = again?.paymentStatus ?? 'paid';
      return { refunded: status === 'refunded', paymentStatus: status };
    }

    await reverseOfferUsage(updated);
    emitOrderPaymentUpdate(updated);
    return { refunded: true, paymentStatus: 'refunded' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Refund failed';
    const alreadyRefunded =
      typeof message === 'string' &&
      /already\s+refunded|refunded\s+already/i.test(message);

    if (alreadyRefunded) {
      const updated = await FoodOrder.findOneAndUpdate(
        { _id: orderId, paymentStatus: 'paid' },
        { paymentStatus: 'refunded', refundedAt: new Date() },
        { new: true }
      );
      if (updated) {
        await reverseOfferUsage(updated);
        emitOrderPaymentUpdate(updated);
        return { refunded: true, paymentStatus: 'refunded' };
      }
      const again = await FoodOrder.findById(orderId);
      if (again?.paymentStatus === 'refunded') {
        return { refunded: true, paymentStatus: 'refunded' };
      }
    }

    console.error('[refund] Razorpay refund failed', orderId, err);

    const failed = await FoodOrder.findOneAndUpdate(
      { _id: orderId, paymentStatus: 'paid' },
      { paymentStatus: 'refund_failed' },
      { new: true }
    );
    if (failed) emitOrderPaymentUpdate(failed);

    return { refunded: false, paymentStatus: failed?.paymentStatus ?? 'paid', error: message };
  }
}

/** Webhook backup when refund completes outside our request path. */
export async function markFoodOrderRefundedFromWebhook(
  razorpayPaymentId: string,
  razorpayRefundId: string
): Promise<boolean> {
  const order = await FoodOrder.findOne({ razorpayPaymentId });
  if (!order || order.paymentStatus === 'refunded') return Boolean(order);

  order.paymentStatus = 'refunded';
  order.razorpayRefundId = razorpayRefundId;
  order.refundedAt = new Date();
  await order.save();

  await reverseOfferUsage(order);
  emitOrderPaymentUpdate(order);
  return true;
}
