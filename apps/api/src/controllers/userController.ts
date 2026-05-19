import createError from 'http-errors';
import type { Response, NextFunction } from 'express';
import type { AuthedRequest } from '../middleware/auth';
import { User } from '../models/User';
import { validationResult } from 'express-validator';

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
