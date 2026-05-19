import { io, type Socket } from 'socket.io-client';
import { API_BASE_URL } from '../config/env';
import { useAuthStore } from '../store/authStore';

let socket: Socket | null = null;

function socketBaseUrl(): string {
  return API_BASE_URL.replace(/\/api\/v1\/?$/, '');
}

export function connectOrderTracking(orderId: string): Socket {
  if (socket?.connected) {
    socket.emit('order:join', { orderId });
    return socket;
  }
  const token = useAuthStore.getState().token;
  socket = io(socketBaseUrl(), {
    auth: { token },
    transports: ['websocket'],
    autoConnect: true,
  });
  socket.on('connect', () => {
    socket?.emit('order:join', { orderId });
  });
  return socket;
}

export function disconnectOrderTracking(): void {
  socket?.disconnect();
  socket = null;
}
