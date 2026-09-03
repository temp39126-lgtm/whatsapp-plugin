import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';

vi.mock('../src/config/env', () => ({
  env: {
    ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    FRONTEND_URL: 'http://localhost:3000',
  },
}));

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import bcrypt from 'bcryptjs';
import { User } from '../src/models/User';
import { TenantSettings } from '../src/models/TenantSettings';
import { Conversation } from '../src/models/Conversation';
import { Contact } from '../src/models/Contact';
import { WhatsAppAccount } from '../src/models/WhatsAppAccount';
import { encrypt } from '../src/utils/encryption';
import * as emailService from '../src/services/email/emailService';
import { sendDailyDigestEmails } from '../src/services/email/digestService';

describe('Daily digest emails', () => {
  let mongo: MongoMemoryServer;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  beforeEach(async () => {
    vi.restoreAllMocks();
    await mongoose.connection.db?.dropDatabase();

    await TenantSettings.create({
      tenantId: 'tenant-001',
      notifications: {
        enabled: true,
        smtpHost: 'smtp.example.com',
        smtpPort: 587,
        smtpSecure: false,
        smtpUser: 'mailer@example.com',
        encryptedSmtpPassword: encrypt('secret'),
        fromEmail: 'mailer@example.com',
        fromName: 'WhatsApp CRM',
        emailOnAssignment: true,
        notifyAdminOnUnassigned: false,
        adminAlertEmail: '',
        dailyDigestEnabled: false,
      },
    });

    const user = await User.create({
      email: 'agent@example.com',
      passwordHash: await bcrypt.hash('secret', 10),
      name: 'Support User',
      role: 'USER',
      tenantId: 'tenant-001',
      isActive: true,
      preferences: {
        notifications: {
          emailSummary: true,
        },
      },
    });

    const account = await WhatsAppAccount.create({
      tenantId: 'tenant-001',
      phoneNumberId: 'phone-1',
      businessAccountId: 'waba-1',
      displayPhoneNumber: '+10000000000',
      encryptedAccessToken: encrypt('token'),
      connectionStatus: 'CONNECTED',
      webhookConfigured: true,
    });

    const contact = await Contact.create({
      tenantId: 'tenant-001',
      name: 'Jane Customer',
      phone: '+15551234567',
      whatsappId: '15551234567',
      whatsappAccountId: account._id,
    });

    await Conversation.create({
      tenantId: 'tenant-001',
      contactId: contact._id,
      whatsappAccountId: account._id,
      assignedUserId: user._id.toString(),
      status: 'OPEN',
      unreadCount: 2,
      lastMessage: 'Need help',
      permittedUsers: [],
    });
  });

  it('sends digest email only to users with email summary enabled and unread chats', async () => {
    const sendSpy = vi.spyOn(emailService, 'sendDailyDigestEmail').mockResolvedValue(true);

    const sent = await sendDailyDigestEmails();

    expect(sent).toBe(1);
    expect(sendSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'agent@example.com',
        unreadCount: 1,
      })
    );
  });

  it('skips users without email summary enabled', async () => {
    await User.updateOne({ email: 'agent@example.com' }, { 'preferences.notifications.emailSummary': false });
    const sendSpy = vi.spyOn(emailService, 'sendDailyDigestEmail').mockResolvedValue(true);

    const sent = await sendDailyDigestEmails();

    expect(sent).toBe(0);
    expect(sendSpy).not.toHaveBeenCalled();
  });
});
