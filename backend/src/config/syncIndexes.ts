import mongoose from 'mongoose';
import { logger } from './logger';

// Import models so they are registered with Mongoose before syncing indexes.
import '../models/User';
import '../models/Contact';
import '../models/Conversation';
import '../models/Message';
import '../models/Call';
import '../models/Tag';
import '../models/Group';
import '../models/Community';
import '../models/WhatsAppAccount';
import '../models/TenantSettings';
import '../models/ActivityLog';
import '../models/InternalNote';
import '../models/ConversationRead';
import '../models/ConversationAssignment';
import '../models/MessageMedia';
import '../models/MessageReaction';
import '../models/CallEvent';
import '../models/AuthOtpChallenge';

export async function syncAllIndexes(): Promise<void> {
  const modelNames = mongoose.modelNames();
  for (const name of modelNames) {
    const model = mongoose.model(name);
    await model.syncIndexes();
    logger.info({ model: name }, 'Synced database indexes');
  }
}
