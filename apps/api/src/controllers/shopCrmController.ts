import createError from 'http-errors';
import { validationResult } from 'express-validator';
import type { Response, NextFunction } from 'express';
import type { AuthedRequest } from '../middleware/auth';
import { FoodOrder } from '../models/FoodOrder';
import { User } from '../models/User';
import { ShopCustomerProfile } from '../models/ShopCustomerProfile';
import { ShopReview } from '../models/ShopReview';
import { requireApprovedRestaurantId } from '../utils/menuAccess';
import { syncCustomerProfiles } from '../utils/shopCrmSync';

export async function getCrmOverview(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const restaurantId = await requireApprovedRestaurantId(req.user!.sub);
    await syncCustomerProfiles(restaurantId);

    const profiles = await ShopCustomerProfile.find({ restaurantId }).lean();
    const repeatCustomers = profiles.filter((p) => p.totalOrders >= 2).length;
    const totalLoyalty = profiles.reduce((s, p) => s + p.loyaltyPoints, 0);
    const reviews = await ShopReview.find({ restaurantId }).lean();
    const avgRating =
      reviews.length > 0
        ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
        : null;

    res.json({
      totalCustomers: profiles.length,
      repeatCustomers,
      repeatRate:
        profiles.length > 0 ? Math.round((repeatCustomers / profiles.length) * 100) : 0,
      totalLoyaltyPoints: totalLoyalty,
      reviewCount: reviews.length,
      averageRating: avgRating,
    });
  } catch (e) {
    next(e);
  }
}

export async function listCrmCustomers(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const restaurantId = await requireApprovedRestaurantId(req.user!.sub);
    await syncCustomerProfiles(restaurantId);

    const profiles = await ShopCustomerProfile.find({ restaurantId })
      .sort({ totalSpent: -1 })
      .limit(100)
      .lean();
    const userIds = profiles.map((p) => p.userId);
    const users = await User.find({ _id: { $in: userIds } })
      .select('name phone')
      .lean();
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    res.json({
      customers: profiles.map((p) => {
        const u = userMap.get(p.userId.toString());
        return {
          userId: p.userId.toString(),
          name: u?.name ?? 'Customer',
          phone: u?.phone ? `***${u.phone.slice(-4)}` : '',
          loyaltyPoints: p.loyaltyPoints,
          totalOrders: p.totalOrders,
          totalSpent: p.totalSpent,
          lastOrderAt: p.lastOrderAt,
          isRepeat: p.totalOrders >= 2,
        };
      }),
    });
  } catch (e) {
    next(e);
  }
}

export async function getCrmCustomer(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const restaurantId = await requireApprovedRestaurantId(req.user!.sub);
    await syncCustomerProfiles(restaurantId);

    const profile = await ShopCustomerProfile.findOne({
      restaurantId,
      userId: req.params.userId,
    }).lean();
    if (!profile) {
      next(createError(404, 'Customer not found'));
      return;
    }

    const user = await User.findById(profile.userId).select('name phone').lean();
    const orders = await FoodOrder.find({
      restaurantId,
      userId: profile.userId,
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const reviews = await ShopReview.find({
      restaurantId,
      userId: profile.userId,
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      userId: profile.userId.toString(),
      name: user?.name ?? 'Customer',
      phone: user?.phone ? `***${user.phone.slice(-4)}` : '',
      loyaltyPoints: profile.loyaltyPoints,
      totalOrders: profile.totalOrders,
      totalSpent: profile.totalSpent,
      lastOrderAt: profile.lastOrderAt,
      firstOrderAt: profile.firstOrderAt,
      isRepeat: profile.totalOrders >= 2,
      orderHistory: orders.map((o) => ({
        id: o._id.toString(),
        orderNumber: o.orderNumber,
        status: o.status,
        total: o.total,
        itemCount: o.items.reduce((s, i) => s + i.quantity, 0),
        createdAt: o.createdAt,
      })),
      reviews: reviews.map((r) => ({
        id: r._id.toString(),
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
      })),
    });
  } catch (e) {
    next(e);
  }
}

export async function updateLoyaltyPoints(
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
    const restaurantId = await requireApprovedRestaurantId(req.user!.sub);
    const points = Number(req.body.points);
    if (!Number.isFinite(points) || points < 0) {
      next(createError(400, 'Invalid points'));
      return;
    }

    const profile = await ShopCustomerProfile.findOneAndUpdate(
      { restaurantId, userId: req.params.userId },
      { $set: { loyaltyPoints: Math.round(points) } },
      { new: true }
    );
    if (!profile) {
      next(createError(404, 'Customer not found'));
      return;
    }
    res.json({
      userId: profile.userId.toString(),
      loyaltyPoints: profile.loyaltyPoints,
    });
  } catch (e) {
    next(e);
  }
}

export async function listCrmReviews(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const restaurantId = await requireApprovedRestaurantId(req.user!.sub);
    const reviews = await ShopReview.find({ restaurantId }).sort({ createdAt: -1 }).limit(50).lean();
    const userIds = reviews.map((r) => r.userId);
    const users = await User.find({ _id: { $in: userIds } })
      .select('name')
      .lean();
    const userMap = new Map(users.map((u) => [u._id.toString(), u.name]));

    res.json({
      reviews: reviews.map((r) => ({
        id: r._id.toString(),
        userId: r.userId.toString(),
        customerName: userMap.get(r.userId.toString()) ?? 'Customer',
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
      })),
      averageRating:
        reviews.length > 0
          ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
          : null,
    });
  } catch (e) {
    next(e);
  }
}

export async function getPersonalizedOffers(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const restaurantId = await requireApprovedRestaurantId(req.user!.sub);
    await syncCustomerProfiles(restaurantId);

    const repeat = await ShopCustomerProfile.find({
      restaurantId,
      totalOrders: { $gte: 2 },
    })
      .sort({ totalSpent: -1 })
      .limit(10)
      .lean();
    const userIds = repeat.map((p) => p.userId);
    const users = await User.find({ _id: { $in: userIds } })
      .select('name')
      .lean();
    const userMap = new Map(users.map((u) => [u._id.toString(), u.name]));

    const suggestions = repeat.map((p) => {
      const uid = p.userId.toString();
      const discount = p.totalSpent > 2000 ? 20 : p.totalOrders >= 5 ? 15 : 10;
      return {
        userId: uid,
        customerName: userMap.get(uid) ?? 'Customer',
        suggestedOffer: {
          title: `Welcome back — ${discount}% off`,
          offerType: 'percentage' as const,
          discountValue: discount,
          minOrderAmount: 199,
          reason:
            p.totalOrders >= 5
              ? 'VIP repeat customer (5+ orders)'
              : p.totalSpent > 2000
                ? 'High lifetime spend'
                : 'Repeat customer loyalty',
        },
      };
    });

    res.json({
      personalizedOffers: suggestions,
      aiNote:
        'Demo AI targeting: offers ranked by order frequency and spend. Create coupons from Offers tab.',
    });
  } catch (e) {
    next(e);
  }
}
