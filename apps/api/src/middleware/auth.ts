import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import createError from 'http-errors';
import type { UserRole } from '../models/User';

export interface JwtPayload {
  sub: string;
  role: UserRole;
}

export interface AuthedRequest extends Request {
  user?: JwtPayload;
}

export function authMiddleware(req: AuthedRequest, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next(createError(401, 'Missing or invalid authorization'));
    return;
  }
  const token = header.slice(7);
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    next(createError(500, 'JWT_SECRET not configured'));
    return;
  }
  try {
    const decoded = jwt.verify(token, secret) as JwtPayload & { iat: number; exp: number };
    req.user = { sub: decoded.sub, role: decoded.role };
    next();
  } catch {
    next(createError(401, 'Invalid or expired token'));
  }
}
