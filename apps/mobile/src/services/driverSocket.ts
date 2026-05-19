import { io, type Socket } from 'socket.io-client';
import { API_BASE_URL } from '../config/env';
import { useAuthStore } from '../store/authStore';

let socket: Socket | null = null;
let socketToken: string | null = null;

function socketBaseUrl(): string {
  return API_BASE_URL.replace(/\/api\/v1\/?$/, '');
}

export function connectDriverSocket(): Socket {
  const token = useAuthStore.getState().token;
  if (!token) {
    throw new Error('Not authenticated');
  }
  if (socket && socketToken !== token) {
    disconnectDriverSocket();
  }
  if (!socket) {
    socketToken = token;
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

export function disconnectDriverSocket(): void {
  socket?.removeAllListeners();
  socket?.disconnect();
  socket = null;
  socketToken = null;
}
