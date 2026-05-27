import createError from 'http-errors';
import { validationResult } from 'express-validator';
import type { Response, NextFunction } from 'express';
import type { AuthedRequest } from '../middleware/auth';
import {
  OwnerRestaurant,
  type FoodServiceType,
  type IOpeningHour,
} from '../models/OwnerRestaurant';
import { Restaurant } from '../models/Restaurant';
import { MenuItem } from '../models/MenuItem';
import { User } from '../models/User';
import { RestaurantEarning } from '../models/RestaurantEarning';
import { saveBase64Document } from '../utils/uploads';
import { buildCustomerVisibilityPreview } from '../services/restaurantCustomerVisibility';

const PENDING_APPROVAL_MSG = 'Your shop is still pending for approval';

async function getApprovedRegistration(ownerId: string) {
  return OwnerRestaurant.findOne({ ownerId, approvalStatus: 'approved' });
}

function serializeMenuItem(doc: InstanceType<typeof MenuItem>) {
  return {
    id: doc.id,
    name: doc.name,
    price: doc.price,
    category: doc.category,
    isVeg: doc.isVeg,
    isAvailable: doc.isAvailable,
  };
}

const DEFAULT_MAP_LAT = 12.9716;
const DEFAULT_MAP_LNG = 77.5946;

const DEFAULT_HOURS: IOpeningHour[] = [0, 1, 2, 3, 4, 5, 6].map((day) => ({
  day,
  open: '09:00',
  close: '22:00',
  closed: false,
}));

export function serializeOwnerRestaurant(doc: InstanceType<typeof OwnerRestaurant>) {
  return {
    id: doc.id,
    name: doc.name,
    address: doc.address,
    location: doc.location,
    cuisine: doc.cuisine,
    foodType: doc.foodType,
    openingHours: doc.openingHours,
    gstNumber: doc.gstNumber,
    panNumber: doc.panNumber,
    fssaiNumber: doc.fssaiNumber,
    gstDocument: doc.gstDocument ?? null,
    panDocument: doc.panDocument ?? null,
    fssaiDocument: doc.fssaiDocument ?? null,
    coverPhotoUrl: doc.coverPhotoUrl ?? null,
    bankDetails: doc.bankDetails,
    kycStatus: doc.kycStatus,
    approvalStatus: doc.approvalStatus,
    rejectionReason: doc.rejectionReason ?? null,
    submittedAt: doc.submittedAt ?? null,
    adminReviewedAt: doc.adminReviewedAt ?? null,
    restaurantListingId: doc.restaurantListingId?.toString() ?? null,
    walletPending: doc.walletPending ?? 0,
    walletTotalEarned: doc.walletTotalEarned ?? 0,
    createdAt: (doc as { createdAt?: Date }).createdAt ?? null,
    updatedAt: (doc as { updatedAt?: Date }).updatedAt ?? null,
  };
}

export async function getMyRestaurant(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const doc = await OwnerRestaurant.findOne({ ownerId: req.user!.sub });
    if (!doc) {
      res.json({ registration: null });
      return;
    }
    res.json({ registration: serializeOwnerRestaurant(doc) });
  } catch (e) {
    next(e);
  }
}

