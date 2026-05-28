/**
 * @format
 */

import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import notifee from '@notifee/react-native';
import App from './App';
import { name as appName } from './app.json';
import { ensureMapboxInitialized } from './src/config/mapboxInit';
import {
  ensureNotificationChannel,
  setBackgroundNotificationHandler,
} from './src/services/notifications';
import { backgroundLocationLoop } from './src/services/backgroundLocation';

// Register immediately (required). Mapbox token is set natively in MainApplication;
// JS init runs in parallel before any map screen opens.
void ensureNotificationChannel().catch(() => {});
setBackgroundNotificationHandler();

// Foreground service loop for background location (Android).
notifee.registerForegroundService(() => backgroundLocationLoop());
AppRegistry.registerComponent(appName, () => App);

void ensureMapboxInitialized().catch((err) => {
  console.warn('[mapbox] init failed:', err);
});
