import createError from 'http-errors';
import { Types } from 'mongoose';
import { FoodOrder } from '../models/FoodOrder';
import { ShopOffer } from '../models/ShopOffer';
import { emitToUser } from '../socket/io';
import { scheduleRestaurantAcceptTimeout } from './orderAcceptTimeout';

export async function markFoodOrderPaid(
  orderId: string,
  razorpayPaymentId: string
): Promise<InstanceType<typeof FoodOrder> | null> {
  const order = await FoodOrder.findById(orderId);
  if (!order) return null;

  if (order.paymentStatus === 'paid') {
    return order;
  }

  order.paymentStatus = 'paid';
  order.razorpayPaymentId = razorpayPaymentId;
  order.paidAt = new Date();
  if (order.status === 'payment_pending') {
    order.status = 'placed';
  }

  await order.save();

  if (order.offerId && !order.offerUsageCounted) {
    await ShopOffer.updateOne({ _id: order.offerId }, { $inc: { usageCount: 1 } });
    order.offerUsageCounted = true;
    await order.save();
  }

  emitToUser(order.userId.toString(), 'order:updated', {
    orderId: order._id.toString(),
    status: order.status,
    paymentStatus: order.paymentStatus,
  });

  if (order.status === 'placed') {
    void scheduleRestaurantAcceptTimeout(order._id.toString());
  }

  return order;
}

export async function assertOrderPayableByUser(
  orderId: string,
  userId: string
): Promise<InstanceType<typeof FoodOrder>> {
  const order = await FoodOrder.findOne({ _id: orderId, userId: new Types.ObjectId(userId) });
  if (!order) {
    throw createError(404, 'Order not found');
  }
  if (order.paymentStatus === 'paid') {
    throw createError(400, 'Order is already paid');
  }
  if (order.status !== 'payment_pending') {
    throw createError(400, 'Order cannot be paid in its current state');
  }
  return order;
}
