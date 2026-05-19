import createError from 'http-errors';
import { validationResult } from 'express-validator';
import type { Response, NextFunction } from 'express';
import type { AuthedRequest } from '../middleware/auth';
import { User } from '../models/User';
import { RideBooking, type RideStatus } from '../models/RideBooking';
import { DriverProfile } from '../models/DriverProfile';
import { DriverEarning } from '../models/DriverEarning';
import {
  acceptRideRequest,
  getPendingRequestForDriver,
  rejectRideRequest,
  resumeDispatchForOnlineDriver,
} from '../services/rideAssignmentEngine';
import { saveBase64Document } from '../utils/uploads';
import { emitToUser } from '../socket/io';

const DOC_TYPES = ['aadhaar', 'pan', 'driving_license', 'rc', 'insurance', 'selfie'] as const;

async function getProfile(driverId: string) {
  let profile = await DriverProfile.findOne({ driverId });
  if (!profile) {
    profile = await DriverProfile.create({ driverId });
  }
  return profile;
}

function approvalLabel(status: string): string {
  const map: Record<string, string> = {
    draft: 'DRAFT',
    pending: 'PENDING',
    approved: 'APPROVED',
    rejected: 'REJECTED',
    blocked: 'BLOCKED',
  };
  return map[status] ?? status.toUpperCase();
}

