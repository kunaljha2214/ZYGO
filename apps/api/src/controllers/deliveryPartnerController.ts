import createError from 'http-errors';
import { validationResult } from 'express-validator';
import type { Response, NextFunction } from 'express';
import type { AuthedRequest } from '../middleware/auth';
import { User } from '../models/User';
import { FoodOrder, type DeliveryPartnerStatus } from '../models/FoodOrder';
import { DeliveryPartnerProfile } from '../models/DeliveryPartnerProfile';
import { DeliveryEarning } from '../models/DeliveryEarning';
import { Restaurant } from '../models/Restaurant';
import { settleFoodOrderOnDelivered } from '../services/orderSettlement';
import {
  acceptDeliveryRequest,
  getPendingRequestForPartner,
  rejectDeliveryRequest,
  startDeliveryDispatch,
} from '../services/deliveryAssignmentEngine';
import { haversineKm } from '../utils/geo';
import { saveBase64Document } from '../utils/uploads';
import { emitToOrder, emitToUser } from '../socket/io';
import {
  getCustomerContactForDeliveryPartner,
  getCustomerDisplayName,
} from '../services/orderPeerContact';

const DOC_TYPES = ['aadhaar', 'pan', 'driving_license', 'rc', 'profile_photo'] as const;

async function getProfile(partnerId: string) {
  let profile = await DeliveryPartnerProfile.findOne({ partnerId });
  if (!profile) {
    profile = await DeliveryPartnerProfile.create({ partnerId });
  }
  return profile;
}

function serializeProfile(
  profile: InstanceType<typeof DeliveryPartnerProfile>,
  user: InstanceType<typeof User>
) {
  return {
    partnerId: profile.partnerId.toString(),
    name: user.name,
    phone: user.phone,
    approvalStatus: profile.approvalStatus,
    rejectionReason: profile.rejectionReason,
    submittedAt: profile.submittedAt,
    documents: {
      aadhaar: !!profile.aadhaarDocument,
      pan: !!profile.panDocument,
      drivingLicense: !!profile.drivingLicenseDocument,
      rc: !!profile.rcDocument,
      profilePhoto: !!profile.profilePhotoDocument,
    },
    rating: profile.rating,
    totalDeliveries: profile.totalDeliveries,
    acceptanceRate: profile.acceptanceRate,
    cancellationRate: profile.cancellationRate,
    onTimeRate: profile.onTimeRate,
    wallet: {
      pending: profile.walletPending,
      totalEarned: profile.walletTotalEarned,
    },
    isOnline: user.isDeliveryOnline ?? false,
    isBusy: user.isDeliveryBusy ?? false,
  };
}

export async function getMyProfile(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const user = await User.findById(req.user!.sub);
    if (!user) {
      next(createError(404));
      return;
    }
    const profile = await getProfile(user._id.toString());
    res.json({ profile: serializeProfile(profile, user) });
  } catch (e) {
    next(e);
  }
}

export async function uploadDocument(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      next(createError(400, errors.array()[0].msg));
      return;
    }
    const type = req.body.type as (typeof DOC_TYPES)[number];
    const profile = await getProfile(req.user!.sub);
    const saved = await saveBase64Document(req.body.dataUrl, type, 'delivery-docs');
    const ref = {
      fileName: saved.fileName,
      mimeType: saved.mimeType,
      url: saved.url,
      uploadedAt: new Date(),
    };
    switch (type) {
      case 'aadhaar':
        profile.aadhaarDocument = ref;
        break;
      case 'pan':
        profile.panDocument = ref;
        break;
      case 'driving_license':
        profile.drivingLicenseDocument = ref;
        break;
      case 'rc':
        profile.rcDocument = ref;
        break;
      case 'profile_photo':
        profile.profilePhotoDocument = ref;
        break;
    }
    await profile.save();
    const user = await User.findById(req.user!.sub);
    res.json({ profile: serializeProfile(profile, user!) });
  } catch (e) {
    next(e);
  }
}

export async function submitForReview(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const profile = await getProfile(req.user!.sub);
    if (
      !profile.aadhaarDocument ||
      !profile.panDocument ||
      !profile.drivingLicenseDocument ||
      !profile.rcDocument ||
      !profile.profilePhotoDocument
    ) {
      next(createError(400, 'Upload all required documents before submitting'));
      return;
    }
    profile.approvalStatus = 'pending_review';
    profile.submittedAt = new Date();
    await profile.save();
    const user = await User.findById(req.user!.sub);
    res.json({ profile: serializeProfile(profile, user!) });
  } catch (e) {
    next(e);
  }
}

