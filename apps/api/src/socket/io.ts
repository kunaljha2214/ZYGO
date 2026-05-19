import type { Server as HttpServer } from 'node:http';
import { Server, type Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

let io: Server | null = null;

type JwtPayload = { sub: string; role: string };

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN === '*' ? true : process.env.CORS_ORIGIN || true,
      credentials: true,
    },
    path: '/socket.io',
  });

  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      (typeof socket.handshake.headers.authorization === 'string'
        ? socket.handshake.headers.authorization.replace(/^Bearer\s+/i, '')
        : null);
    if (!token) {
      next(new Error('Unauthorized'));
      return;
    }
    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) throw new Error('JWT_SECRET missing');
      const payload = jwt.verify(token, secret) as JwtPayload;
      socket.data.userId = payload.sub;
      socket.data.role = payload.role;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId as string;
    const role = socket.data.role as string;
    void socket.join(`user:${userId}`);
    if (role === 'delivery_partner') {
      void socket.join(`partner:${userId}`);
    }
    if (role === 'driver') {
      void socket.join(`driver:${userId}`);
    }

    socket.on('order:join', (payload: { orderId?: string }) => {
      if (payload?.orderId) void socket.join(`order:${payload.orderId}`);
    });

    socket.on('rider:location', (payload: { lat: number; lng: number; orderId?: string }) => {
      if (role !== 'delivery_partner' || !payload?.orderId) return;
      io?.to(`order:${payload.orderId}`).emit('rider:location', {
        lat: payload.lat,
        lng: payload.lng,
        updatedAt: new Date().toISOString(),
      });
    });

    socket.on('ride:join', (payload: { rideId?: string }) => {
      if (payload?.rideId) void socket.join(`ride:${payload.rideId}`);
    });

    socket.on('driver:location', (payload: { lat: number; lng: number; rideId?: string }) => {
      if (role !== 'driver' || !payload?.rideId) return;
      io?.to(`ride:${payload.rideId}`).emit('driver:location', {
        lat: payload.lat,
        lng: payload.lng,
        rideId: payload.rideId,
        updatedAt: new Date().toISOString(),
      });
    });
  });

  return io;
}

export function getIo(): Server {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}

export function emitToPartner(partnerId: string, event: string, payload: unknown): void {
  getIo().to(`partner:${partnerId}`).emit(event, payload);
}

export function emitToDriver(driverId: string, event: string, payload: unknown): void {
  getIo().to(`driver:${driverId}`).emit(event, payload);
}

export function emitToRide(rideId: string, event: string, payload: unknown): void {
  getIo().to(`ride:${rideId}`).emit(event, payload);
}

export function emitToUser(userId: string, event: string, payload: unknown): void {
  getIo().to(`user:${userId}`).emit(event, payload);
}

export function emitToOrder(orderId: string, event: string, payload: unknown): void {
  getIo().to(`order:${orderId}`).emit(event, payload);
}
