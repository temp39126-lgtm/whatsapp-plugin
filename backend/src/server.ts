import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import pinoHttp from 'pino-http';
import { env } from './config/env';
import { logger } from './config/logger';
import { connectDatabase } from './config/database';
import { initSocketServer } from './services/realtime/socketService';
import { authenticate, errorHandler } from './middleware/authenticate';
import { apiRateLimiter } from './middleware/rateLimiter';

import conversationRoutes from './routes/conversation.routes';
import messageRoutes from './routes/message.routes';
import callRoutes from './routes/call.routes';
import contactRoutes from './routes/contact.routes';
import tagRoutes from './routes/tag.routes';
import analyticsRoutes from './routes/analytics.routes';
import settingsRoutes from './routes/settings.routes';
import webhookRoutes from './routes/webhook.routes';

const app = express();
const httpServer = createServer(app);

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(pinoHttp({ logger }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/whatsapp/webhook', webhookRoutes);

app.use('/api/whatsapp', apiRateLimiter);
app.use('/api/whatsapp/conversations', conversationRoutes);
app.use('/api/whatsapp', messageRoutes);
app.use('/api/whatsapp/calls', callRoutes);
app.use('/api/whatsapp/contacts', contactRoutes);
app.use('/api/whatsapp/tags', tagRoutes);
app.use('/api/whatsapp/analytics', analyticsRoutes);
app.use('/api/whatsapp', settingsRoutes);

app.use(errorHandler);

async function start() {
  await connectDatabase();
  initSocketServer(httpServer);

  httpServer.listen(env.PORT, () => {
    logger.info(`WhatsApp CRM Backend running on port ${env.PORT}`);
  });
}

start().catch((error) => {
  logger.error({ error }, 'Failed to start server');
  process.exit(1);
});

export default app;
