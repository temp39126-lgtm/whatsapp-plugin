import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Contact } from '../src/models/Contact';
import { Conversation } from '../src/models/Conversation';
import { Message } from '../src/models/Message';
import { WhatsAppAccount } from '../src/models/WhatsAppAccount';
import { encrypt } from '../src/utils/encryption';
import * as metaApi from '../src/services/whatsapp/metaApi';
import {
  HELLO_WORLD_TEMPLATE_LANGUAGE,
  HELLO_WORLD_TEMPLATE_NAME,
  HELLO_WORLD_TEMPLATE_PREVIEW,
  sendHelloWorldTemplateMessage,
} from '../src/services/whatsapp/whatsappService';
import { createContact } from '../src/services/contacts/contactService';

describe('WhatsApp template messages', () => {
  let mongo: MongoMemoryServer;

  const admin = {
    userId: 'admin-id',
    tenantId: 'tenant-001',
    role: 'ADMIN' as const,
    permissions: [],
    email: 'admin@example.com',
    name: 'Admin User',
  };

  beforeAll(async () => {
    process.env.ENCRYPTION_KEY =
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
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
    await WhatsAppAccount.create({
      tenantId: 'tenant-001',
      phoneNumberId: 'prod-phone-id',
      businessAccountId: 'demo-business',
      displayPhoneNumber: '+15550001111',
      encryptedAccessToken: 'encrypted-token',
      connectionStatus: 'CONNECTED',
      webhookConfigured: true,
    });
  });

  it('sendTemplateMessage posts the configured template payload', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ messages: [{ id: 'wamid.template-test' }] }),
    } as Response);

    await metaApi.sendTemplateMessage(
      'prod-phone-id',
      '15551234567',
      HELLO_WORLD_TEMPLATE_NAME,
      HELLO_WORLD_TEMPLATE_LANGUAGE,
      {
        encryptedAccessToken: encrypt('test-access-token'),
        metaApiVersion: 'v21.0',
      } as never
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/prod-phone-id/messages');
    const body = JSON.parse(String(init?.body));
    expect(body).toEqual({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: '15551234567',
      type: 'template',
      template: {
        name: HELLO_WORLD_TEMPLATE_NAME,
        language: { code: HELLO_WORLD_TEMPLATE_LANGUAGE },
      },
    });
  });

  it('persists a template message with preview content for chat history', async () => {
    vi.spyOn(metaApi, 'sendTemplateMessage').mockResolvedValue({
      messages: [{ id: 'wamid.template-history' }],
    });

    const account = await WhatsAppAccount.findOne({ tenantId: 'tenant-001' });
    const contact = await Contact.create({
      tenantId: 'tenant-001',
      whatsappAccountId: account!._id,
      name: 'Template User',
      phone: '+15551234567',
      whatsappId: '15551234567',
    });
    const conversation = await Conversation.create({
      tenantId: 'tenant-001',
      whatsappAccountId: account!._id,
      contactId: contact._id,
      status: 'OPEN',
      priority: 'NORMAL',
      unreadCount: 0,
    });

    const message = await sendHelloWorldTemplateMessage(
      account!,
      conversation,
      contact,
      admin.userId
    );

    expect(message.type).toBe('TEMPLATE');
    expect(message.status).toBe('SENT');
    expect(message.metaMessageId).toBe('wamid.template-history');
    expect(message.content).toMatchObject({
      templateName: HELLO_WORLD_TEMPLATE_NAME,
      languageCode: HELLO_WORLD_TEMPLATE_LANGUAGE,
      preview: HELLO_WORLD_TEMPLATE_PREVIEW,
      text: HELLO_WORLD_TEMPLATE_PREVIEW,
    });
  });

  it('does not send a template when opt-in is unchecked', async () => {
    const templateSpy = vi.spyOn(metaApi, 'sendTemplateMessage');

    await createContact(admin, { name: 'No Template', phone: '+15551112222' });

    expect(templateSpy).not.toHaveBeenCalled();
    expect(await Message.countDocuments({ tenantId: 'tenant-001' })).toBe(0);
  });

  it('sends template when opt-in is checked', async () => {
    vi.spyOn(metaApi, 'sendTemplateMessage').mockResolvedValue({
      messages: [{ id: 'wamid.from-contact-create' }],
    });

    const result = await createContact(admin, {
      name: 'With Template',
      phone: '+15553334444',
      sendWelcomeWhatsAppTemplate: true,
    });

    expect(result.welcomeTemplate).toEqual({ sent: true });
    const messages = await Message.find({ tenantId: 'tenant-001' });
    expect(messages).toHaveLength(1);
    expect(messages[0].type).toBe('TEMPLATE');
    expect(messages[0].direction).toBe('OUTGOING');
  });

  it('keeps the contact when template sending fails', async () => {
    vi.spyOn(metaApi, 'sendTemplateMessage').mockRejectedValue(
      new Error('Meta API error: (#132000) Template not approved')
    );

    const result = await createContact(admin, {
      name: 'Template Fail',
      phone: '+15554445555',
      sendWelcomeWhatsAppTemplate: true,
    });

    expect(result.name).toBe('Template Fail');
    expect(result.welcomeTemplate?.sent).toBe(false);
    expect(result.welcomeTemplate?.error).toContain('Meta rejected the template message');
    expect(await Contact.countDocuments({ tenantId: 'tenant-001' })).toBe(1);
    const failed = await Message.findOne({ tenantId: 'tenant-001' });
    expect(failed?.status).toBe('FAILED');
  });
});
