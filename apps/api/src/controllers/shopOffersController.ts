import createError from 'http-errors';
import { validationResult } from 'express-validator';
import type { Response, NextFunction } from 'express';
import type { AuthedRequest } from '../middleware/auth';
import { ShopOffer, type ShopOfferType, type ShopCampaignType } from '../models/ShopOffer';
import { ShopCustomerProfile } from '../models/ShopCustomerProfile';
import { requireApprovedRestaurantId } from '../utils/menuAccess';

type OfferLean = {
  _id: { toString(): string };
  title: string;
  code: string;
  offerType: ShopOfferType;
  discountValue: number;
  minOrderAmount: number;
  comboItemNames: string[];
  isActive: boolean;
  startDate: Date;
  endDate: Date;
  happyHourStart?: string;
  happyHourEnd?: string;
  campaignType: ShopCampaignType;
  festivalName?: string;
  maxUses?: number;
  usageCount: number;
  targetCustomerIds?: { toString(): string }[];
  createdAt: Date;
};

function isOfferExpired(endDate: Date, now = new Date()): boolean {
  return endDate < now;
}

function endDateFromDays(start: Date, days: number): Date {
  const end = new Date(start);
  end.setDate(end.getDate() + days);
  end.setHours(23, 59, 59, 999);
  return end;
}

function serializeOfferLean(o: OfferLean) {
  return {
    id: o._id.toString(),
    title: o.title,
    code: o.code,
    offerType: o.offerType,
    discountValue: o.discountValue,
    minOrderAmount: o.minOrderAmount,
    comboItemNames: o.comboItemNames ?? [],
    isActive: o.isActive,
    startDate: o.startDate,
    endDate: o.endDate,
    happyHourStart: o.happyHourStart,
    happyHourEnd: o.happyHourEnd,
    campaignType: o.campaignType,
    festivalName: o.festivalName,
    maxUses: o.maxUses,
    usageCount: o.usageCount,
    targetCustomerIds: o.targetCustomerIds?.map((id) => id.toString()) ?? [],
    createdAt: o.createdAt,
    isExpired: isOfferExpired(o.endDate),
  };
}

function serializeOffer(doc: InstanceType<typeof ShopOffer>) {
  return serializeOfferLean(doc.toObject() as OfferLean);
}

export async function listOffers(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const restaurantId = await requireApprovedRestaurantId(req.user!.sub);
    const offers = await ShopOffer.find({ restaurantId }).sort({ createdAt: -1 }).lean();
    const now = new Date();
    const serialized = offers.map((o) => serializeOfferLean(o as OfferLean));
    const activeOffers = serialized.filter((o) => !isOfferExpired(new Date(o.endDate), now));
    const historyOffers = serialized.filter((o) => isOfferExpired(new Date(o.endDate), now));
    res.json({ activeOffers, historyOffers });
  } catch (e) {
    next(e);
  }
}

export async function createOffer(
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
    const body = req.body as Record<string, unknown>;

    const doc = await ShopOffer.create({
      restaurantId,
      title: String(body.title).trim(),
      code: String(body.code).trim().toUpperCase(),
      offerType: body.offerType as ShopOfferType,
      discountValue: Number(body.discountValue) || 0,
      minOrderAmount: Number(body.minOrderAmount) || 0,
      comboItemNames: Array.isArray(body.comboItemNames) ? body.comboItemNames : [],
      isActive: body.isActive !== false,
      startDate: new Date(String(body.startDate)),
      endDate: new Date(String(body.endDate)),
      happyHourStart: body.happyHourStart || undefined,
      happyHourEnd: body.happyHourEnd || undefined,
      campaignType: (body.campaignType as ShopCampaignType) || 'standard',
      festivalName: body.festivalName || undefined,
      maxUses: body.maxUses ? Number(body.maxUses) : undefined,
      targetCustomerIds: Array.isArray(body.targetCustomerIds) ? body.targetCustomerIds : [],
    });
    res.status(201).json(serializeOffer(doc));
  } catch (e) {
    if ((e as { code?: number }).code === 11000) {
      next(createError(400, 'Coupon code already exists'));
      return;
    }
    next(e);
  }
}

