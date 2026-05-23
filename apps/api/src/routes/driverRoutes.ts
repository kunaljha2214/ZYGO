import { Router, type RequestHandler } from 'express';
import { body } from 'express-validator';
import type { AuthedRequest } from '../middleware/auth';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import * as dr from '../controllers/driverController';

const r = Router();

r.use(authMiddleware);

const driverOnly = requireRole('driver');
const adminOnly = requireRole('admin');

const wrap =
  (
    fn: (
      req: AuthedRequest,
      res: import('express').Response,
      next: import('express').NextFunction
    ) => Promise<void>
  ): RequestHandler =>
  (req, res, next) => {
    void fn(req as AuthedRequest, res, next);
  };

r.get('/profile', driverOnly, wrap(dr.getMyProfile));
r.patch('/vehicle', driverOnly, wrap(dr.updateVehicle));
r.post(
  '/documents',
  driverOnly,
  [
    body('type').isIn(['aadhaar', 'pan', 'driving_license', 'rc', 'insurance', 'selfie']),
    body('dataUrl').trim().notEmpty(),
  ],
  wrap(dr.uploadDocument)
);
r.post('/submit', driverOnly, wrap(dr.submitForReview));
r.patch('/online', driverOnly, wrap(dr.setOnlineStatus));
r.patch('/location', driverOnly, wrap(dr.updateLocation));
r.get('/incoming', driverOnly, wrap(dr.getIncomingRequest));
r.get('/active', driverOnly, wrap(dr.getActiveRide));
r.post('/rides/:rideId/accept', driverOnly, wrap(dr.acceptRequest));
r.post('/rides/:rideId/reject', driverOnly, wrap(dr.rejectRequest));
r.patch('/rides/:rideId/status', driverOnly, wrap(dr.advanceRideStatus));
r.get('/rides/:rideId/contact', driverOnly, wrap(dr.getRideCustomerContact));
r.get('/earnings', driverOnly, wrap(dr.getEarningsDashboard));
r.get('/history', driverOnly, wrap(dr.getRideHistory));
r.get('/wallet', driverOnly, wrap(dr.getWallet));

r.get('/admin/pending', adminOnly, wrap(dr.listPendingDrivers));
r.post('/admin/:id/approve', adminOnly, wrap(dr.approveDriver));
r.post('/admin/:id/block', adminOnly, wrap(dr.blockDriver));
r.post(
  '/admin/:id/reject',
  adminOnly,
  [body('reason').trim().notEmpty()],
  wrap(dr.rejectDriver)
);

export default r;
