import { connectDatabase, disconnectDatabase } from '../config/database';
import { seedDefaultTags } from '../services/tags/tagService';
import { seedDefaultUsers } from '../services/auth/authService';
import { Contact } from '../models/Contact';
import { encrypt } from './encryption';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { clearDemoCrmData, seedDemoCrmData } from './seedDemoData';

const DEMO_ACCESS_TOKEN = 'demo-local-token';

async function ensureDemoWhatsAppAccount(tenantId: string) {
  const { WhatsAppAccount } = await import('../models/WhatsAppAccount');
  let account = await WhatsAppAccount.findOne({ tenantId });

  if (!account) {
    const token = env.WHATSAPP_ACCESS_TOKEN || DEMO_ACCESS_TOKEN;
    account = await WhatsAppAccount.create({
      tenantId,
      phoneNumberId: 'demo-phone-number-id',
      businessAccountId: 'demo-business-account-id',
      displayPhoneNumber: '+1 555 0100',
      encryptedAccessToken: encrypt(token),
      connectionStatus: 'CONNECTED',
      webhookConfigured: true,
    });
    logger.info('Created demo WhatsApp account');
  }

  return account;
}

async function seed() {
  const forceReseed = process.argv.includes('--force');
  await connectDatabase();

  const tenantId = env.MOCK_TENANT_ID;
  await seedDefaultUsers(tenantId);

  const { User } = await import('../models/User');
  const supportUser = await User.findOne({ email: 'user@example.com', tenantId });
  const adminUser = await User.findOne({ email: 'admin@example.com', tenantId });
  const supportUserId = supportUser?._id.toString() ?? env.MOCK_USER_ID;
  const adminUserId = adminUser?._id.toString() ?? env.MOCK_USER_ID;

  await seedDefaultTags(tenantId, supportUserId);
  const account = await ensureDemoWhatsAppAccount(tenantId);

  const existingContacts = await Contact.countDocuments({ tenantId });
  if (forceReseed) {
    await clearDemoCrmData(tenantId);
  }

  if (forceReseed || existingContacts === 0) {
    await seedDemoCrmData({
      tenantId,
      whatsappAccountId: account._id,
      supportUserId,
      adminUserId,
    });
  } else {
    logger.info('Demo CRM data already exists — run `npm run seed:demo` to reset and reseed');
  }

  await disconnectDatabase();
}

seed().catch((error) => {
  logger.error({ error }, 'Seed failed');
  process.exit(1);
});
