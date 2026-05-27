import admin from 'firebase-admin';
import { Types } from 'mongoose';
import { PushToken } from '../models/PushToken';
import type { NotificationPayload } from './notificationEvents';
import { isInvalidFirebaseTokenError } from './notificationEvents';

let firebaseInitialized = false;

function firebaseConfigPresent(): boolean {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
  );
}

function initializeFirebase(): boolean {
  if (firebaseInitialized) return true;
  if (!firebaseConfigPresent()) return false;

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
      }),
    });
  }

  firebaseInitialized = true;
  return true;
}

export function isPushConfigured(): boolean {
  return initializeFirebase();
}

export async function sendPushToUser(
  userId: string | Types.ObjectId,
  payload: NotificationPayload
): Promise<void> {
  if (!initializeFirebase()) {
    console.warn('[push] Firebase Admin credentials missing; skipping push notification');
    return;
  }

  const tokens = await PushToken.find({
    userId: new Types.ObjectId(userId.toString()),
    enabled: true,
  }).lean();
  if (tokens.length === 0) return;

  const response = await admin.messaging().sendEachForMulticast({
    tokens: tokens.map((t) => t.token),
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: payload.data,
    android: {
      priority: 'high',
      notification: {
        channelId: 'zygo_events',
        sound: 'default',
      },
    },
  });

  const invalidTokens = response.responses
    .map((result, index) => (result.error && isInvalidFirebaseTokenError(result.error) ? tokens[index].token : null))
    .filter((token): token is string => Boolean(token));

  if (invalidTokens.length > 0) {
    await PushToken.updateMany(
      { token: { $in: invalidTokens } },
      { enabled: false }
    );
  }
}