export async function upsertMyRestaurant(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let doc = await OwnerRestaurant.findOne({ ownerId: req.user!.sub });
    if (doc && !['draft', 'rejected'].includes(doc.approvalStatus)) {
      next(createError(409, 'Registration cannot be edited while under review or approved'));
      return;
    }

    const body = req.body as {
      name?: string;
      address?: {
        line1?: string;
        line2?: string;
        city?: string;
        state?: string;
        pincode?: string;
      };
      lat?: number;
      lng?: number;
      cuisine?: string[];
      foodType?: FoodServiceType;
      openingHours?: IOpeningHour[];
      gstNumber?: string;
      panNumber?: string;
      fssaiNumber?: string;
      bankDetails?: {
        accountHolderName?: string;
        accountNumber?: string;
        ifsc?: string;
        bankName?: string;
      };
    };

    const name = body.name?.trim() || doc?.name || '';
    if (!name) {
      next(createError(400, 'Restaurant name is required'));
      return;
    }

    const cuisine =
      body.cuisine && body.cuisine.length > 0
        ? body.cuisine.map((c) => c.trim()).filter(Boolean)
        : doc?.cuisine ?? [];
    if (cuisine.length === 0) {
      next(createError(400, 'Select at least one cuisine type'));
      return;
    }

    const foodType = body.foodType ?? doc?.foodType ?? 'both';
    const lat = body.lat ?? doc?.location?.coordinates[1] ?? DEFAULT_MAP_LAT;
    const lng = body.lng ?? doc?.location?.coordinates[0] ?? DEFAULT_MAP_LNG;

    const payload = {
      ownerId: req.user!.sub,
      name,
      address: {
        line1: body.address?.line1?.trim() ?? doc?.address?.line1 ?? '',
        line2: body.address?.line2?.trim() ?? doc?.address?.line2 ?? '',
        city: body.address?.city?.trim() ?? doc?.address?.city ?? 'Bengaluru',
        state: body.address?.state?.trim() ?? doc?.address?.state ?? 'Karnataka',
        pincode: body.address?.pincode?.trim() ?? doc?.address?.pincode ?? '',
      },
      location: {
        type: 'Point' as const,
        coordinates: [lng, lat] as [number, number],
      },
      cuisine,
      foodType,
      openingHours:
        body.openingHours && body.openingHours.length > 0
          ? body.openingHours
          : doc?.openingHours?.length
            ? doc.openingHours
            : DEFAULT_HOURS,
      gstNumber: body.gstNumber?.trim() ?? doc?.gstNumber ?? '',
      panNumber: body.panNumber?.trim() ?? doc?.panNumber ?? '',
      fssaiNumber: body.fssaiNumber?.trim() ?? doc?.fssaiNumber ?? '',
      bankDetails: {
        accountHolderName:
          body.bankDetails?.accountHolderName?.trim() ?? doc?.bankDetails?.accountHolderName ?? '',
        accountNumber:
          body.bankDetails?.accountNumber?.trim() ?? doc?.bankDetails?.accountNumber ?? '',
        ifsc: body.bankDetails?.ifsc?.trim().toUpperCase() ?? doc?.bankDetails?.ifsc ?? '',
        bankName: body.bankDetails?.bankName?.trim() ?? doc?.bankDetails?.bankName ?? '',
      },
    };

    if (doc) {
      Object.assign(doc, payload);
      if (doc.approvalStatus === 'rejected') {
        doc.approvalStatus = 'draft';
        doc.rejectionReason = null;
        doc.kycStatus = 'pending';
      }
      await doc.save();
    } else {
      doc = await OwnerRestaurant.create({
        ...payload,
        approvalStatus: 'draft',
        kycStatus: 'pending',
      });
    }

    res.json({ registration: serializeOwnerRestaurant(doc) });
  } catch (e) {
    next(e);
  }
}

export async function uploadCoverPhoto(
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

    const doc = await OwnerRestaurant.findOne({ ownerId: req.user!.sub });
    if (!doc) {
      next(createError(404, 'Save restaurant details before uploading a cover photo'));
      return;
    }
    if (!['draft', 'rejected'].includes(doc.approvalStatus)) {
      next(createError(409, 'Cover photo cannot be changed while under review'));
      return;
    }

    const dataUrl = String((req.body as { dataUrl?: string }).dataUrl ?? '').trim();
    const saved = await saveBase64Document(dataUrl, 'cover', 'restaurant');
    doc.coverPhotoUrl = saved.url;
    await doc.save();

    if (doc.restaurantListingId) {
      await Restaurant.findByIdAndUpdate(doc.restaurantListingId, { image: saved.url });
    }

    res.json({ registration: serializeOwnerRestaurant(doc) });
  } catch (e) {
    next(e instanceof Error ? createError(400, e.message) : e);
  }
}

