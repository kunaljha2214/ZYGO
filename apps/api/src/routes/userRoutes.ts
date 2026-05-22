import { Router, type RequestHandler } from 'express';
import { body } from 'express-validator';
import { authMiddleware, type AuthedRequest } from '../middleware/auth';
import * as users from '../controllers/userController';

const r = Router();

r.use(authMiddleware);

const listAddressesHandler: RequestHandler = (req, res, next) => {
  void users.listAddresses(req as AuthedRequest, res, next);
};

const addAddressHandler: RequestHandler = (req, res, next) => {
  void users.addAddress(req as AuthedRequest, res, next);
};

const setDefaultAddressHandler: RequestHandler = (req, res, next) => {
  void users.setDefaultAddress(req as AuthedRequest, res, next);
};

const deleteAddressHandler: RequestHandler = (req, res, next) => {
  void users.deleteAddress(req as AuthedRequest, res, next);
};

const getProfileHandler: RequestHandler = (req, res, next) => {
  void users.getProfile(req as AuthedRequest, res, next);
};

const updateProfileHandler: RequestHandler = (req, res, next) => {
  void users.updateProfile(req as AuthedRequest, res, next);
};

r.get('/profile', getProfileHandler);

r.patch(
  '/profile',
  [
    body('name').optional().trim().isLength({ min: 2, max: 120 }),
    body('dateOfBirth').optional().trim().notEmpty(),
    body('emergencyContact').optional(),
    body('emergencyContact.name').optional().trim().notEmpty(),
    body('emergencyContact.phone').optional().trim().notEmpty(),
  ],
  updateProfileHandler
);

r.get('/addresses', listAddressesHandler);

r.post(
  '/addresses',
  [
    body('label').trim().notEmpty(),
    body('line1').trim().notEmpty(),
    body('city').optional().trim(),
    body('area').optional().trim(),
    body('contactName').optional().trim(),
    body('contactPhone').optional().trim(),
    body('addressKind').optional().isIn(['home', 'work', 'other']),
    body('isDefault').optional().isBoolean(),
    body('coordinates.lat').isFloat(),
    body('coordinates.lng').isFloat(),
  ],
  addAddressHandler
);

r.patch('/addresses/:id/default', setDefaultAddressHandler);
r.delete('/addresses/:id', deleteAddressHandler);

export default r;
