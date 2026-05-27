import { Router, type RequestHandler } from 'express';
import { body } from 'express-validator';
import type { AuthedRequest } from '../middleware/auth';
import { authMiddleware } from '../middleware/auth';
import * as orders from '../controllers/orderController';

const r = Router();

r.use(authMiddleware);

const quoteOrderHandler: RequestHandler = (req, res, next) => {
  void orders.quoteOrder(req as AuthedRequest, res, next);
};

const createOrderHandler: RequestHandler = (req, res, next) => {
  void orders.createOrder(req as AuthedRequest, res, next);
};

const listOrdersHandler: RequestHandler = (req, res, next) => {
  void orders.listOrders(req as AuthedRequest, res, next);
};

const getOrderHandler: RequestHandler = (req, res, next) => {
  void orders.getOrder(req as AuthedRequest, res, next);
};

const getOrderRestaurantContactHandler: RequestHandler = (req, res, next) => {
  void orders.getOrderRestaurantContact(req as AuthedRequest, res, next);
};

const getOrderRiderContactHandler: RequestHandler = (req, res, next) => {
  void orders.getOrderRiderContact(req as AuthedRequest, res, next);
};

const cancelOrderHandler: RequestHandler = (req, res, next) => {
  void orders.cancelOrder(req as AuthedRequest, res, next);
};

const createOrderReviewHandler: RequestHandler = (req, res, next) => {
  void orders.createOrderReview(req as AuthedRequest, res, next);
};

const verifyOrderPaymentHandler: RequestHandler = (req, res, next) => {
  void orders.verifyOrderPayment(req as AuthedRequest, res, next);
};

r.post(
  '/orders/quote',
  [
    body('restaurantId').notEmpty(),
    body('items').isArray({ min: 1 }),
    body('items.*.menuItemId').notEmpty(),
    body('items.*.quantity').isInt({ min: 1 }),
    body('items.*.variantName').optional().isString(),
    body('items.*.addOnNames').optional().isArray(),
    body('deliveryAddress.coordinates.lat').isFloat(),
    body('deliveryAddress.coordinates.lng').isFloat(),
    body('couponCode').optional().isString(),
    body('fulfillment').optional().isIn(['delivery', 'pickup']),
  ],
  quoteOrderHandler
);

r.post(
  '/orders',
  [
    body('restaurantId').notEmpty(),
    body('items').isArray({ min: 1 }),
    body('items.*.menuItemId').notEmpty(),
    body('items.*.quantity').isInt({ min: 1 }),
    body('items.*.variantName').optional().isString(),
    body('items.*.addOnNames').optional().isArray(),
    body('deliveryAddress.label').notEmpty(),
    body('deliveryAddress.line1').notEmpty(),
    body('deliveryAddress.coordinates.lat').isFloat(),
    body('deliveryAddress.coordinates.lng').isFloat(),
    body('couponCode').optional().isString(),
    body('fulfillment').optional().isIn(['delivery', 'pickup']),
  ],
  createOrderHandler
);

r.get('/orders', listOrdersHandler);

r.post(
  '/orders/payment/verify',
  [
    body('razorpay_order_id').notEmpty(),
    body('razorpay_payment_id').notEmpty(),
    body('razorpay_signature').notEmpty(),
  ],
  verifyOrderPaymentHandler
);

r.get('/orders/:id', getOrderHandler);
r.get('/orders/:id/contact/restaurant', getOrderRestaurantContactHandler);
r.get('/orders/:id/contact/rider', getOrderRiderContactHandler);
r.patch('/orders/:id/cancel', cancelOrderHandler);
r.post(
  '/orders/:id/review',
  [
    body('rating').isInt({ min: 1, max: 5 }),
    body('comment').optional().isString(),
  ],
  createOrderReviewHandler
);

export default r;