export async function uploadDocument(
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

    const doc = await OwnerRestaurant.findOne({ ownerId: req.user!.sub });
    if (!doc) {
      next(createError(404, 'Save restaurant details before uploading documents'));
      return;
    }
    if (!['draft', 'rejected'].includes(doc.approvalStatus)) {
      next(createError(409, 'Documents cannot be changed while under review'));
      return;
    }

    const { type, dataUrl, fileName } = req.body as {
      type: 'gst' | 'pan' | 'fssai';
      dataUrl: string;
      fileName?: string;
    };

    const saved = await saveBase64Document(dataUrl, type, 'shop-docs');
    const ref = {
      fileName: fileName?.trim() || saved.fileName,
      mimeType: saved.mimeType,
      url: saved.url,
      uploadedAt: new Date(),
    };

    if (type === 'gst') doc.gstDocument = ref;
    if (type === 'pan') doc.panDocument = ref;
    if (type === 'fssai') doc.fssaiDocument = ref;
    await doc.save();

    res.json({ registration: serializeOwnerRestaurant(doc) });
  } catch (e) {
    next(e instanceof Error ? createError(400, e.message) : e);
  }
}

function validateReadyToSubmit(doc: InstanceType<typeof OwnerRestaurant>): string | null {
  if (!doc.name.trim()) return 'Restaurant name is required';
  if (!doc.address.line1.trim()) return 'Street address is required';
  if (doc.address.pincode.trim().length !== 6) return 'Enter a valid 6-digit pincode';
  if (!doc.cuisine.length) return 'Select at least one cuisine type';
  if (!doc.gstNumber.trim()) return 'GST number is required';
  if (!doc.panNumber.trim()) return 'PAN number is required';
  if (!doc.fssaiNumber.trim()) return 'FSSAI license number is required';
  if (!doc.gstDocument) return 'GST document upload is required';
  if (!doc.panDocument) return 'PAN document upload is required';
  if (!doc.fssaiDocument) return 'FSSAI document upload is required';
  const bank = doc.bankDetails;
  if (!bank.accountHolderName.trim()) return 'Bank account holder name is required';
  if (!bank.accountNumber.trim()) return 'Bank account number is required';
  if (!bank.ifsc.trim()) return 'Bank IFSC is required';
  if (!bank.bankName.trim()) return 'Bank name is required';
  return null;
}

export async function submitForReview(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const doc = await OwnerRestaurant.findOne({ ownerId: req.user!.sub });
    if (!doc) {
      next(createError(404, 'Complete restaurant registration first'));
      return;
    }
    if (!['draft', 'rejected'].includes(doc.approvalStatus)) {
      next(createError(409, 'Already submitted or approved'));
      return;
    }

    const err = validateReadyToSubmit(doc);
    if (err) {
      next(createError(400, err));
      return;
    }

    doc.approvalStatus = 'pending_review';
    doc.kycStatus = 'submitted';
    doc.submittedAt = new Date();
    doc.rejectionReason = null;
    await doc.save();

    res.json({ registration: serializeOwnerRestaurant(doc) });
  } catch (e) {
    next(e);
  }
}

