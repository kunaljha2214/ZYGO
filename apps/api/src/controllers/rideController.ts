import createError from 'http-errors';
import { validationResult } from 'express-validator';
import type { Response, NextFunction } from 'express';
import type { AuthedRequest } from '../middleware/auth';
import { RideBooking } from '../models/RideBooking';
import { computeFare, estimateDurationMin, haversineKm } from '../utils/geo';
import { fetchMapboxDrivingRoute } from '../services/mapboxDirections';
import { getVehicleType } from '../config/app';
import { startRideDispatch, clearRideDispatch } from '../services/rideAssignmentEngine';
import { notifyRideStakeholdersOnCustomerCancel } from '../services/rideNotifications';
import { syncDriverBusyState } from '../services/driverAvailability';
import {
  getCaptainContactForCustomer,
  getCaptainDisplayName,
} from '../services/ridePeerContact';
import {
  createRidePaymentCheckout,
  syncLegacyRidePaymentStatus,
  verifyRidePayment,
} from '../services/ridePayment';

export async function estimateRide(
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
    const { pickup, drop, vehicleType } = req.body as {
      pickup: { coordinates: { lat: number; lng: number } };
      drop: { coordinates: { lat: number; lng: number } };
      vehicleType: string;
    };
    if (!getVehicleType(vehicleType)) {
      next(createError(400, 'Invalid vehicle type'));
      return;
    }
    const mapbox = await fetchMapboxDrivingRoute(pickup.coordinates, drop.coordinates);
    const distanceKm = mapbox
      ? mapbox.distanceKm
      : Math.round(haversineKm(pickup.coordinates, drop.coordinates) * 100) / 100;
    const durationMin = mapbox ? mapbox.durationMin : estimateDurationMin(distanceKm);
    const { fare } = computeFare(vehicleType, distanceKm, durationMin);
    res.json({ distanceKm, durationMin, fare, routeSource: mapbox ? 'mapbox' : 'estimate' });
  } catch (e) {
    next(e);
  }
}

export async function createRide(
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
    const { pickup, drop, vehicleType } = req.body as {
      pickup: { label?: string; line1: string; coordinates: { lat: number; lng: number } };
      drop: { label?: string; line1: string; coordinates: { lat: number; lng: number } };
      vehicleType: string;
    };
    if (!getVehicleType(vehicleType)) {
      next(createError(400, 'Invalid vehicle type'));
      return;
    }
    const mapbox = await fetchMapboxDrivingRoute(pickup.coordinates, drop.coordinates);
    const distanceKm = mapbox
      ? mapbox.distanceKm
      : Math.round(haversineKm(pickup.coordinates, drop.coordinates) * 100) / 100;
    const durationMin = mapbox ? mapbox.durationMin : estimateDurationMin(distanceKm);
    const { fare } = computeFare(vehicleType, distanceKm, durationMin);

    const platformFee = Math.round(fare * 0.17);
    const driverEarned = Math.max(0, fare - platformFee);

    const ride = await RideBooking.create({
      userId: req.user.sub,
      pickup: {
        label: pickup.label || '',
        line1: pickup.line1,
        coordinates: pickup.coordinates,
      },
      drop: {
        label: drop.label || '',
        line1: drop.line1,
        coordinates: drop.coordinates,
      },
      vehicleType,
      distanceKm,
      durationMin,
      fare,
      platformFee,
      driverEarned,
      estimatedDriverEarnings: driverEarned,
      status: 'requested',
      assignmentState: 'none',
      rejectedDriverIds: [],
    });

    void startRideDispatch(ride._id.toString());

    res.status(201).json(formatRide(ride));
  } catch (e) {
    next(e);
  }
}

export async function listRides(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      next(createError(401));
      return;
    }
    const rides = await RideBooking.find({ userId: req.user.sub }).sort({ createdAt: -1 }).lean();
    res.json(rides.map(formatRideLean));
  } catch (e) {
    next(e);
  }
}

export async function getRide(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      next(createError(401));
      return;
    }
    const ride = await RideBooking.findOne({
      _id: req.params.id,
      userId: req.user.sub,
    });
    if (!ride) {
      next(createError(404));
      return;
    }
    await syncLegacyRidePaymentStatus(ride);
    const captain = await getCaptainDisplayName(ride.captainId);
    res.json({
      ...formatRideLean(ride.toObject() as unknown as Record<string, unknown>),
      captain,
    });
  } catch (e) {
    next(e);
  }
}

export async function getRideContact(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      next(createError(401));
      return;
    }
    const contact = await getCaptainContactForCustomer(req.params.id, req.user.sub);
    res.json(contact);
  } catch (e) {
    next(e);
  }
}

export async function checkoutRidePayment(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      next(createError(401));
      return;
    }
    const checkout = await createRidePaymentCheckout(req.params.id, req.user.sub);
    res.status(201).json(checkout);
  } catch (e) {
    next(e);
  }
}

export async function verifyRidePaymentHandler(
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
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body as {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    };
    const ride = await verifyRidePayment(
      req.user.sub,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );
    const captain = await getCaptainDisplayName(ride.captainId);
    res.json({
      ...formatRideLean(ride.toObject() as unknown as Record<string, unknown>),
      captain,
    });
  } catch (e) {
    next(e);
  }
}

export async function cancelRide(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      next(createError(401));
      return;
    }
    const ride = await RideBooking.findOne({
      _id: req.params.id,
      userId: req.user.sub,
    });
    if (!ride) {
      next(createError(404));
      return;
    }
    if (ride.status === 'in_progress' || ride.status === 'completed') {
      next(createError(400, 'Cannot cancel ride in this state'));
      return;
    }
    clearRideDispatch(ride._id.toString());
    if (ride.captainId) {
      await syncDriverBusyState(ride.captainId.toString());
    }
    ride.status = 'cancelled';
    ride.assignmentState = 'none';
    ride.pendingDriverId = null;
    await ride.save();
    await notifyRideStakeholdersOnCustomerCancel(ride);
    res.json(formatRide(ride));
  } catch (e) {
    next(e);
  }
}

function formatRide(doc: InstanceType<typeof RideBooking>) {
  const r = doc.toObject();
  return formatRideLean(r as unknown as Record<string, unknown>);
}

function formatRideLean(r: Record<string, unknown>) {
  return {
    id: r._id,
    type: 'ride' as const,
    pickup: r.pickup,
    drop: r.drop,
    vehicleType: r.vehicleType,
    distanceKm: r.distanceKm,
    durationMin: r.durationMin,
    fare: r.fare,
    platformFee: r.platformFee ?? 0,
    driverEarned: r.driverEarned ?? 0,
    surgeMultiplier: r.surgeMultiplier ?? 1,
    tollCharges: r.tollCharges ?? 0,
    status: r.status,
    paymentStatus: (r.paymentStatus as string | undefined) ?? 'pending',
    paidAt: r.paidAt,
    captainId: r.captainId,
    driverLastLocation: r.driverLastLocation,
    createdAt: r.createdAt,
  };
}
