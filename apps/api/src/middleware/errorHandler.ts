import type { Request, Response, NextFunction } from 'express';
import createError from 'http-errors';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const status = createError.isHttpError(err) ? err.status : 500;
  const message =
    err instanceof Error ? err.message : 'Internal server error';
  if (status >= 500) {
    console.error(err);
  }
  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && err instanceof Error
      ? { stack: err.stack }
      : {}),
  });
}
