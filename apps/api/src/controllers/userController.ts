import createError from 'http-errors';
import type { Response, NextFunction } from 'express';
import type { AuthedRequest } from '../middleware/auth';
import { User } from '../models/User';
import { validationResult } from 'express-validator';
import {
  formatDateOfBirth,
  formatMemberSince,
  parseDateOfBirthInput,
  validateDateOfBirth,
} from '../utils/profileFormat';

function normalizePhone10(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  return digits;
}

export function serializeUserProfile(doc: InstanceType<typeof User>) {
  const createdAt = doc.createdAt ?? new Date();
  return {
    id: doc.id,
    name: doc.name,
    phone: doc.phone,
    email: doc.email ?? null,
    role: doc.role,
    dateOfBirth: doc.dateOfBirth ? formatDateOfBirth(doc.dateOfBirth) : null,
    dateOfBirthIso: doc.dateOfBirth
      ? doc.dateOfBirth.toISOString().slice(0, 10)
      : null,
    dateOfBirthLocked: Boolean(doc.dateOfBirthLocked),
    memberSince: formatMemberSince(createdAt),
    emergencyContact: doc.emergencyContact
      ? {
          name: doc.emergencyContact.name,
          phone: doc.emergencyContact.phone,
        }
      : null,
    createdAt: createdAt.toISOString(),
  };
}

export async function listAddresses(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      next(createError(401));
      return;
    }
    const user = await User.findById(req.user.sub).lean();
    if (!user) {
      next(createError(404));
      return;
    }
    res.json(user.savedAddresses || []);
  } catch (e) {
    next(e);
  }
}

export async function getProfile(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      next(createError(401));
      return;
    }
    const user = await User.findById(req.user.sub);
    if (!user) {
      next(createError(404));
      return;
    }
    res.json(serializeUserProfile(user));
  } catch (e) {
    next(e);
  }
}

export async function updateProfile(
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

    const user = await User.findById(req.user.sub);
    if (!user) {
      next(createError(404));
      return;
    }

    const body = req.body as {
      name?: string;
      dateOfBirth?: string;
      emergencyContact?: { name: string; phone: string } | null;
    };

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (name.length < 2) {
        next(createError(400, 'Name must be at least 2 characters'));
        return;
      }
      user.name = name;
    }

    if (body.dateOfBirth !== undefined) {
      if (user.dateOfBirthLocked) {
        next(createError(400, 'Date of birth can only be set once and cannot be changed'));
        return;
      }
      const parsed = parseDateOfBirthInput(String(body.dateOfBirth));
      if (!parsed) {
        next(createError(400, 'Use DD/MM/YYYY format for date of birth'));
        return;
      }
      const dobErr = validateDateOfBirth(parsed);
      if (dobErr) {
        next(createError(400, dobErr));
        return;
      }
      user.dateOfBirth = parsed;
      user.dateOfBirthLocked = true;
    }

    if (body.emergencyContact !== undefined) {
      if (body.emergencyContact === null) {
        user.emergencyContact = null;
      } else {
        const ecName = String(body.emergencyContact.name ?? '').trim();
        const ecPhone = normalizePhone10(String(body.emergencyContact.phone ?? ''));
        if (!ecName || ecPhone.length !== 10) {
          next(createError(400, 'Emergency contact needs a name and 10-digit phone'));
          return;
        }
        user.emergencyContact = { name: ecName, phone: ecPhone };
      }
    }

    await user.save();
    res.json(serializeUserProfile(user));
  } catch (e) {
    next(e);
  }
}

export async function addAddress(
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
    const { label, line1, coordinates } = req.body as {
      label: string;
      line1: string;
      coordinates: { lat: number; lng: number };
    };
    const user = await User.findById(req.user.sub);
    if (!user) {
      next(createError(404));
      return;
    }
    user.savedAddresses.push({ label, line1, coordinates });
    await user.save();
    res.status(201).json(user.savedAddresses[user.savedAddresses.length - 1]);
  } catch (e) {
    next(e);
  }
}
