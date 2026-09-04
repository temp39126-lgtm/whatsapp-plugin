import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import mongoSanitize from 'express-mongo-sanitize';
import { createServer } from 'http';
import pinoHttp from 'pino-http';
import { corsOptions } from './config/cors';
import { env } from './config/env';
import { logger } from './config/logger';
import { connectDatabase } from './config/database';
import { migrateProductionData } from './utils/migrateProductionData';
import { initSocketServer } from './services/realtime/socketService';
import { scheduleDailyDigestEmails } from './services/email/digestService';
import { errorHandler } from './middleware/authenticate';
import { globalApiRateLimiter } from './middleware/rateLimiter';
import { csrfProtection } from './middleware/csrfProtection';

import authRoutes from './routes/auth.routes';
import conversationRoutes from './routes/conversation.routes';
import messageRoutes from './routes/message.routes';
import callRoutes from './routes/call.routes';
import contactRoutes from './routes/contact.routes';
import tagRoutes from './routes/tag.routes';
import analyticsRoutes from './routes/analytics.routes';
import settingsRoutes from './routes/settings.routes';
import notificationRoutes from './routes/notification.routes';
import groupRoutes from './routes/group.routes';
import communityRoutes from './routes/community.routes';
import webhookRoutes from './routes/webhook.routes';

const app = express();
const httpServer = createServer(app);

if (env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(compression());
app.use(cors(corsOptions));
app.use(
  '/api/whatsapp/webhook',
  express.raw({ type: 'application/json', limit: `${env.MAX_UPLOAD_SIZE_MB}mb` }),
  webhookRoutes
);
app.use(express.json({ limit: `${env.MAX_UPLOAD_SIZE_MB}mb` }));
app.use(mongoSanitize({ replaceWith: '_' }));
app.use(pinoHttp({ logger }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api', globalApiRateLimiter);
app.use('/api', csrfProtection);

app.use('/api/auth', authRoutes);

app.use('/api/whatsapp/conversations', conversationRoutes);
app.use('/api/whatsapp', messageRoutes);
app.use('/api/whatsapp/calls', callRoutes);
app.use('/api/whatsapp/contacts', contactRoutes);
app.use('/api/whatsapp/tags', tagRoutes);
app.use('/api/whatsapp/analytics', analyticsRoutes);
app.use('/api/whatsapp/groups', groupRoutes);
app.use('/api/whatsapp/communities', communityRoutes);
app.use('/api/whatsapp', settingsRoutes);
app.use('/api/whatsapp/notifications', notificationRoutes);

app.use(errorHandler);

async function start() {
  await connectDatabase();
  if (env.NODE_ENV !== 'test') {
    await migrateProductionData();
  }
  initSocketServer(httpServer);
  scheduleDailyDigestEmails();

  httpServer.listen(env.PORT, () => {
    logger.info(`WhatsApp CRM Backend running on port ${env.PORT}`);
  });
}

start().catch((error) => {
  logger.error({ error }, 'Failed to start server');
  process.exit(1);
});

export default app;