export async function listPendingRegistrations(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    void req;
    const list = await OwnerRestaurant.find({ approvalStatus: 'pending_review' })
      .sort({ submittedAt: 1 })
      .lean();

    const ownerIds = list.map((r) => r.ownerId);
    const owners = await User.find({ _id: { $in: ownerIds } })
      .select('name phone email')
      .lean();
    const ownerMap = new Map(owners.map((o) => [o._id.toString(), o]));

    res.json(
      list.map((r) => {
        const owner = ownerMap.get(r.ownerId.toString());
        return {
          id: r._id,
          ownerId: r.ownerId,
          ownerName: owner?.name ?? 'Unknown',
          ownerPhone: owner?.phone ?? '',
          ownerEmail: owner?.email ?? '',
          name: r.name,
          foodType: r.foodType,
          cuisine: r.cuisine,
          address: r.address,
          gstNumber: r.gstNumber,
          panNumber: r.panNumber,
          fssaiNumber: r.fssaiNumber,
          submittedAt: r.submittedAt,
          kycStatus: r.kycStatus,
        };
      })
    );
  } catch (e) {
    next(e);
  }
}

export async function listMyMenuItems(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const reg = await OwnerRestaurant.findOne({ ownerId: req.user!.sub });
    if (!reg) {
      res.json({ approved: false, message: PENDING_APPROVAL_MSG, items: [] });
      return;
    }
    if (reg.approvalStatus !== 'approved' || !reg.restaurantListingId) {
      res.json({
        approved: false,
        approvalStatus: reg.approvalStatus,
        message: PENDING_APPROVAL_MSG,
        items: [],
      });
      return;
    }
    const items = await MenuItem.find({ restaurantId: reg.restaurantListingId }).sort({
      category: 1,
      name: 1,
    });
    res.json({
      approved: true,
      restaurantId: reg.restaurantListingId.toString(),
      items: items.map((m) => serializeMenuItem(m)),
    });
  } catch (e) {
    next(e);
  }
}

export async function createMenuItem(
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

    const reg = await getApprovedRegistration(req.user!.sub);
    if (!reg?.restaurantListingId) {
      next(createError(403, PENDING_APPROVAL_MSG));
      return;
    }

    const body = req.body as {
      name: string;
      price: number;
      category?: string;
      isVeg?: boolean;
    };

    const item = await MenuItem.create({
      restaurantId: reg.restaurantListingId,
      name: body.name.trim(),
      price: body.price,
      category: body.category?.trim() || 'General',
      isVeg: body.isVeg ?? true,
      isAvailable: true,
    });

    res.status(201).json({ item: serializeMenuItem(item) });
  } catch (e) {
    next(e);
  }
}

export async function deleteMenuItem(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const reg = await getApprovedRegistration(req.user!.sub);
    if (!reg?.restaurantListingId) {
      next(createError(403, PENDING_APPROVAL_MSG));
      return;
    }

    const item = await MenuItem.findOne({
      _id: req.params.itemId,
      restaurantId: reg.restaurantListingId,
    });
    if (!item) {
      next(createError(404, 'Menu item not found'));
      return;
    }
    await MenuItem.deleteOne({ _id: item._id });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}

export async function approveRegistration(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const doc = await OwnerRestaurant.findById(req.params.id);
    if (!doc) {
      next(createError(404, 'Registration not found'));
      return;
    }
    if (doc.approvalStatus !== 'pending_review') {
      next(createError(409, 'Registration is not pending review'));
      return;
    }

    let listing = doc.restaurantListingId
      ? await Restaurant.findById(doc.restaurantListingId)
      : null;

    if (!listing) {
      listing = await Restaurant.create({
        name: doc.name,
        image: doc.coverPhotoUrl ?? '',
        cuisine: doc.cuisine,
        rating: 4.0,
        location: doc.location,
        isActive: true,
        isAcceptingOrders: true,
        ownerId: doc.ownerId,
      });
      doc.restaurantListingId = listing._id;
    } else {
      listing.name = doc.name;
      if (doc.coverPhotoUrl) listing.image = doc.coverPhotoUrl;
      listing.cuisine = doc.cuisine;
      listing.location = doc.location;
      listing.isActive = true;
      listing.isAcceptingOrders = listing.isAcceptingOrders ?? true;
      await listing.save();
    }

    doc.approvalStatus = 'approved';
    doc.kycStatus = 'verified';
    doc.adminReviewedAt = new Date();
    doc.rejectionReason = null;
    await doc.save();

    res.json({ registration: serializeOwnerRestaurant(doc) });
  } catch (e) {
    next(e);
  }
}

