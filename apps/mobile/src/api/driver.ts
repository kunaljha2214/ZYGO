import { api } from './client';
import type {
  DriverProfile,
  RideRequest,
  DriverRide,
  DriverEarningsDashboard,
} from '../types/driver';

export async function fetchDriverProfile() {
  const { data } = await api.get<{ profile: DriverProfile }>('/driver/profile');
  return data.profile;
}

export async function updateDriverVehicle(vehicleModel: string, vehicleNumber: string) {
  const { data } = await api.patch<{ profile: DriverProfile }>('/driver/vehicle', {
    vehicleModel,
    vehicleNumber,
  });
  return data.profile;
}

export async function uploadDriverDocument(type: string, dataUrl: string, fileName?: string) {
  const { data } = await api.post<{ profile: DriverProfile }>('/driver/documents', {
    type,
    dataUrl,
    fileName,
  });
  return data.profile;
}

export async function submitDriverForReview() {
  const { data } = await api.post<{ profile: DriverProfile }>('/driver/submit');
  return data.profile;
}

export async function setDriverOnline(
  online: boolean,
  coordinates?: { lat: number; lng: number }
) {
  const { data } = await api.patch<{
    isOnline: boolean;
    isBusy: boolean;
    incomingRequest?: RideRequest | null;
  }>('/driver/online', {
    online,
    ...(coordinates ? { lat: coordinates.lat, lng: coordinates.lng } : {}),
  });
  return data;
}

export async function updateDriverLocation(lat: number, lng: number, rideId?: string) {
  await api.patch('/driver/location', { lat, lng, rideId });
}

export async function acceptRide(rideId: string) {
  const { data } = await api.post<{ ride: DriverRide }>(`/driver/rides/${rideId}/accept`);
  return data.ride;
}

export async function rejectRide(rideId: string) {
  await api.post(`/driver/rides/${rideId}/reject`);
}

export async function advanceRide(rideId: string, status?: string) {
  const { data } = await api.patch<{ ride: DriverRide }>(`/driver/rides/${rideId}/status`, {
    status,
  });
  return data.ride;
}

export async function fetchIncomingRide() {
  const { data } = await api.get<{ request: RideRequest | null }>('/driver/incoming');
  return data.request;
}

export async function fetchActiveRide() {
  const { data } = await api.get<{ ride: DriverRide | null }>('/driver/active');
  return data.ride;
}

export async function fetchDriverEarningsDashboard() {
  const { data } = await api.get<DriverEarningsDashboard>('/driver/earnings');
  return data;
}

export async function fetchDriverHistory() {
  const { data } = await api.get<{
    history: {
      id: string;
      pickup: string;
      drop: string;
      fare: number;
      driverEarned: number;
      distanceKm: number;
      customerRating?: number;
      completedAt?: string;
    }[];
  }>('/driver/history');
  return data.history;
}

export async function fetchDriverWallet() {
  const { data } = await api.get<{
    pending: number;
    withdrawable: number;
    totalEarned: number;
    entries: {
      id: string;
      amount: number;
      platformFee: number;
      driverEarned: number;
      type: string;
      status: string;
      createdAt: string;
    }[];
  }>('/driver/wallet');
  return data;
}
