import { Router, type RequestHandler } from 'express';
import { body } from 'express-validator';
import type { AuthedRequest } from '../middleware/auth';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import * as dp from '../controllers/deliveryPartnerController';

const r = Router();

r.use(authMiddleware);

const partnerOnly = requireRole('delivery_partner');
const adminOnly = requireRole('admin');

const wrap =
  (fn: (req: AuthedRequest, res: import('express').Response, next: import('express').NextFunction) => Promise<void>): RequestHandler =>
  (req, res, next) => {
    void fn(req as AuthedRequest, res, next);
  };

r.get('/profile', partnerOnly, wrap(dp.getMyProfile));
r.post(
  '/documents',
  partnerOnly,
  [
    body('type').isIn(['aadhaar', 'pan', 'driving_license', 'rc', 'profile_photo']),
    body('dataUrl').trim().notEmpty(),
  ],
  wrap(dp.uploadDocument)
);
r.post('/submit', partnerOnly, wrap(dp.submitForReview));
r.patch('/online', partnerOnly, wrap(dp.setOnlineStatus));
r.patch('/location', partnerOnly, wrap(dp.updateLocation));
r.get('/incoming', partnerOnly, wrap(dp.getIncomingRequest));
r.get('/active', partnerOnly, wrap(dp.getActiveDelivery));
r.post('/orders/:orderId/accept', partnerOnly, wrap(dp.acceptRequest));
r.post('/orders/:orderId/reject', partnerOnly, wrap(dp.rejectRequest));
r.patch('/orders/:orderId/status', partnerOnly, wrap(dp.advanceDeliveryStatus));
r.get('/earnings', partnerOnly, wrap(dp.getEarningsDashboard));
r.get('/history', partnerOnly, wrap(dp.getDeliveryHistory));
r.get('/wallet', partnerOnly, wrap(dp.getWallet));

r.get('/admin/pending', adminOnly, wrap(dp.listPendingPartners));
r.post('/admin/:id/approve', adminOnly, wrap(dp.approvePartner));
r.post(
  '/admin/:id/reject',
  adminOnly,
  [body('reason').trim().notEmpty()],
  wrap(dp.rejectPartner)
);

export default r;
