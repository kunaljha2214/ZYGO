import { Platform } from 'react-native';
import notifee from '@notifee/react-native';
import Geolocation from '@react-native-community/geolocation';
import { updateDriverLocation } from '../api/driver';
import { updatePartnerLocation } from '../api/deliveryPartner';

const SERVICE_NOTIFICATION_ID = 'bg_location';
let runningRole: 'driver' | 'delivery_partner' | null = null;

async function ensureForegroundNotification(role: 'driver' | 'delivery_partner'): Promise<void> {
  if (Platform.OS !== 'android') return;
  await notifee.displayNotification({
    id: SERVICE_NOTIFICATION_ID,
    title: 'Zygo is tracking your location',
    body:
      role === 'driver'
        ? 'Needed to match rides and update customers.'
        : 'Needed to match deliveries and update customers.',
    android: {
      channelId: 'zygo_events',
      asForegroundService: true,
      ongoing: true,
      pressAction: { id: 'default' },
    },
  });
}

export async function startBackgroundLocation(role: 'driver' | 'delivery_partner'): Promise<void> {
  runningRole = role;
  await ensureForegroundNotification(role);
}

export async function stopBackgroundLocation(): Promise<void> {
  runningRole = null;
  if (Platform.OS === 'android') {
    await notifee.cancelNotification(SERVICE_NOTIFICATION_ID).catch(() => {});
  }
}

export function getBackgroundLocationRole(): typeof runningRole {
  return runningRole;
}

async function pushOnce(role: 'driver' | 'delivery_partner'): Promise<void> {
  return new Promise((resolve) => {
    Geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        if (role === 'driver') {
          void updateDriverLocation(lat, lng);
        } else {
          void updatePartnerLocation(lat, lng);
        }
        resolve();
      },
      () => resolve(),
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 15000 }
    );
  });
}

export async function backgroundLocationLoop(): Promise<void> {
  // This runs inside Notifee foreground service on Android.
  // Keep it conservative to reduce battery usage.
  // If JS runtime is suspended by OEM, it will naturally pause.
  // It will resume when the app process is active again.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const role = runningRole;
    if (!role) {
      await new Promise((r) => setTimeout(r, 2000));
      continue;
    }
    await pushOnce(role);
    const interval = role === 'driver' ? 10_000 : 15_000;
    await new Promise((r) => setTimeout(r, interval));
  }
}

