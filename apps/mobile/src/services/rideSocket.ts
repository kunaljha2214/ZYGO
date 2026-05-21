import { io, type Socket } from 'socket.io-client';
import { API_BASE_URL } from '../config/env';
import { useAuthStore } from '../store/authStore';

let socket: Socket | null = null;
let activeRideId: string | null = null;

function socketBaseUrl(): string {
  return API_BASE_URL.replace(/\/api\/v1\/?$/, '');
}

/** Live captain position for the current ride (emitted to user room from API). */
export function connectRideTracking(rideId: string): Socket {
  activeRideId = rideId;
  const token = useAuthStore.getState().token;
  if (!token) {
    throw new Error('Not authenticated');
  }

  if (socket?.connected) {
    socket.emit('ride:join', { rideId });
    return socket;
  }

  socket = io(socketBaseUrl(), {
    auth: { token },
    transports: ['websocket'],
    autoConnect: true,
  });

  socket.on('connect', () => {
    socket?.emit('ride:join', { rideId });
  });

  return socket;
}

export function onDriverLocation(
  handler: (payload: { lat: number; lng: number; rideId?: string }) => void
): void {
  socket?.on('driver:location', handler);
}

export function offDriverLocation(
  handler: (payload: { lat: number; lng: number; rideId?: string }) => void
): void {
  socket?.off('driver:location', handler);
}

export function disconnectRideTracking(): void {
  socket?.disconnect();
  socket = null;
  activeRideId = null;
}

export function getActiveRideTrackingId(): string | null {
  return activeRideId;
}
