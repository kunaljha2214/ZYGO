import { Platform } from 'react-native';
import { setAccessToken } from '@rnmapbox/maps';
import { mapboxAccessToken } from './mapbox';

let initPromise: Promise<void> | null = null;
let ready = false;

/** Applies Mapbox token via JS. Android also sets token natively in MainApplication. */
export function ensureMapboxInitialized(): Promise<void> {
  if (ready) return Promise.resolve();
  if (initPromise) return initPromise;

  const token = mapboxAccessToken();
  if (!token) {
    ready = true;
    return Promise.resolve();
  }

  // Native Android applies token before React starts — maps can render immediately.
  if (Platform.OS === 'android') {
    ready = true;
  }

  initPromise = Promise.resolve(setAccessToken(token))
    .then(() => {
      ready = true;
    })
    .catch((err) => {
      initPromise = null;
      if (Platform.OS === 'android') {
        ready = true;
        return;
      }
      throw err;
    });

  return initPromise;
}

export function isMapboxInitialized(): boolean {
  return ready;
}
