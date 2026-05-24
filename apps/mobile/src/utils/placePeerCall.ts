import { Linking, Platform } from 'react-native';
import { isAxiosError } from 'axios';
import { api } from '../api/client';
import { AppAlert } from '../alert';

function buildTelUrl(dialNumber: string): string {
  const trimmed = dialNumber.trim();
  if (trimmed.startsWith('tel:')) return trimmed;
  return `tel:${trimmed}`;
}

async function openDialer(dialNumber: string): Promise<void> {
  const tel = buildTelUrl(dialNumber);
  // Android 11+ often returns false from canOpenURL for tel: unless manifest
  // queries are declared — open the dialer directly instead.
  if (Platform.OS === 'ios') {
    const can = await Linking.canOpenURL(tel);
    if (!can) {
      AppAlert.alert('Call unavailable', 'Could not open your phone dialer.');
      return;
    }
  }
  await Linking.openURL(tel);
}

async function dialFromEndpoint(path: string): Promise<void> {
  try {
    const { data } = await api.get<{ dialNumber: string }>(path);
    if (!data.dialNumber?.trim()) {
      AppAlert.alert('Call unavailable', 'Contact number not available.');
      return;
    }
    await openDialer(data.dialNumber);
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

/** Customer → restaurant (shop owner phone). */
export function callOrderRestaurant(orderId: string): Promise<void> {
  return dialFromEndpoint(`/orders/${orderId}/contact/restaurant`);
}

/** Customer → delivery rider. */
export function callOrderRider(orderId: string): Promise<void> {
  return dialFromEndpoint(`/orders/${orderId}/contact/rider`);
}

/** Shop owner → customer. */
export function callShopOrderCustomer(orderId: string): Promise<void> {
  return dialFromEndpoint(`/shop/orders/${orderId}/contact/customer`);
}

/** Delivery partner → customer. */
export function callDeliveryOrderCustomer(orderId: string): Promise<void> {
  return dialFromEndpoint(`/delivery-partner/orders/${orderId}/contact/customer`);
}
