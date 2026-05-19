import { Router, type RequestHandler } from 'express';
import { body } from 'express-validator';
import type { AuthedRequest } from '../middleware/auth';
import { authMiddleware } from '../middleware/auth';
import * as rest from '../controllers/restaurantController';
import * as customerOffers from '../controllers/customerOffersController';

const r = Router();

r.use(authMiddleware);

const listRestaurantsHandler: RequestHandler = (req, res, next) => {
  void rest.listRestaurants(req as AuthedRequest, res, next);
};

const getRestaurantHandler: RequestHandler = (req, res, next) => {
  void rest.getRestaurant(req as AuthedRequest, res, next);
};

const listRestaurantOffersHandler: RequestHandler = (req, res, next) => {
  void customerOffers.listRestaurantOffers(req as AuthedRequest, res, next);
};

const validateCouponHandler: RequestHandler = (req, res, next) => {
  void customerOffers.validateCoupon(req as AuthedRequest, res, next);
};

r.get('/restaurants', listRestaurantsHandler);
r.get('/restaurants/:id', getRestaurantHandler);
r.get('/restaurants/:id/offers', listRestaurantOffersHandler);
r.post(
  '/restaurants/:id/offers/validate',
  [
    body('code').trim().notEmpty(),
    body('subtotal').isFloat({ min: 0.01 }),
    body('cartItemNames').optional().isArray(),
  ],
  validateCouponHandler
);

export default r;
