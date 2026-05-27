import admin from 'firebase-admin';
import { Types } from 'mongoose';
import { PushToken } from '../models/PushToken';
import type { NotificationPayload } from './notificationEvents';
import { isInvalidFirebaseTokenError } from './notificationEvents';

let firebaseInitialized = false;

function normalizePrivateKey(raw: string): string {
  let key = raw.trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }
  return key.replace(/\\n/g, '\n');
}

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
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL!.replace(/^["']|["']$/g, ''),
          privateKey: normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY!),
        }),
      });
    } catch (err) {
      console.error('[push] Firebase Admin init failed', err);
      return false;
    }
  }

  firebaseInitialized = true;
  return true;
}

export function isPushConfigured(): boolean {
  return initializeFirebase();
}

function stringifyData(data: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, String(value)]));
}

export async function sendPushToUser(
  userId: string | Types.ObjectId,
  payload: NotificationPayload
): Promise<void> {
  if (!initializeFirebase()) {
    console.warn(
      '[push] Firebase Admin credentials missing on this server; skipping push for user',
      userId.toString(),
      payload.data.type
    );
    return;
  }

  const tokens = await PushToken.find({
    userId: new Types.ObjectId(userId.toString()),
    enabled: true,
  }).lean();
  if (tokens.length === 0) {
    console.warn('[push] No FCM tokens for user', userId.toString(), payload.data.type);
    return;
  }

  const data = stringifyData(payload.data);
  const response = await admin.messaging().sendEachForMulticast({
    tokens: tokens.map((t) => t.token),
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data,
    android: {
      priority: 'high',
      notification: {
        channelId: 'zygo_events',
        sound: 'default',
      },
    },
  });

  const successCount = response.responses.filter((r) => r.success).length;
  if (successCount > 0) {
    console.log(
      `[push] sent ${successCount}/${tokens.length} for user ${userId.toString()} (${payload.data.type})`
    );
  }

  const invalidTokens: string[] = [];
  response.responses.forEach((result, index) => {
    if (!result.error) return;
    console.error(
      '[push] FCM error',
      userId.toString(),
      payload.data.type,
      result.error.code,
      result.error.message
    );
    if (isInvalidFirebaseTokenError(result.error)) {
      invalidTokens.push(tokens[index].token);
    }
  });

  if (invalidTokens.length > 0) {
    await PushToken.updateMany({ token: { $in: invalidTokens } }, { enabled: false });
  }
}