/** How this shop appears on the customer restaurant list (subscription, toggle, hours). */
export async function getCustomerVisibilityPreview(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const reg = await getApprovedRegistration(req.user!.sub);
    if (!reg) {
      next(createError(403, PENDING_APPROVAL_MSG));
      return;
    }
    if (!reg.restaurantListingId) {
      next(createError(404, 'Restaurant listing not found'));
      return;
    }
    const preview = await buildCustomerVisibilityPreview(reg.restaurantListingId);
    res.json(preview);
  } catch (e) {
    next(e);
  }
}

/** Admin: preview customer-list visibility for any published listing. */
export async function adminCustomerVisibilityPreview(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const preview = await buildCustomerVisibilityPreview(req.params.listingId);
    res.json(preview);
  } catch (e) {
    next(e);
  }
}

export async function getShopOpenStatus(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const reg = await getApprovedRegistration(req.user!.sub);
    if (!reg) {
      next(createError(403, PENDING_APPROVAL_MSG));
      return;
    }
    if (!reg.restaurantListingId) {
      next(createError(404, 'Restaurant listing not found'));
      return;
    }
    const listing = await Restaurant.findById(reg.restaurantListingId);
    if (!listing) {
      next(createError(404, 'Restaurant listing not found'));
      return;
    }
    res.json({
      isAcceptingOrders: listing.isAcceptingOrders !== false,
      restaurantId: listing.id,
    });
  } catch (e) {
    next(e);
  }
}

export async function setShopOpenStatus(
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
    const reg = await getApprovedRegistration(req.user!.sub);
    if (!reg) {
      next(createError(403, PENDING_APPROVAL_MSG));
      return;
    }
    if (!reg.restaurantListingId) {
      next(createError(404, 'Restaurant listing not found'));
      return;
    }
    const listing = await Restaurant.findById(reg.restaurantListingId);
    if (!listing) {
      next(createError(404, 'Restaurant listing not found'));
      return;
    }
    const { isAcceptingOrders } = req.body as { isAcceptingOrders: boolean };
    listing.isAcceptingOrders = Boolean(isAcceptingOrders);
    await listing.save();
    res.json({
      isAcceptingOrders: listing.isAcceptingOrders,
      restaurantId: listing.id,
    });
  } catch (e) {
    next(e);
  }
}

export async function rejectRegistration(
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

    const doc = await OwnerRestaurant.findById(req.params.id);
    if (!doc) {
      next(createError(404, 'Registration not found'));
      return;
    }
    if (doc.approvalStatus !== 'pending_review') {
      next(createError(409, 'Registration is not pending review'));
      return;
    }

    const { reason } = req.body as { reason: string };
    doc.approvalStatus = 'rejected';
    doc.kycStatus = 'rejected';
    doc.rejectionReason = reason.trim();
    doc.adminReviewedAt = new Date();
    await doc.save();

    res.json({ registration: serializeOwnerRestaurant(doc) });
  } catch (e) {
    next(e);
  }
}

export async function getShopWallet(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const reg = await OwnerRestaurant.findOne({ ownerId: req.user!.sub });
    if (!reg) {
      next(createError(404, 'Shop registration not found'));
      return;
    }
    const entries = await RestaurantEarning.find({ ownerId: req.user!.sub })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();
    res.json({
      pending: reg.walletPending ?? 0,
      totalEarned: reg.walletTotalEarned ?? 0,
      entries: entries.map((e) => ({
        id: e._id.toString(),
        orderNumber: e.orderNumber,
        amount: e.amount,
        status: e.status,
        createdAt: e.createdAt,
      })),
    });
  } catch (e) {
    next(e);
  }
}
