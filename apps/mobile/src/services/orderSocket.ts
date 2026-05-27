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

export type OrderDeliverySocketHandlers = {
  onDispatching?: () => void;
  onNoRider?: () => void;
  onAssigned?: () => void;
};

/** Listen for rider search / assignment while tracking a food order. */
export function bindOrderDeliveryEvents(
  sock: Socket,
  handlers: OrderDeliverySocketHandlers
): () => void {
  const onDispatching = () => handlers.onDispatching?.();
  const onNoRider = () => handlers.onNoRider?.();
  const onAssigned = () => handlers.onAssigned?.();

  sock.on('delivery:dispatching', onDispatching);
  sock.on('delivery:no_rider', onNoRider);
  sock.on('delivery:assigned', onAssigned);

  return () => {
    sock.off('delivery:dispatching', onDispatching);
    sock.off('delivery:no_rider', onNoRider);
    sock.off('delivery:assigned', onAssigned);
  };
}