export async function setOnlineStatus(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const profile = await DeliveryPartnerProfile.findOne({ partnerId: req.user!.sub });
    if (!profile || profile.approvalStatus !== 'approved') {
      next(createError(403, 'Complete verification and get admin approval first'));
      return;
    }
    const online = Boolean(req.body.online);
    if (online) {
      const { assertPartnerSubscriptionActive } = await import(
        '../services/partnerSubscription'
      );
      await assertPartnerSubscriptionActive(req.user!.sub, 'delivery_partner');
    }
    const updates: Record<string, unknown> = { isDeliveryOnline: online };
    if (online) {
      const existing = await User.findById(req.user!.sub).lean();
      if (!existing?.currentLocation?.coordinates?.length) {
        updates.currentLocation = { type: 'Point', coordinates: [77.5946, 12.9716] };
      }
    }
    const user = await User.findByIdAndUpdate(req.user!.sub, updates, { new: true });
    res.json({ isOnline: user!.isDeliveryOnline, isBusy: user!.isDeliveryBusy });
  } catch (e) {
    next(e);
  }
}

export async function updateLocation(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const lat = Number(req.body.lat);
    const lng = Number(req.body.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      next(createError(400, 'Invalid coordinates'));
      return;
    }
    await User.findByIdAndUpdate(req.user!.sub, {
      currentLocation: { type: 'Point', coordinates: [lng, lat] },
    });
    const orderId = req.body.orderId as string | undefined;
    if (orderId) {
      await FoodOrder.findByIdAndUpdate(orderId, {
        riderLastLocation: { lat, lng },
      });
      emitToOrder(orderId, 'rider:location', {
        lat,
        lng,
        updatedAt: new Date().toISOString(),
      });
    }
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}

export async function acceptRequest(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const result = await acceptDeliveryRequest(req.params.orderId, req.user!.sub);
    if (!result.ok) {
      next(createError(400, result.message ?? 'Cannot accept request'));
      return;
    }
    const order = await FoodOrder.findById(req.params.orderId).lean();
    res.json({ order: await formatPartnerOrder(order!) });
  } catch (e) {
    next(e);
  }
}

export async function rejectRequest(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    await rejectDeliveryRequest(req.params.orderId, req.user!.sub);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}

const STATUS_FLOW: DeliveryPartnerStatus[] = [
  'accepted',
  'arriving_at_restaurant',
  'picked_up',
  'out_for_delivery',
  'delivered',
];

function nextDeliveryStatus(current: DeliveryPartnerStatus): DeliveryPartnerStatus | null {
  const idx = STATUS_FLOW.indexOf(current);
  if (idx < 0 || idx >= STATUS_FLOW.length - 1) return null;
  return STATUS_FLOW[idx + 1];
}

export async function advanceDeliveryStatus(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const order = await FoodOrder.findOne({
      _id: req.params.orderId,
      deliveryPartnerId: req.user!.sub,
    });
    if (!order) {
      next(createError(404));
      return;
    }
    const target =
      (req.body.status as DeliveryPartnerStatus) || nextDeliveryStatus(order.deliveryStatus);
    if (!target) {
      next(createError(400, 'Cannot advance delivery status'));
      return;
    }

    order.deliveryStatus = target;

    if (target === 'arriving_at_restaurant') {
      /* no customer status change */
    }
    if (target === 'picked_up') {
      order.pickedUpAt = new Date();
      order.status = 'out_for_delivery';
      void emitToOrder(order._id.toString(), 'delivery:picked_up', { orderId: order._id });
    }
    if (target === 'out_for_delivery') {
      order.outForDeliveryAt = new Date();
      order.status = 'out_for_delivery';
    }
    if (target === 'delivered') {
      order.deliveredAt = new Date();
      order.status = 'delivered';
      await settleFoodOrderOnDelivered(order);
    }

    await order.save();
    const payload = {
      orderId: order._id.toString(),
      status: order.status,
      deliveryStatus: order.deliveryStatus,
      deliveryEtaMinutes: order.deliveryEtaMinutes,
    };
    emitToOrder(order._id.toString(), 'delivery:status', payload);
    emitToUser(order.userId.toString(), 'order:updated', payload);

    res.json({ order: await formatPartnerOrder(order.toObject() as unknown as Record<string, unknown>) });
  } catch (e) {
    next(e);
  }
}

async function formatPartnerOrder(o: Record<string, unknown>) {
  const restaurant = o.restaurantId
    ? await Restaurant.findById(o.restaurantId as string).lean()
    : null;
  const customer = await getCustomerDisplayName(o.userId as string);
  return {
    id: String(o._id),
    orderNumber: o.orderNumber,
    status: o.status,
    deliveryStatus: o.deliveryStatus,
    total: o.total,
    items: o.items,
    customerNotes: o.customerNotes,
    deliveryAddress: o.deliveryAddress,
    restaurantName: o.restaurantName ?? restaurant?.name,
    restaurantCoords: o.restaurantCoords ?? {
      lat: restaurant?.location.coordinates[1],
      lng: restaurant?.location.coordinates[0],
    },
    estimatedRiderEarnings: o.estimatedRiderEarnings,
    deliveryEtaMinutes: o.deliveryEtaMinutes,
    createdAt: o.createdAt,
    customer,
  };
}

