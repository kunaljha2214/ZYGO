/**
 * @format
 */

import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { ensureMapboxInitialized } from './src/config/mapboxInit';

// Register immediately (required). Mapbox token is set natively in MainApplication;
// JS init runs in parallel before any map screen opens.
AppRegistry.registerComponent(appName, () => App);

void ensureMapboxInitialized().catch((err) => {
  console.warn('[mapbox] init failed:', err);
});
