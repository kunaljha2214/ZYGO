import { Types } from 'mongoose';
import { UserNotification, type NotificationDomain } from '../models/UserNotification';
import { emitToUser } from '../socket/io';
import type { NotificationPayload } from './notificationEvents';
import { sendPushToUser } from './pushNotification';

export type DispatchNotificationInput = {
  userId: string | Types.ObjectId;
  domain: NotificationDomain;
  payload: NotificationPayload;
};

export async function dispatchNotification(input: DispatchNotificationInput): Promise<void> {
  const userId = new Types.ObjectId(input.userId.toString());
  const { payload, domain } = input;

  await UserNotification.create({
    userId,
    domain,
    type: payload.data.type,
    title: payload.title,
    body: payload.body,
    data: payload.data,
    read: false,
  });

  emitToUser(userId.toString(), 'notification:new', {
    domain,
    type: payload.data.type,
    ...payload.data,
  });

  await sendPushToUser(userId, payload);
}

export function dispatchNotificationAsync(input: DispatchNotificationInput): void {
  void dispatchNotification(input).catch((err) => {
    console.error(
      '[notification] dispatch failed',
      input.domain,
      input.payload.data.type,
      input.userId.toString(),
      err
    );
  });
}