export async function getDeliveryOrderCustomerContact(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const contact = await getCustomerContactForDeliveryPartner(
      req.params.orderId,
      req.user!.sub
    );
    res.json(contact);
  } catch (e) {
    next(e);
  }
}

export async function getIncomingRequest(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const request = await getPendingRequestForPartner(req.user!.sub);
    res.json({ request });
  } catch (e) {
    next(e);
  }
}

export async function getActiveDelivery(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const order = await FoodOrder.findOne({
      deliveryPartnerId: req.user!.sub,
      status: { $nin: ['delivered', 'cancelled'] },
    }).sort({ updatedAt: -1 });
    if (!order) {
      res.json({ order: null });
      return;
    }
    res.json({ order: await formatPartnerOrder(order.toObject() as unknown as Record<string, unknown>) });
  } catch (e) {
    next(e);
  }
}

export async function getEarningsDashboard(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const partnerId = req.user!.sub;
    const profile = await getProfile(partnerId);
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(dayStart);
    weekStart.setDate(weekStart.getDate() - 7);

    const today = await DeliveryEarning.aggregate([
      { $match: { partnerId: profile.partnerId, createdAt: { $gte: dayStart } } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);
    const week = await DeliveryEarning.aggregate([
      { $match: { partnerId: profile.partnerId, createdAt: { $gte: weekStart } } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);

    res.json({
      todayEarnings: today[0]?.total ?? 0,
      todayDeliveries: today[0]?.count ?? 0,
      weeklyEarnings: week[0]?.total ?? 0,
      weeklyDeliveries: week[0]?.count ?? 0,
      incentives: 0,
      walletPending: profile.walletPending,
      walletTotalEarned: profile.walletTotalEarned,
      rating: profile.rating,
      acceptanceRate: profile.acceptanceRate,
      cancellationRate: profile.cancellationRate,
      onTimeRate: profile.onTimeRate,
    });
  } catch (e) {
    next(e);
  }
}

export async function getDeliveryHistory(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const orders = await FoodOrder.find({
      deliveryPartnerId: req.user!.sub,
      status: 'delivered',
    })
      .sort({ deliveredAt: -1 })
      .limit(50)
      .lean();
    res.json({
      history: orders.map((o) => ({
        id: o._id.toString(),
        orderNumber: o.orderNumber,
        total: o.total,
        earnings: o.estimatedRiderEarnings,
        deliveredAt: o.deliveredAt,
        restaurantName: o.restaurantName,
      })),
    });
  } catch (e) {
    next(e);
  }
}

export async function getWallet(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const profile = await getProfile(req.user!.sub);
    const entries = await DeliveryEarning.find({ partnerId: profile.partnerId })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();
    res.json({
      pending: profile.walletPending,
      totalEarned: profile.walletTotalEarned,
      entries: entries.map((e) => ({
        id: e._id.toString(),
        amount: e.amount,
        type: e.type,
        status: e.status,
        orderNumber: e.orderNumber,
        createdAt: e.createdAt,
      })),
    });
  } catch (e) {
    next(e);
  }
}

export async function listPendingPartners(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const list = await DeliveryPartnerProfile.find({ approvalStatus: 'pending_review' }).lean();
    const users = await User.find({ _id: { $in: list.map((p) => p.partnerId) } }).lean();
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));
    res.json({
      partners: list.map((p) => ({
        id: p._id.toString(),
        partnerId: p.partnerId.toString(),
        name: userMap.get(p.partnerId.toString())?.name,
        phone: userMap.get(p.partnerId.toString())?.phone,
        submittedAt: p.submittedAt,
      })),
    });
  } catch (e) {
    next(e);
  }
}

export async function approvePartner(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const profile = await DeliveryPartnerProfile.findOne({ partnerId: req.params.id });
    if (!profile) {
      next(createError(404));
      return;
    }
    profile.approvalStatus = 'approved';
    profile.adminReviewedAt = new Date();
    await profile.save();
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}

export async function rejectPartner(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const profile = await DeliveryPartnerProfile.findOne({ partnerId: req.params.id });
    if (!profile) {
      next(createError(404));
      return;
    }
    profile.approvalStatus = 'rejected';
    profile.rejectionReason = String(req.body.reason || 'Rejected');
    profile.adminReviewedAt = new Date();
    await profile.save();
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}

/** Dev/admin: trigger dispatch for ready order */
export async function triggerDispatch(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    await startDeliveryDispatch(req.params.orderId);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}
