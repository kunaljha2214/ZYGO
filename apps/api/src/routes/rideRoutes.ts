import { Router, type RequestHandler } from 'express';
import { body } from 'express-validator';
import type { AuthedRequest } from '../middleware/auth';
import { authMiddleware } from '../middleware/auth';
import * as rides from '../controllers/rideController';

const placeValidators = [
  body('pickup.line1').notEmpty(),
  body('pickup.coordinates.lat').isFloat(),
  body('pickup.coordinates.lng').isFloat(),
  body('drop.line1').notEmpty(),
  body('drop.coordinates.lat').isFloat(),
  body('drop.coordinates.lng').isFloat(),
  body('vehicleType').notEmpty(),
];

const estimateValidators = [
  body('pickup.coordinates.lat').isFloat(),
  body('pickup.coordinates.lng').isFloat(),
  body('drop.coordinates.lat').isFloat(),
  body('drop.coordinates.lng').isFloat(),
  body('vehicleType').notEmpty(),
];

export function buildRideRoutes(): Router {
  const estimateRideHandler: RequestHandler = (req, res, next) => {
    void rides.estimateRide(req as AuthedRequest, res, next);
  };

  const createRideHandler: RequestHandler = (req, res, next) => {
    void rides.createRide(req as AuthedRequest, res, next);
  };

  const listRidesHandler: RequestHandler = (req, res, next) => {
    void rides.listRides(req as AuthedRequest, res, next);
  };

  const getRideHandler: RequestHandler = (req, res, next) => {
    void rides.getRide(req as AuthedRequest, res, next);
  };

  const getRideContactHandler: RequestHandler = (req, res, next) => {
    void rides.getRideContact(req as AuthedRequest, res, next);
  };

  const cancelRideHandler: RequestHandler = (req, res, next) => {
    void rides.cancelRide(req as AuthedRequest, res, next);
  };

  const publicPart = Router();
  publicPart.post('/rides/estimate', estimateValidators, estimateRideHandler);

  const protectedPart = Router();
  protectedPart.use(authMiddleware);
  protectedPart.post('/rides', placeValidators, createRideHandler);
  protectedPart.get('/rides', listRidesHandler);
  protectedPart.get('/rides/:id', getRideHandler);
  protectedPart.get('/rides/:id/contact', getRideContactHandler);
  protectedPart.patch('/rides/:id/cancel', cancelRideHandler);

  const r = Router();
  r.use(publicPart);
  r.use(protectedPart);
  return r;
}

