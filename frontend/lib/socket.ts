'use client';

import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      withCredentials: true,
      auth: { token: 'mock' },
    });
  }
  return socket;
}

export function connectSocket(): Socket {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket(): void {
  if (socket?.connected) socket.disconnect();
}

export type SocketEventHandler = (data: unknown) => void;

export function onSocketEvent(event: string, handler: SocketEventHandler): () => void {
  const s = getSocket();
  s.on(event, handler);
  return () => s.off(event, handler);
}
