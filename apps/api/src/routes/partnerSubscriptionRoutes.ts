import { Router, type RequestHandler } from 'express';
import { body } from 'express-validator';
import type { AuthedRequest } from '../middleware/auth';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import * as sub from '../controllers/partnerSubscriptionController';

const r = Router();

r.use(authMiddleware);
r.use(requireRole('shop_owner', 'delivery_partner', 'driver'));

const getSub: RequestHandler = (req, res, next) => {
  void sub.getSubscription(req as AuthedRequest, res, next);
};

const checkout: RequestHandler = (req, res, next) => {
  void sub.checkoutSubscription(req as AuthedRequest, res, next);
};

const verify: RequestHandler = (req, res, next) => {
  void sub.verifySubscriptionPayment(req as AuthedRequest, res, next);
};

r.get('/', getSub);
r.post('/checkout', checkout);
r.post(
  '/verify',
  [
    body('razorpay_order_id').notEmpty(),
    body('razorpay_payment_id').notEmpty(),
    body('razorpay_signature').notEmpty(),
  ],
  verify
);

export default r;
