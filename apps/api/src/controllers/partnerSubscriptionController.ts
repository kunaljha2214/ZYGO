import createError from 'http-errors';
import { validationResult } from 'express-validator';
import type { Response, NextFunction } from 'express';
import type { AuthedRequest } from '../middleware/auth';
import { User } from '../models/User';
import {
  createPartnerSubscriptionCheckout,
  getPartnerSubscriptionStatus,
  verifyPartnerSubscriptionPayment,
} from '../services/partnerSubscription';

export async function getSubscription(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = await User.findById(req.user!.sub);
    if (!user) {
      next(createError(404));
      return;
    }
    res.json(await getPartnerSubscriptionStatus(user));
  } catch (e) {
    next(e);
  }
}

export async function checkoutSubscription(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = await User.findById(req.user!.sub);
    if (!user) {
      next(createError(404));
      return;
    }
    const checkout = await createPartnerSubscriptionCheckout(user);
    res.status(201).json(checkout);
  } catch (e) {
    next(e);
  }
}

export async function verifySubscriptionPayment(
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
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body as {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    };
    const status = await verifyPartnerSubscriptionPayment(
      req.user!.sub,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );
    res.json(status);
  } catch (e) {
    next(e);
  }
}
