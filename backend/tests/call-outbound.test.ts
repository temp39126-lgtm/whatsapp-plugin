import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import bcrypt from 'bcryptjs';
import { User } from '../src/models/User';
import { Contact } from '../src/models/Contact';
import { Conversation } from '../src/models/Conversation';
import { WhatsAppAccount } from '../src/models/WhatsAppAccount';
import { Call } from '../src/models/Call';
import { startCall } from '../src/services/calls/callService';

vi.mock('../src/config/env', () => ({
  env: {
    CALLING_ENABLED: true,
    DEFAULT_TENANT_ID: 'tenant-001',
    CORS_ORIGIN: 'http://localhost:3000',
    FRONTEND_URL: 'http://localhost:3000',
  },
}));

vi.mock('../src/services/realtime/socketService', () => ({
  emitToAuthorizedUsers: vi.fn().mockResolvedValue(undefined),
  emitToTenant: vi.fn(),
}));

vi.mock('../src/services/whatsapp/metaApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/services/whatsapp/metaApi')>();
  return {
    ...actual,
    initiateCall: vi.fn().mockResolvedValue({ call_id: 'wacid.TEST123' }),
    terminateMetaCall: vi.fn().mockResolvedValue(undefined),
  };
});

describe('outbound calls', () => {
  let mongo: MongoMemoryServer;

  const admin = {
    userId: 'admin-id',
    tenantId: 'tenant-001',
    role: 'ADMIN' as const,
    permissions: ['view_all_conversations'],
    email: 'admin@example.com',
    name: 'Admin User',
  };

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  beforeEach(async () => {
    await mongoose.connection.db?.dropDatabase();
    await User.create({
      email: 'admin@example.com',
      passwordHash: await bcrypt.hash('admin123', 10),
      name: 'Admin User',
      role: 'ADMIN',
      tenantId: 'tenant-001',
      isActive: true,
    });
    await WhatsAppAccount.create({
      tenantId: 'tenant-001',
      metaAppId: 'app',
      phoneNumberId: '1365279446671292',
      businessAccountId: '1083877103989606',
      displayPhoneNumber: '+919811734091',
      encryptedAccessToken: 'enc',
      encryptedAppSecret: 'sec',
      webhookVerifyToken: 'verify',
      connectionStatus: 'CONNECTED',
    });
  });

  it('stores meta call id when Meta returns calls[].id', async () => {
    const account = await WhatsAppAccount.findOne({ tenantId: 'tenant-001' });
    const contact = await Contact.create({
      tenantId: 'tenant-001',
      whatsappAccountId: account!._id,
      name: 'Callee',
      phone: '+918860916437',
      whatsappId: '918860916437',
    });
    const conversation = await Conversation.create({
      tenantId: 'tenant-001',
      whatsappAccountId: account!._id,
      contactId: contact._id,
      status: 'OPEN',
      priority: 'NORMAL',
      unreadCount: 0,
    });

    const call = await startCall(admin, conversation._id.toString(), {
      sdp_type: 'offer',
      sdp: 'v=0',
    });

    expect(call.status).toBe('RINGING');
    expect(call.metaCallId).toBe('wacid.TEST123');
  });

  it('supersedes a stuck outbound without throwing', async () => {
    const account = await WhatsAppAccount.findOne({ tenantId: 'tenant-001' });
    const contact = await Contact.create({
      tenantId: 'tenant-001',
      whatsappAccountId: account!._id,
      name: 'Callee',
      phone: '+918860916437',
      whatsappId: '918860916437',
    });
    const conversation = await Conversation.create({
      tenantId: 'tenant-001',
      whatsappAccountId: account!._id,
      contactId: contact._id,
      status: 'OPEN',
      priority: 'NORMAL',
      unreadCount: 0,
    });

    await Call.create({
      tenantId: 'tenant-001',
      whatsappAccountId: account!._id,
      conversationId: conversation._id,
      contactId: contact._id,
      initiatedByUserId: admin.userId,
      direction: 'OUTGOING',
      status: 'RINGING',
      metaCallId: 'wacid.STUCK',
      startedAt: new Date(),
    });

    const call = await startCall(admin, conversation._id.toString(), {
      sdp_type: 'offer',
      sdp: 'v=0',
    });

    expect(call.status).toBe('RINGING');
    const stuck = await Call.findOne({ metaCallId: 'wacid.STUCK' });
    expect(stuck?.status).toBe('FAILED');
  });
});