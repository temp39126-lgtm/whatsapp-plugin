import mongoose from 'mongoose';
import { env } from './env';
import { logger } from './logger';
import { syncAllIndexes } from './syncIndexes';
import { prepareDatabaseForIndexSync } from '../utils/migrateProductionData';

export async function connectDatabase(): Promise<void> {
  mongoose.set('strictQuery', true);

  await mongoose.connect(env.MONGODB_URI);
  logger.info('Connected to MongoDB');

  if (env.NODE_ENV !== 'test') {
    await prepareDatabaseForIndexSync();
    await syncAllIndexes();
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  logger.info('Disconnected from MongoDB');
}