function serializeProfile(
  profile: InstanceType<typeof DriverProfile>,
  user: InstanceType<typeof User>
) {
  return {
    driverId: profile.driverId.toString(),
    name: user.name,
    phone: user.phone,
    vehicleType: user.driverVehicleType,
    vehicleModel: profile.vehicleModel,
    vehicleNumber: profile.vehicleNumber,
    approvalStatus: profile.approvalStatus,
    approvalLabel: approvalLabel(profile.approvalStatus),
    rejectionReason: profile.rejectionReason,
    submittedAt: profile.submittedAt,
    documents: {
      aadhaar: !!profile.aadhaarDocument,
      pan: !!profile.panDocument,
      drivingLicense: !!profile.drivingLicenseDocument,
      rc: !!profile.rcDocument,
      insurance: !!profile.insuranceDocument,
      selfie: !!profile.selfieDocument,
    },
    rating: profile.rating,
    totalRides: profile.totalRides,
    acceptanceRate: profile.acceptanceRate,
    cancellationRate: profile.cancellationRate,
    completionRate: profile.completionRate,
    wallet: {
      pending: profile.walletPending,
      totalEarned: profile.walletTotalEarned,
      withdrawable: profile.walletPending,
    },
    isOnline: user.isDriverOnline ?? false,
    isBusy: user.isDriverBusy ?? false,
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

export async function updateVehicle(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const profile = await getProfile(req.user!.sub);
    if (req.body.vehicleModel) profile.vehicleModel = String(req.body.vehicleModel).trim();
    if (req.body.vehicleNumber) profile.vehicleNumber = String(req.body.vehicleNumber).trim();
    await profile.save();
    const user = await User.findById(req.user!.sub);
    res.json({ profile: serializeProfile(profile, user!) });
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
    const saved = saveBase64Document(req.body.dataUrl, type);
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
      case 'insurance':
        profile.insuranceDocument = ref;
        break;
      case 'selfie':
        profile.selfieDocument = ref;
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
    if (!profile.vehicleModel?.trim() || !profile.vehicleNumber?.trim()) {
      next(createError(400, 'Enter vehicle model and number'));
      return;
    }
    if (
      !profile.aadhaarDocument ||
      !profile.panDocument ||
      !profile.drivingLicenseDocument ||
      !profile.rcDocument ||
      !profile.selfieDocument
    ) {
      next(createError(400, 'Upload all required documents before submitting'));
      return;
    }
    profile.approvalStatus = 'pending';
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
    const profile = await DriverProfile.findOne({ driverId: req.user!.sub });
    if (!profile) {
      next(createError(403, 'Complete verification first'));
      return;
    }
    if (profile.approvalStatus === 'blocked') {
      next(createError(403, 'Your account is blocked'));
      return;
    }
    if (profile.approvalStatus !== 'approved') {
      next(createError(403, 'Complete verification and get admin approval first'));
      return;
    }
    const online = Boolean(req.body.online);
    const updates: Record<string, unknown> = { isDriverOnline: online };
    if (online) {
      const existing = await User.findById(req.user!.sub).lean();
      if (!existing?.currentLocation?.coordinates?.length) {
        updates.currentLocation = { type: 'Point', coordinates: [77.5946, 12.9716] };
      }
    }
    const user = await User.findByIdAndUpdate(req.user!.sub, updates, { new: true });

    let incomingRequest = null;
    if (online) {
      await resumeDispatchForOnlineDriver(req.user!.sub);
      incomingRequest = await getPendingRequestForDriver(req.user!.sub);
    }

    res.json({
      isOnline: user!.isDriverOnline,
      isBusy: user!.isDriverBusy,
      incomingRequest,
    });
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
    const rideId = req.body.rideId as string | undefined;
    if (rideId) {
      await RideBooking.findByIdAndUpdate(rideId, {
        driverLastLocation: { lat, lng },
      });
      const ride = await RideBooking.findById(rideId).lean();
      if (ride) {
        emitToUser(ride.userId.toString(), 'driver:location', {
          lat,
          lng,
          rideId,
          updatedAt: new Date().toISOString(),
        });
      }
    }
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}

export async function acceptRequest(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const result = await acceptRideRequest(req.params.rideId, req.user!.sub);
    if (!result.ok) {
      next(createError(400, result.message ?? 'Cannot accept request'));
      return;
    }
    const ride = await RideBooking.findById(req.params.rideId).lean();
    res.json({ ride: formatDriverRide(ride!) });
  } catch (e) {
    next(e);
  }
}

export async function rejectRequest(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    await rejectRideRequest(req.params.rideId, req.user!.sub);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}

const STATUS_FLOW: RideStatus[] = ['assigned', 'arriving', 'arrived', 'in_progress', 'completed'];

function nextRideStatus(current: RideStatus): RideStatus | null {
  const idx = STATUS_FLOW.indexOf(current);
  if (idx < 0 || idx >= STATUS_FLOW.length - 1) return null;
  return STATUS_FLOW[idx + 1];
}

export async function advanceRideStatus(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const ride = await RideBooking.findOne({
      _id: req.params.rideId,
      captainId: req.user!.sub,
    });
    if (!ride) {
      next(createError(404));
      return;
    }
    const target = (req.body.status as RideStatus) || nextRideStatus(ride.status);
    if (!target || !STATUS_FLOW.includes(target)) {
      next(createError(400, 'Cannot advance ride status'));
      return;
    }

    ride.status = target;

    if (target === 'completed') {
      const driverEarned = ride.driverEarned || Math.max(0, ride.fare - ride.platformFee);
      await DriverEarning.create({
        driverId: ride.captainId!,
        rideId: ride._id,
        amount: ride.fare,
        platformFee: ride.platformFee,
        driverEarned,
        type: 'ride',
        status: 'pending',
      });
      const profile = await DriverProfile.findOne({ driverId: req.user!.sub });
      if (profile) {
        profile.walletPending += driverEarned;
        profile.walletTotalEarned += driverEarned;
        profile.totalRides += 1;
        await profile.save();
      }
      await User.findByIdAndUpdate(req.user!.sub, {
        isDriverBusy: false,
        activeRideId: null,
      });
    }

    await ride.save();

    const payload = {
      rideId: ride._id.toString(),
      status: ride.status,
      driverLastLocation: ride.driverLastLocation,
    };
    emitToUser(ride.userId.toString(), 'ride:status', payload);

    res.json({ ride: formatDriverRide(ride.toObject() as unknown as Record<string, unknown>) });
  } catch (e) {
    next(e);
  }
}

function formatDriverRide(r: Record<string, unknown>) {
  return {
    id: String(r._id),
    pickup: r.pickup,
    drop: r.drop,
    vehicleType: r.vehicleType,
    distanceKm: r.distanceKm,
    durationMin: r.durationMin,
    fare: r.fare,
    platformFee: r.platformFee,
    driverEarned: r.driverEarned,
    surgeMultiplier: r.surgeMultiplier,
    tollCharges: r.tollCharges,
    status: r.status,
    estimatedDriverEarnings: r.estimatedDriverEarnings,
    createdAt: r.createdAt,
  };
}

export async function getIncomingRequest(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const user = await User.findById(req.user!.sub).lean();
    if (user?.isDriverOnline) {
      await resumeDispatchForOnlineDriver(req.user!.sub);
    }
    const request = await getPendingRequestForDriver(req.user!.sub);
    res.json({ request });
  } catch (e) {
    next(e);
  }
}

