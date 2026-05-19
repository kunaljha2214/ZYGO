import { io, type Socket } from 'socket.io-client';
import { API_BASE_URL } from '../config/env';
import { useAuthStore } from '../store/authStore';

let socket: Socket | null = null;

function socketBaseUrl(): string {
  return API_BASE_URL.replace(/\/api\/v1\/?$/, '');
}

export function getDeliverySocket(): Socket | null {
  return socket;
}

export function connectDeliverySocket(): Socket {
  const token = useAuthStore.getState().token;
  if (!socket) {
    socket = io(socketBaseUrl(), {
      auth: { token },
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
    });
  } else {
    socket.auth = { token };
    if (!socket.connected) {
      socket.connect();
    }
  }
  return socket;
}

export function disconnectDeliverySocket(): void {
  socket?.removeAllListeners();
  socket?.disconnect();
  socket = null;
}
