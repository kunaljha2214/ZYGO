import { Platform, PermissionsAndroid } from 'react-native';
import Geolocation, { type GeoOptions } from '@react-native-community/geolocation';

export type Coords = { lat: number; lng: number };

export type LocationPermissionStatus = 'granted' | 'denied' | 'blocked';

type GeolocationError = {
  code?: number;
  message?: string;
};

function getPosition(options: GeoOptions): Promise<Coords> {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      options
    );
  });
}

/** Request fine or coarse location on Android; no-op grant on other platforms. */
export async function ensureLocationPermission(): Promise<LocationPermissionStatus> {
  if (Platform.OS === 'ios') {
    return new Promise((resolve) => {
      Geolocation.requestAuthorization(
        () => resolve('granted'),
        () => resolve('denied')
      );
    });
  }

  if (Platform.OS !== 'android') return 'granted';

  const fineGranted = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
  );
  const coarseGranted = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION
  );
  if (fineGranted || coarseGranted) return 'granted';

  const results = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
  ]);

  const fine = results[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
  const coarse = results[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION];

  if (
    fine === PermissionsAndroid.RESULTS.GRANTED ||
    coarse === PermissionsAndroid.RESULTS.GRANTED
  ) {
    return 'granted';
  }
  if (fine === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
    return 'blocked';
  }
  return 'denied';
}

function watchForPosition(options: GeoOptions, maxWaitMs: number): Promise<Coords> {
  return new Promise((resolve, reject) => {
    let watchId: number | null = null;
    let settled = false;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      if (watchId != null) Geolocation.clearWatch(watchId);
      clearTimeout(timer);
      fn();
    };

    const timer = setTimeout(() => {
      finish(() => reject(new Error('watch_timeout')));
    }, maxWaitMs);

    watchId = Geolocation.watchPosition(
      (pos) => {
        finish(() =>
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        );
      },
      (err) => {
        finish(() => reject(err));
      },
      {
        ...options,
        distanceFilter: 0,
        interval: 1000,
        fastestInterval: 500,
        useSignificantChanges: false,
      }
    );
  });
}

/**
 * Best-effort current GPS fix. Tries cached/low accuracy first, then high accuracy, then watchPosition.
 */
export async function getCurrentCoordinates(): Promise<Coords> {
  const attempts: GeoOptions[] = [
    { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 },
    { enableHighAccuracy: false, timeout: 25000, maximumAge: 60000 },
    { enableHighAccuracy: true, timeout: 30000, maximumAge: 15000 },
    { enableHighAccuracy: true, timeout: 45000, maximumAge: 0 },
  ];

  let lastError: unknown;
  for (const opts of attempts) {
    try {
      return await getPosition(opts);
    } catch (e) {
      lastError = e;
    }
  }

  try {
    return await watchForPosition(
      { enableHighAccuracy: true, timeout: 40000, maximumAge: 0 },
      40000
    );
  } catch (e) {
    lastError = e;
  }

  throw lastError ?? new Error('location_unavailable');
}

/** For map picker — quick fix first, then high accuracy (max ~25s). */
export async function getFreshMapCoordinates(): Promise<Coords> {
  const quickAttempts: GeoOptions[] = [
    { enableHighAccuracy: false, timeout: 8000, maximumAge: 120000 },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
  ];
  for (const opts of quickAttempts) {
    try {
      return await getPosition(opts);
    } catch {
      /* next */
    }
  }
  return watchForPosition(
    { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    20000
  );
}

export function describeLocationFailure(err: unknown, permission: LocationPermissionStatus): string {
  if (permission === 'denied') {
    return 'Location permission denied — allow location for Zygo in Settings, or choose pickup on map.';
  }
  if (permission === 'blocked') {
    return 'Location blocked — open Settings → Apps → Zygo → Permissions → Location → Allow.';
  }

  const code = (err as GeolocationError)?.code;
  if (code === 1) {
    return 'Location permission denied — allow location for Zygo, or choose pickup on map.';
  }
  if (code === 2) {
    return 'GPS is off or unavailable — turn on Location in phone Settings, then try again.';
  }
  if (code === 3) {
    return 'GPS timed out — move near a window or outdoors, or choose pickup on map.';
  }
  return 'Could not detect GPS — turn on Location, try again, or choose pickup on map.';
}
