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

r.get('/addresses', listAddressesHandler);

r.post(
  '/addresses',
  [
    body('label').trim().notEmpty(),
    body('line1').trim().notEmpty(),
    body('coordinates.lat').isFloat(),
    body('coordinates.lng').isFloat(),
  ],
  addAddressHandler
);

export default r;
