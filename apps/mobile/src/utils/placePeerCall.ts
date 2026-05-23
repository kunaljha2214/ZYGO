import { Linking } from 'react-native';
import { isAxiosError } from 'axios';
import { api } from '../api/client';
import { AppAlert } from '../alert';

async function dialFromEndpoint(path: string): Promise<void> {
  try {
    const { data } = await api.get<{ dialNumber: string }>(path);
    const tel = `tel:${data.dialNumber}`;
    const can = await Linking.canOpenURL(tel);
    if (!can) {
      AppAlert.alert('Call unavailable', 'Could not open your phone dialer.');
      return;
    }
    await Linking.openURL(tel);
  } catch (e) {
    const msg = isAxiosError(e)
      ? (e.response?.data as { message?: string })?.message ?? e.message
      : e instanceof Error
        ? e.message
        : 'Could not start call';
    AppAlert.alert('Call unavailable', msg);
  }
}

/** Customer → captain. Number is not shown in the app UI. */
export function callRideCaptain(rideId: string): Promise<void> {
  return dialFromEndpoint(`/rides/${rideId}/contact`);
}

/** Captain → customer. Number is not shown in the app UI. */
export function callRideCustomer(rideId: string): Promise<void> {
  return dialFromEndpoint(`/driver/rides/${rideId}/contact`);
}
