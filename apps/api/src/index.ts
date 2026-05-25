import 'dotenv/config';

import http from 'node:http';

import express from 'express';

import cors from 'cors';

import helmet from 'helmet';

import morgan from 'morgan';

import path from 'node:path';

import { connectDb } from './config/db';

import { errorHandler } from './middleware/errorHandler';

import authRoutes from './routes/authRoutes';

import userRoutes from './routes/userRoutes';

import foodRoutes from './routes/foodRoutes';

import orderRoutes from './routes/orderRoutes';

import shopOwnerRoutes from './routes/shopOwnerRoutes';

import deliveryPartnerRoutes from './routes/deliveryPartnerRoutes';
import driverRoutes from './routes/driverRoutes';
import referralRoutes from './routes/referralRoutes';
import partnerSubscriptionRoutes from './routes/partnerSubscriptionRoutes';

import { buildRideRoutes } from './routes/rideRoutes';

import { vehicleTypes } from './config/app';

import { ensureUploadDir } from './utils/uploads';

import { initSocket } from './socket/io';
import { restoreRestaurantAcceptTimeouts } from './services/orderAcceptTimeout';
import { razorpayWebhook } from './controllers/paymentController';
import { getRazorpayConfig } from './config/razorpay';



const app = express();

const PORT = Number(process.env.PORT || 4000);



app.use(helmet());

app.use(

  cors({

    origin: process.env.CORS_ORIGIN === '*' ? true : process.env.CORS_ORIGIN || true,

    credentials: true,

  })

);

app.use(morgan('dev'));

app.post(
  '/api/v1/webhooks/razorpay',
  express.raw({ type: 'application/json' }),
  (req, res, next) => {
    void razorpayWebhook(req, res, next);
  }
);

app.use(express.json({ limit: '8mb' }));



ensureUploadDir();

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));



const v1 = express.Router();

v1.use('/auth', authRoutes);

v1.use('/users', userRoutes);

v1.use('/shop', shopOwnerRoutes);

v1.use('/delivery-partner', deliveryPartnerRoutes);
v1.use('/driver', driverRoutes);
v1.use('/referrals', referralRoutes);
v1.use('/partner/subscription', partnerSubscriptionRoutes);

v1.use(foodRoutes);

v1.use(orderRoutes);

v1.use(buildRideRoutes());



v1.get('/config/vehicle-types', (_req, res) => {

  res.json({ vehicleTypes: vehicleTypes() });

});

v1.get('/config/payments', (_req, res) => {
  const { keyId, enabled } = getRazorpayConfig();
  res.json({ razorpay: { enabled, keyId: enabled ? keyId : null } });
});



app.use('/api/v1', v1);

app.use(errorHandler);



async function main(): Promise<void> {

  const uri = process.env.MONGODB_URI;

  if (!uri) {

    throw new Error('MONGODB_URI is required');

  }

  await connectDb(uri);

  const host = process.env.HOST || '0.0.0.0';

  const server = http.createServer(app);

  initSocket(server);
  await restoreRestaurantAcceptTimeouts();

  server.listen(PORT, host, () => {

    console.log(`Zygo API + Socket.IO on http://${host}:${PORT}/api/v1`);

  });

}



main().catch((err) => {

  console.error(err);

  process.exit(1);

});


