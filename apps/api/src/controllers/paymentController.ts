import type { Request, Response, NextFunction } from 'express';
import createError from 'http-errors';
import { FoodOrder } from '../models/FoodOrder';
import { markFoodOrderPaid } from '../services/orderPayment';
import { markFoodOrderRefundedFromWebhook } from '../services/orderRefund';
import { tryCompleteSubscriptionFromWebhook } from '../services/partnerSubscription';
import { tryCompleteRidePaymentFromWebhook } from '../services/ridePayment';
import { verifyWebhookSignature } from '../services/razorpayService';

type RazorpayWebhookPayload = {
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        status?: string;
      };
    };
    refund?: {
      entity?: {
        id?: string;
        payment_id?: string;
        status?: string;
      };
    };
  };
};

export async function razorpayWebhook(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const signature = req.headers['x-razorpay-signature'];
    if (typeof signature !== 'string') {
      next(createError(400, 'Missing webhook signature'));
      return;
    }

    const rawBody = req.body as Buffer;
    if (!Buffer.isBuffer(rawBody) || !verifyWebhookSignature(rawBody, signature)) {
      next(createError(400, 'Invalid webhook signature'));
      return;
    }

    const event = JSON.parse(rawBody.toString('utf8')) as RazorpayWebhookPayload;
    if (event.event === 'refund.processed') {
      const refund = event.payload?.refund?.entity;
      const paymentId = refund?.payment_id;
      const refundId = refund?.id;
      if (paymentId && refundId && refund?.status === 'processed') {
        await markFoodOrderRefundedFromWebhook(paymentId, refundId);
      }
    }

    if (event.event === 'payment.captured') {
      const payment = event.payload?.payment?.entity;
      const razorpayOrderId = payment?.order_id;
      const razorpayPaymentId = payment?.id;
      if (razorpayOrderId && razorpayPaymentId && payment?.status === 'captured') {
        const subHandled = await tryCompleteSubscriptionFromWebhook(
          razorpayOrderId,
          razorpayPaymentId
        );
        if (!subHandled) {
          const rideHandled = await tryCompleteRidePaymentFromWebhook(
            razorpayOrderId,
            razorpayPaymentId
          );
          if (!rideHandled) {
            const order = await FoodOrder.findOne({ razorpayOrderId });
            if (order) {
              await markFoodOrderPaid(order._id.toString(), razorpayPaymentId);
            }
          }
        }
      }
    }

    res.json({ received: true });
  } catch (e) {
    next(e);
  }
}
