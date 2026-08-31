import mongoose from 'mongoose';
import { env } from './env';
import { logger } from './logger';

export async function connectDatabase(): Promise<void> {
  mongoose.set('strictQuery', true);

  await mongoose.connect(env.MONGODB_URI);
  logger.info('Connected to MongoDB');
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  logger.info('Disconnected from MongoDB');
}
