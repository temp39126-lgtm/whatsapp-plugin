import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';

vi.mock('../src/config/env', () => ({
  env: {
    ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    FRONTEND_URL: 'https://wa.example.com',
  },
}));

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import nodemailer from 'nodemailer';
import { TenantSettings } from '../src/models/TenantSettings';
import { encrypt } from '../src/utils/encryption';
import { sendTeamUserWelcomeEmail } from '../src/services/email/emailService';

describe('sendTeamUserWelcomeEmail', () => {
  let mongo: MongoMemoryServer;
  const sendMail = vi.fn().mockResolvedValue({ messageId: 'test' });

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
    vi.spyOn(nodemailer, 'createTransport').mockReturnValue({
      sendMail,
    } as unknown as nodemailer.Transporter);
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await mongoose.disconnect();
    await mongo.stop();
  });

  beforeEach(async () => {
    sendMail.mockClear();
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
  });

  it('includes login credentials and CRM links', async () => {
    const sent = await sendTeamUserWelcomeEmail({
      tenantId: 'tenant-001',
      to: 'agent@example.com',
      name: 'New Agent',
      email: 'agent@example.com',
      temporaryPassword: 'TempPass1',
    });

    expect(sent).toBe(true);
    expect(sendMail).toHaveBeenCalledTimes(1);
    const mail = sendMail.mock.calls[0][0] as { to: string; text: string; html: string };
    expect(mail.to).toBe('agent@example.com');
    expect(mail.text).toContain('agent@example.com');
    expect(mail.text).toContain('TempPass1');
    expect(mail.text).toContain('https://wa.example.com/auth/login');
    expect(mail.text).toContain('https://wa.example.com/auth/forgot-password');
    expect(mail.html).toContain('Forgot password');
  });
});
