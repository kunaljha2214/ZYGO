import createError from 'http-errors';
import type { Response, NextFunction } from 'express';
import type { AuthedRequest } from './auth';
import type { UserRole } from '../models/User';

export function requireRole(...roles: UserRole[]) {
  return (req: AuthedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(createError(401));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(createError(403, 'You do not have access to this resource'));
      return;
    }
    next();
  };
}
