import createError from 'http-errors';
import { validationResult } from 'express-validator';
import type { Response, NextFunction } from 'express';
import type { AuthedRequest } from '../middleware/auth';
import { ShopOffer } from '../models/ShopOffer';
import { Restaurant } from '../models/Restaurant';
import { validateShopOffer, serializePublicOffer } from '../services/offerValidation';

export async function listRestaurantOffers(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      next(createError(401));
      return;
    }
    const restaurant = await Restaurant.findById(req.params.id).lean();
    if (!restaurant || !restaurant.isActive) {
      next(createError(404, 'Restaurant not found'));
      return;
    }

    const now = new Date();
    const userId = req.user.sub;
    const offers = await ShopOffer.find({
      restaurantId: restaurant._id,
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    })
      .sort({ createdAt: -1 })
      .lean();

    const visible = offers.filter((o) => {
      const targets = o.targetCustomerIds ?? [];
      if (targets.length > 0 && !targets.some((id) => id.toString() === userId)) {
        return false;
      }
      if (o.maxUses != null && o.usageCount >= o.maxUses) {
        return false;
      }
      return true;
    });

    res.json({
      offers: visible.map((o) => serializePublicOffer(o)),
    });
  } catch (e) {
    next(e);
  }
}

export async function validateCoupon(
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

    const restaurant = await Restaurant.findById(req.params.id).lean();
    if (!restaurant || !restaurant.isActive) {
      next(createError(404, 'Restaurant not found'));
      return;
    }

    const { code, subtotal, cartItemNames } = req.body as {
      code: string;
      subtotal: number;
      cartItemNames?: string[];
    };

    const result = await validateShopOffer({
      restaurantId: restaurant._id,
      userId: req.user.sub,
      subtotal: Number(subtotal),
      couponCode: code,
      cartItemNames,
    });

    res.json(result);
  } catch (e) {
    next(e);
  }
}
