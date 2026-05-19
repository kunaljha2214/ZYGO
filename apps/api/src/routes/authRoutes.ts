import { Router, type RequestHandler } from 'express';
import { body } from 'express-validator';
import * as auth from '../controllers/authController';
import { authMiddleware, type AuthedRequest } from '../middleware/auth';

const r = Router();

const registerStart: RequestHandler = (req, res, next) => {
  void auth.registerStart(req as AuthedRequest, res, next);
};

const registerVerify: RequestHandler = (req, res, next) => {
  void auth.registerVerify(req as AuthedRequest, res, next);
};

const registerResendOtp: RequestHandler = (req, res, next) => {
  void auth.registerResendOtp(req as AuthedRequest, res, next);
};

const login: RequestHandler = (req, res, next) => {
  void auth.login(req as AuthedRequest, res, next);
};

const me: RequestHandler = (req, res, next) => {
  void auth.me(req as AuthedRequest, res, next);
};

const accountTypes = ['customer', 'delivery_partner', 'shop_owner', 'driver'] as const;

r.post(
  '/register/start',
  [
    body('phone').trim().isLength({ min: 10 }).withMessage('Phone required'),
    body('password').isLength({ min: 6 }).withMessage('Password min 6 chars'),
    body('name').trim().notEmpty().withMessage('Name required'),
    body('email').trim().isEmail().withMessage('Valid email required'),
    body('accountType').isIn(accountTypes).withMessage('Invalid account type'),
    body('driverVehicleType')
      .optional()
      .isIn(['bike', 'auto', 'car'])
      .withMessage('Invalid vehicle type'),
    body().custom((_, { req }) => {
      const t = req.body?.accountType as string;
      const v = req.body?.driverVehicleType as string | undefined;
      if (t === 'driver' && !['bike', 'auto', 'car'].includes(v ?? '')) {
        throw new Error('Vehicle type required for drivers');
      }
      return true;
    }),
  ],
  registerStart
);

r.post(
  '/register/verify',
  [
    body('sessionId').trim().notEmpty().withMessage('Session required'),
    body('otp').trim().isLength({ min: 6, max: 8 }).withMessage('Enter the code from email'),
  ],
  registerVerify
);

r.post(
  '/register/resend-otp',
  [body('sessionId').trim().notEmpty().withMessage('Session required')],
  registerResendOtp
);

r.post(
  '/login',
  [
    body('password').notEmpty().withMessage('Password required'),
    body('phone').optional({ values: 'falsy' }).trim(),
    body('email').optional({ values: 'falsy' }).trim().isEmail().withMessage('Invalid email'),
    body().custom((_, { req }) => {
      const phone = (req.body?.phone as string | undefined)?.trim();
      const email = (req.body?.email as string | undefined)?.trim();
      if (!phone && !email) {
        throw new Error('Provide phone or email');
      }
      if (phone && phone.length < 10) {
        throw new Error('Phone must be at least 10 digits');
      }
      return true;
    }),
  ],
  login
);

r.get('/me', authMiddleware, me);

export default r;
