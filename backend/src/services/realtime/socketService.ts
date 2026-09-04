import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { corsOptions } from '../../config/cors';
import { env } from '../../config/env';
import { AuthUser } from '../../types';
import { extractBearerOrCookieToken } from '../auth/authCookie';
import { resolveAuthUser } from '../rbac/authAdapter';
import { enforceActiveSession } from '../auth/sessionService';
import { canAccessConversation } from '../rbac/conversationAccess';
import { Conversation } from '../../models/Conversation';
import { logger } from '../../config/logger';

let io: SocketServer | null = null;

export function initSocketServer(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: corsOptions,
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token as string | undefined;
      const cookie = socket.handshake.headers.cookie;
      const resolvedToken = extractBearerOrCookieToken(
        token ? `Bearer ${token}` : undefined,
        cookie
      );
      const authorization = resolvedToken ? `Bearer ${resolvedToken}` : undefined;
      const tokenUser = await resolveAuthUser(authorization, cookie);
      socket.data.user = await enforceActiveSession(authorization, tokenUser);
      next();
    } catch {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user as AuthUser;
    socket.join(`tenant:${user.tenantId}`);
    socket.join(`user:${user.userId}`);
    logger.info({ userId: user.userId, tenantId: user.tenantId }, 'Socket connected');

    socket.on('disconnect', () => {
      logger.debug({ userId: user.userId }, 'Socket disconnected');
    });
  });

  return io;
}

export function getIO(): SocketServer {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}

export async function emitToAuthorizedUsers(
  tenantId: string,
  conversationId: string,
  event: string,
  data: unknown
): Promise<void> {
  if (!io) return;

  const conversation = await Conversation.findOne({ _id: conversationId, tenantId });
  if (!conversation) return;

  const sockets = await io.fetchSockets();
  for (const socket of sockets) {
    const user = socket.data.user as AuthUser;
    if (user.tenantId !== tenantId) continue;
    if (canAccessConversation(user, conversation)) {
      socket.emit(event, data);
    }
  }
}

export async function emitToTenantAdmins(
  tenantId: string,
  event: string,
  data: unknown
): Promise<void> {
  if (!io) return;
  const sockets = await io.fetchSockets();
  for (const socket of sockets) {
    const user = socket.data.user as AuthUser;
    if (user.tenantId === tenantId && user.role === 'ADMIN') {
      socket.emit(event, data);
    }
  }
}

export function emitToTenant(tenantId: string, event: string, data: unknown): void {
  io?.to(`tenant:${tenantId}`).emit(event, data);
}

export function emitToUser(userId: string, event: string, data: unknown): void {
  io?.to(`user:${userId}`).emit(event, data);
}
