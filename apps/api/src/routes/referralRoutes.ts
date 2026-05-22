import { Router, type RequestHandler } from 'express';
import { query } from 'express-validator';
import * as referral from '../controllers/referralController';
import { authMiddleware, type AuthedRequest } from '../middleware/auth';

const r = Router();

const getMyReferral: RequestHandler = (req, res, next) => {
  void referral.getMyReferral(req as AuthedRequest, res, next);
};

const validateCode: RequestHandler = (req, res, next) => {
  void referral.validateReferralCode(req as AuthedRequest, res, next);
};

r.get('/me', authMiddleware, getMyReferral);

r.get(
  '/validate',
  [query('code').trim().notEmpty().withMessage('Code required')],
  validateCode
);

export default r;