export async function updateOffer(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const restaurantId = await requireApprovedRestaurantId(req.user!.sub);
    const doc = await ShopOffer.findOne({ _id: req.params.id, restaurantId });
    if (!doc) {
      next(createError(404));
      return;
    }
    const body = req.body as Record<string, unknown>;
    const wasExpired = isOfferExpired(doc.endDate);
    if (body.title) doc.title = String(body.title).trim();
    if (body.code) doc.code = String(body.code).trim().toUpperCase();
    if (body.offerType) doc.offerType = body.offerType as ShopOfferType;
    if (body.discountValue !== undefined) doc.discountValue = Number(body.discountValue);
    if (body.minOrderAmount !== undefined) doc.minOrderAmount = Number(body.minOrderAmount);
    if (body.comboItemNames) doc.comboItemNames = body.comboItemNames as string[];
    if (body.isActive !== undefined) doc.isActive = Boolean(body.isActive);
    if (body.startDate) doc.startDate = new Date(String(body.startDate));
    if (body.endDate) doc.endDate = new Date(String(body.endDate));
    if (
      body.endDate &&
      wasExpired &&
      !isOfferExpired(doc.endDate) &&
      body.isActive === undefined
    ) {
      doc.isActive = true;
    }
    if (body.happyHourStart !== undefined) doc.happyHourStart = body.happyHourStart as string;
    if (body.happyHourEnd !== undefined) doc.happyHourEnd = body.happyHourEnd as string;
    if (body.campaignType) doc.campaignType = body.campaignType as ShopCampaignType;
    if (body.festivalName !== undefined) doc.festivalName = body.festivalName as string;
    if (body.maxUses !== undefined) doc.maxUses = Number(body.maxUses);
    await doc.save();
    res.json(serializeOffer(doc));
  } catch (e) {
    next(e);
  }
}

export async function deleteOffer(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const restaurantId = await requireApprovedRestaurantId(req.user!.sub);
    const result = await ShopOffer.deleteOne({ _id: req.params.id, restaurantId });
    if (result.deletedCount === 0) {
      next(createError(404));
      return;
    }
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}

export async function toggleOffer(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const restaurantId = await requireApprovedRestaurantId(req.user!.sub);
    const doc = await ShopOffer.findOne({ _id: req.params.id, restaurantId });
    if (!doc) {
      next(createError(404));
      return;
    }
    if (isOfferExpired(doc.endDate)) {
      next(createError(400, 'Offer has expired. Extend it from offer history.'));
      return;
    }
    doc.isActive = !doc.isActive;
    await doc.save();
    res.json(serializeOffer(doc));
  } catch (e) {
    next(e);
  }
}

export async function reactivateOffer(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const restaurantId = await requireApprovedRestaurantId(req.user!.sub);
    const doc = await ShopOffer.findOne({ _id: req.params.id, restaurantId });
    if (!doc) {
      next(createError(404));
      return;
    }
    if (!isOfferExpired(doc.endDate)) {
      next(createError(400, 'Only expired offers can be reactivated from history'));
      return;
    }

    const body = req.body as { validityDays?: number };
    const validityDays = Math.min(365, Math.max(1, Number(body.validityDays) || 30));
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    doc.startDate = start;
    doc.endDate = endDateFromDays(start, validityDays);
    doc.isActive = true;
    await doc.save();
    res.json(serializeOffer(doc));
  } catch (e) {
    next(e);
  }
}

export async function getAiCouponTargeting(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const restaurantId = await requireApprovedRestaurantId(req.user!.sub);
    const profiles = await ShopCustomerProfile.find({ restaurantId, totalOrders: { $gte: 1 } })
      .sort({ lastOrderAt: -1 })
      .limit(20)
      .lean();

    const now = Date.now();
    const segments = profiles.map((p) => {
      const daysSince =
        p.lastOrderAt != null
          ? Math.floor((now - new Date(p.lastOrderAt).getTime()) / 86400000)
          : 99;
      let segment = 'active';
      let suggestedCode = 'COMEBACK10';
      let offerType: ShopOfferType = 'percentage';
      let discountValue = 10;

      if (daysSince > 14) {
        segment = 'churn_risk';
        suggestedCode = 'MISSYOU20';
        discountValue = 20;
      } else if (p.totalOrders >= 5) {
        segment = 'vip';
        suggestedCode = 'VIP15';
        discountValue = 15;
      } else if (p.totalOrders === 1) {
        segment = 'second_order';
        suggestedCode = 'TRYAGAIN12';
        discountValue = 12;
      }

      return {
        userId: p.userId.toString(),
        segment,
        totalOrders: p.totalOrders,
        totalSpent: p.totalSpent,
        daysSinceLastOrder: daysSince,
        suggestion: {
          code: suggestedCode,
          offerType,
          discountValue,
          title: `${discountValue}% off for ${segment.replace(/_/g, ' ')}`,
        },
      };
    });

    res.json({
      targeting: segments.slice(0, 8),
      aiNote: 'Demo AI segments by recency and order count. Apply as targeted coupon codes.',
    });
  } catch (e) {
    next(e);
  }
}

export async function listCampaigns(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const restaurantId = await requireApprovedRestaurantId(req.user!.sub);
    const now = new Date();
    const campaigns = await ShopOffer.find({
      restaurantId,
      campaignType: { $in: ['happy_hour', 'festival'] },
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    })
      .sort({ startDate: -1 })
      .lean();

    res.json({
      campaigns: campaigns.map((c) => ({
        id: c._id.toString(),
        title: c.title,
        code: c.code,
        campaignType: c.campaignType,
        festivalName: c.festivalName,
        happyHourStart: c.happyHourStart,
        happyHourEnd: c.happyHourEnd,
        offerType: c.offerType,
        discountValue: c.discountValue,
        isActive: c.isActive,
        startDate: c.startDate,
        endDate: c.endDate,
      })),
    });
  } catch (e) {
    next(e);
  }
}
