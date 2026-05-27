import createError from 'http-errors';
import { validationResult } from 'express-validator';
import type { Response, NextFunction } from 'express';
import type { AuthedRequest } from '../middleware/auth';
import { PushToken, type PushPlatform } from '../models/PushToken';

export async function registerPushToken(
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

    const { token, platform } = req.body as {
      token: string;
      platform: PushPlatform;
    };

    await PushToken.findOneAndUpdate(
      { token },
      {
        userId: req.user.sub,
        role: req.user.role,
        token,
        platform,
        enabled: true,
        lastSeenAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}

export async function unregisterPushToken(
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

    const { token } = req.body as { token: string };
    await PushToken.updateOne(
      { token, userId: req.user.sub },
      { enabled: false }
    );

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}
