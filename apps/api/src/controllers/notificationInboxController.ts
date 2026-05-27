import createError from 'http-errors';
import type { Response, NextFunction } from 'express';
import type { AuthedRequest } from '../middleware/auth';
import { Types } from 'mongoose';
import { UserNotification } from '../models/UserNotification';

export async function listNotifications(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      next(createError(401));
      return;
    }

    const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100);
    const unreadOnly = req.query.unread === 'true';

    const filter: Record<string, unknown> = {
      userId: new Types.ObjectId(req.user.sub),
    };
    if (unreadOnly) filter.read = false;

    const notifications = await UserNotification.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json({
      notifications: notifications.map((n) => ({
        id: n._id.toString(),
        domain: n.domain,
        type: n.type,
        title: n.title,
        body: n.body,
        data: n.data,
        read: n.read,
        createdAt: n.createdAt,
      })),
    });
  } catch (e) {
    next(e);
  }
}

export async function markNotificationsRead(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      next(createError(401));
      return;
    }

    const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
    const markAll = req.body.all === true;

    const filter: Record<string, unknown> = {
      userId: new Types.ObjectId(req.user.sub),
      read: false,
    };

    if (!markAll) {
      if (ids.length === 0) {
        next(createError(400, 'Provide notification ids or all: true'));
        return;
      }
      filter._id = { $in: ids.map((id: string) => new Types.ObjectId(id)) };
    }

    const result = await UserNotification.updateMany(filter, { read: true });
    res.json({ updated: result.modifiedCount });
  } catch (e) {
    next(e);
  }
}
