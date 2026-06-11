import { PermissionsAndroid, Platform } from 'react-native';
import notifee, { AndroidImportance, EventType, type Event } from '@notifee/react-native';
import type { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { api } from '../api/client';
import { navigationRef } from '../navigation/navigationRef';
import { routeFromNotificationData, type NotificationData } from './notificationRoutes';
import { usePartnerDeepLinkStore } from '../store/partnerDeepLinkStore';

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

  if (data.role === 'delivery_partner') {
    usePartnerDeepLinkStore.getState().setTarget('delivery_trip');
  } else if (data.role === 'driver') {
    usePartnerDeepLinkStore.getState().setTarget('driver_trip');
  }

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

export async function ensureNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Zygo updates',
    importance: AndroidImportance.HIGH,
  });
}

async function requestAndroidPostNotifications(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  if (typeof Platform.Version === 'number' && Platform.Version < 33) return true;

  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
  );
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

async function requestNotificationPermission(): Promise<boolean> {
  const androidGranted = await requestAndroidPostNotifications();
  if (!androidGranted) {
    console.warn('[notifications] POST_NOTIFICATIONS denied');
    return false;
  }

  const messaging = getMessaging();
  if (messaging) {
    await messaging().requestPermission();
  }

  const settings = await notifee.requestPermission();
  return settings.authorizationStatus >= 1;
}

async function registerTokenWithApi(fcmToken: string): Promise<void> {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') return;
  const res = await api.post<{ ok: boolean; pushEnabledOnServer?: boolean }>('/users/push-tokens', {
    token: fcmToken,
    platform: Platform.OS,
  });
  if (res.data.pushEnabledOnServer === false) {
    console.warn(
      '[notifications] Server cannot send FCM — add FIREBASE_* env vars on Render and redeploy'
    );
  } else {
    console.log('[notifications] FCM token registered with API');
  }
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

    await ensureNotificationChannel();

    const permitted = await requestNotificationPermission();
    if (!permitted) {
      console.warn('[notifications] Notification permission not granted');
      return;
    }

    try {
      await messaging().registerDeviceForRemoteMessages();
      const fcmToken = await messaging().getToken();
      if (fcmToken) {
        await registerTokenWithApi(fcmToken);
      } else {
        console.warn('[notifications] FCM returned empty token');
      }
    } catch (err) {
      console.warn('[notifications] FCM registration failed', err);
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
    await displayForegroundNotification(message);
  });
}