export async function getActiveRide(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const ride = await RideBooking.findOne({
      captainId: req.user!.sub,
      status: { $nin: ['completed', 'cancelled'] },
    }).sort({ updatedAt: -1 });
    if (!ride) {
      res.json({ ride: null });
      return;
    }
    res.json({ ride: formatDriverRide(ride.toObject() as unknown as Record<string, unknown>) });
  } catch (e) {
    next(e);
  }
}

export async function getEarningsDashboard(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const driverId = req.user!.sub;
    const profile = await getProfile(driverId);
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(dayStart);
    weekStart.setDate(weekStart.getDate() - 7);

    const today = await DriverEarning.aggregate([
      { $match: { driverId: profile.driverId, createdAt: { $gte: dayStart } } },
      { $group: { _id: null, total: { $sum: '$driverEarned' }, count: { $sum: 1 } } },
    ]);
    const week = await DriverEarning.aggregate([
      { $match: { driverId: profile.driverId, createdAt: { $gte: weekStart } } },
      { $group: { _id: null, total: { $sum: '$driverEarned' }, count: { $sum: 1 } } },
    ]);

    res.json({
      todayEarnings: today[0]?.total ?? 0,
      todayRides: today[0]?.count ?? 0,
      weeklyEarnings: week[0]?.total ?? 0,
      weeklyRides: week[0]?.count ?? 0,
      onlineHours: profile.onlineHoursToday,
      incentives: 0,
      incentiveProgress: Math.min(100, (today[0]?.count ?? 0) * 20),
      walletPending: profile.walletPending,
      walletTotalEarned: profile.walletTotalEarned,
      rating: profile.rating,
      acceptanceRate: profile.acceptanceRate,
      cancellationRate: profile.cancellationRate,
      completionRate: profile.completionRate,
    });
  } catch (e) {
    next(e);
  }
}

export async function getRideHistory(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const rides = await RideBooking.find({
      captainId: req.user!.sub,
      status: 'completed',
    })
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean();
    res.json({
      history: rides.map((r) => ({
        id: r._id.toString(),
        pickup: r.pickup.line1,
        drop: r.drop.line1,
        fare: r.fare,
        driverEarned: r.driverEarned,
        distanceKm: r.distanceKm,
        customerRating: r.customerRating,
        completedAt: r.updatedAt,
      })),
    });
  } catch (e) {
    next(e);
  }
}

export async function getWallet(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const profile = await getProfile(req.user!.sub);
    const entries = await DriverEarning.find({ driverId: profile.driverId })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();
    res.json({
      pending: profile.walletPending,
      withdrawable: profile.walletPending,
      totalEarned: profile.walletTotalEarned,
      entries: entries.map((e) => ({
        id: e._id.toString(),
        amount: e.amount,
        platformFee: e.platformFee,
        driverEarned: e.driverEarned,
        type: e.type,
        status: e.status,
        createdAt: e.createdAt,
      })),
    });
  } catch (e) {
    next(e);
  }
}

export async function listPendingDrivers(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const list = await DriverProfile.find({ approvalStatus: 'pending' }).lean();
    const users = await User.find({ _id: { $in: list.map((p) => p.driverId) } }).lean();
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));
    res.json({
      drivers: list.map((p) => ({
        id: p._id.toString(),
        driverId: p.driverId.toString(),
        name: userMap.get(p.driverId.toString())?.name,
        phone: userMap.get(p.driverId.toString())?.phone,
        vehicleModel: p.vehicleModel,
        vehicleNumber: p.vehicleNumber,
        submittedAt: p.submittedAt,
      })),
    });
  } catch (e) {
    next(e);
  }
}

export async function approveDriver(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const profile = await DriverProfile.findOne({ driverId: req.params.id });
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

export async function rejectDriver(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const profile = await DriverProfile.findOne({ driverId: req.params.id });
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

export async function blockDriver(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const profile = await DriverProfile.findOne({ driverId: req.params.id });
    if (!profile) {
      next(createError(404));
      return;
    }
    profile.approvalStatus = 'blocked';
    profile.adminReviewedAt = new Date();
    await profile.save();
    await User.findByIdAndUpdate(req.params.id, { isDriverOnline: false });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}
