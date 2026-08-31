import { connectDatabase, disconnectDatabase } from '../config/database';
import { seedDefaultTags } from '../services/tags/tagService';
import { seedDefaultUsers } from '../services/auth/authService';
import { Contact } from '../models/Contact';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';
import { encrypt } from './encryption';
import { env } from '../config/env';
import { logger } from '../config/logger';

async function seed() {
  await connectDatabase();

  const tenantId = env.MOCK_TENANT_ID;
  await seedDefaultUsers(tenantId);
  const supportUser = await (await import('../models/User')).User.findOne({
    email: 'user@example.com',
    tenantId,
  });
  const supportUserId = supportUser?._id.toString() ?? env.MOCK_USER_ID;
  await seedDefaultTags(tenantId, supportUserId);

  const { WhatsAppAccount: WA } = await import('../models/WhatsAppAccount');

  let account = await WA.findOne({ tenantId });
  if (!account && env.WHATSAPP_ACCESS_TOKEN) {
    account = await WA.create({
      tenantId,
      phoneNumberId: 'demo-phone-number-id',
      businessAccountId: 'demo-business-account-id',
      displayPhoneNumber: '+1 555 0100',
      encryptedAccessToken: encrypt(env.WHATSAPP_ACCESS_TOKEN),
      connectionStatus: 'CONNECTED',
      webhookConfigured: true,
    });
  }

  if (account) {
    const existingContacts = await Contact.countDocuments({ tenantId });
    if (existingContacts === 0) {
      const contacts = await Contact.insertMany([
        {
          tenantId,
          whatsappAccountId: account._id,
          name: 'John Smith',
          phone: '+15551234567',
          whatsappId: '15551234567',
        },
        {
          tenantId,
          whatsappAccountId: account._id,
          name: 'Sarah Johnson',
          phone: '+15559876543',
          whatsappId: '15559876543',
        },
        {
          tenantId,
          whatsappAccountId: account._id,
          name: 'Mike Wilson',
          phone: '+15555555555',
          whatsappId: '15555555555',
          assignedUserId: supportUserId,
        },
      ]);

      for (const contact of contacts) {
        const conversation = await Conversation.create({
          tenantId,
          whatsappAccountId: account._id,
          contactId: contact._id,
          assignedUserId: contact.assignedUserId,
          status: 'OPEN',
          priority: contact.name === 'John Smith' ? 'HIGH' : 'NORMAL',
          unreadCount: Math.floor(Math.random() * 5),
          lastMessage: 'Hello, I need help with my order',
          lastMessageAt: new Date(Date.now() - Math.random() * 86400000),
        });

        await Message.insertMany([
          {
            tenantId,
            conversationId: conversation._id,
            contactId: contact._id,
            direction: 'INCOMING',
            type: 'TEXT',
            content: { text: 'Hello, I need help with my order' },
            status: 'DELIVERED',
            createdAt: new Date(Date.now() - 3600000),
          },
          {
            tenantId,
            conversationId: conversation._id,
            contactId: contact._id,
            direction: 'OUTGOING',
            type: 'TEXT',
            content: { text: 'Hi! I would be happy to help you with that.' },
            status: 'READ',
            sentByUserId: supportUserId,
            createdAt: new Date(Date.now() - 1800000),
          },
        ]);
      }

      logger.info('Demo data seeded successfully');
    }
  }

  await disconnectDatabase();
}

seed().catch((error) => {
  logger.error({ error }, 'Seed failed');
  process.exit(1);
});
