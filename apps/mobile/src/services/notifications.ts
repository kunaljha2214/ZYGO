import { Platform } from 'react-native';
import notifee, { AndroidImportance, EventType, type Event } from '@notifee/react-native';
import type { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { api } from '../api/client';
import { navigationRef } from '../navigation/navigationRef';
import { routeFromNotificationData, type NotificationData } from './notificationRoutes';

const CHANNEL_ID = 'zygo_events';

let tokenRefreshUnsubscribe: (() => void) | null = null;
let foregroundMessageUnsubscribe: (() => void) | null = null;
let openedAppUnsubscribe: (() => void) | null = null;
let foregroundEventUnsubscribe: (() => void) | null = null;
let registrationInFlight: Promise<void> | null = null;
let messagingModule: typeof import('@react-native-firebase/messaging').default | null | undefined;

function getMessaging() {
  if (messagingModule !== undefined) return messagingModule;
  try {
    messagingModule = require('@react-native-firebase/messaging').default;
  } catch {
    messagingModule = null;
  }
  return messagingModule;
}

function asNotificationData(
  data: FirebaseMessagingTypes.RemoteMessage['data'] | Record<string, unknown> | undefined
): NotificationData {
  const read = (key: string) => {
    const value = data?.[key];
    return typeof value === 'string' ? value : undefined;
  };
  return {
    role: read('role'),
    domain: read('domain'),
    orderId: read('orderId'),
    rideId: read('rideId'),
  };
}

function navigateFromNotificationData(data: NotificationData): void {
  const route = routeFromNotificationData(data);
  if (!route || !navigationRef.isReady()) return;

  const ref = navigationRef as unknown as {
    navigate: (name: string, params?: { screen: string; params: unknown }) => void;
  };
  if ('screen' in route) {
    ref.navigate(route.root, {
      screen: route.screen,
      params: route.params,
    });
    return;
  }
  ref.navigate(route.root);
}

async function ensureNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Zygo updates',
    importance: AndroidImportance.HIGH,
  });
}

async function requestNotificationPermission(): Promise<boolean> {
  const settings = await notifee.requestPermission();
  return settings.authorizationStatus >= 1;
}

async function registerTokenWithApi(fcmToken: string): Promise<void> {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') return;
  await api.post('/users/push-tokens', {
    token: fcmToken,
    platform: Platform.OS,
  });
}

async function displayForegroundNotification(
  message: FirebaseMessagingTypes.RemoteMessage
): Promise<void> {
  const title = message.notification?.title ?? message.data?.title;
  const body = message.notification?.body ?? message.data?.body;
  if (!title && !body) return;

  await ensureNotificationChannel();
  await notifee.displayNotification({
    title: typeof title === 'string' ? title : undefined,
    body: typeof body === 'string' ? body : undefined,
    data: message.data,
    android: {
      channelId: CHANNEL_ID,
      pressAction: { id: 'default' },
    },
  });
}

function handleNotificationOpen(message: FirebaseMessagingTypes.RemoteMessage | null): void {
  if (!message) return;
  navigateFromNotificationData(asNotificationData(message.data));
}

function handleNotifeeEvent(event: Event): void {
  if (event.type !== EventType.PRESS) return;
  navigateFromNotificationData(asNotificationData(event.detail.notification?.data));
}

export async function registerForPushNotifications(): Promise<void> {
  if (registrationInFlight) return registrationInFlight;

  registrationInFlight = (async () => {
    const messaging = getMessaging();
    if (!messaging) {
      console.warn('[notifications] Firebase messaging unavailable; skipping registration');
      return;
    }

    const permitted = await requestNotificationPermission();
    if (!permitted) return;

    await ensureNotificationChannel();

    try {
      await messaging().registerDeviceForRemoteMessages();
      const fcmToken = await messaging().getToken();
      if (fcmToken) {
        await registerTokenWithApi(fcmToken);
      }
    } catch (err) {
      console.warn('[notifications] FCM registration skipped', err);
    }
  })().finally(() => {
    registrationInFlight = null;
  });

  return registrationInFlight;
}

export function startPushNotificationListeners(): void {
  const messaging = getMessaging();
  if (!messaging) return;

  if (!tokenRefreshUnsubscribe) {
    tokenRefreshUnsubscribe = messaging().onTokenRefresh((fcmToken) => {
      registerTokenWithApi(fcmToken).catch((err) => {
        console.warn('[notifications] token refresh registration failed', err);
      });
    });
  }

  if (!foregroundMessageUnsubscribe) {
    foregroundMessageUnsubscribe = messaging().onMessage((message) => {
      void displayForegroundNotification(message);
    });
  }

  if (!openedAppUnsubscribe) {
    openedAppUnsubscribe = messaging().onNotificationOpenedApp(handleNotificationOpen);
  }

  if (!foregroundEventUnsubscribe) {
    foregroundEventUnsubscribe = notifee.onForegroundEvent(handleNotifeeEvent);
  }

  messaging().getInitialNotification().then(handleNotificationOpen).catch(() => {});
}

export function stopPushNotificationListeners(): void {
  tokenRefreshUnsubscribe?.();
  foregroundMessageUnsubscribe?.();
  openedAppUnsubscribe?.();
  foregroundEventUnsubscribe?.();
  tokenRefreshUnsubscribe = null;
  foregroundMessageUnsubscribe = null;
  openedAppUnsubscribe = null;
  foregroundEventUnsubscribe = null;
}

export async function unregisterCurrentPushToken(): Promise<void> {
  const messaging = getMessaging();
  try {
    if (messaging) {
      const fcmToken = await messaging().getToken();
      if (fcmToken) {
        await api.delete('/users/push-tokens', { data: { token: fcmToken } });
      }
    }
  } catch (err) {
    console.warn('[notifications] unregister failed', err);
  } finally {
    stopPushNotificationListeners();
  }
}

export function setBackgroundNotificationHandler(): void {
  const messaging = getMessaging();
  if (!messaging) return;

  messaging().setBackgroundMessageHandler(async (message) => {
    if (!message.notification) {
      await displayForegroundNotification(message);
    }
  });
}
