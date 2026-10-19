import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import bcrypt from 'bcryptjs';
import { User } from '../src/models/User';
import { Contact } from '../src/models/Contact';
import { Conversation } from '../src/models/Conversation';
import { WhatsAppAccount } from '../src/models/WhatsAppAccount';
import { Call } from '../src/models/Call';
import {
  acceptCall,
  listActiveIncomingCalls,
  processCallWebhook,
  processIncomingCallWebhook,
  rejectCall,
} from '../src/services/calls/callService';
import * as socketService from '../src/services/realtime/socketService';
import { AppError } from '../src/types';

vi.mock('../src/config/env', () => ({
  env: {
    CALLING_ENABLED: true,
    DEFAULT_TENANT_ID: 'tenant-001',
    CORS_ORIGIN: 'http://localhost:3000',
    FRONTEND_URL: 'http://localhost:3000',
  },
}));

describe('incoming calls', () => {
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

  it('creates a ringing incoming call and emits call.incoming with contact info', async () => {
    const account = await WhatsAppAccount.findOne({ tenantId: 'tenant-001' });
    const contact = await Contact.create({
      tenantId: 'tenant-001',
      whatsappAccountId: account!._id,
      name: 'Pradyuman',
      phone: '+917303769921',
      whatsappId: '917303769921',
    });
    await Conversation.create({
      tenantId: 'tenant-001',
      whatsappAccountId: account!._id,
      contactId: contact._id,
      status: 'OPEN',
      priority: 'NORMAL',
      unreadCount: 0,
    });

    const emitSpy = vi.spyOn(socketService, 'emitToAuthorizedUsers').mockResolvedValue();

    await processIncomingCallWebhook('tenant-001', {
      callId: 'meta-call-001',
      from: '917303769921',
      phoneNumberId: '1365279446671292',
      session: { sdp_type: 'offer', sdp: 'v=0' },
    });

    const call = await Call.findOne({ metaCallId: 'meta-call-001' });
    expect(call?.status).toBe('RINGING');
    expect(call?.direction).toBe('INCOMING');
    expect(emitSpy).toHaveBeenCalledWith(
      'tenant-001',
      expect.any(String),
      'call.incoming',
      expect.objectContaining({
        contact: expect.objectContaining({ name: 'Pradyuman', phone: '+917303769921' }),
        session: { sdp_type: 'offer', sdp: 'v=0' },
      })
    );
  });

  it('lists active ringing incoming calls for authorized users', async () => {
    const account = await WhatsAppAccount.findOne({ tenantId: 'tenant-001' });
    const contact = await Contact.create({
      tenantId: 'tenant-001',
      whatsappAccountId: account!._id,
      name: 'Caller',
      phone: '+917303769921',
      whatsappId: '917303769921',
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
      direction: 'INCOMING',
      status: 'RINGING',
      metaCallId: 'ring-1',
    });

    const active = await listActiveIncomingCalls(admin);
    expect(active).toHaveLength(1);
    expect(active[0].contact?.name).toBe('Caller');
  });

  it('requires WebRTC answer session to accept an incoming call', async () => {
    const account = await WhatsAppAccount.findOne({ tenantId: 'tenant-001' });
    const contact = await Contact.create({
      tenantId: 'tenant-001',
      whatsappAccountId: account!._id,
      name: 'Caller',
      phone: '+917303769921',
      whatsappId: '917303769921',
    });
    const conversation = await Conversation.create({
      tenantId: 'tenant-001',
      whatsappAccountId: account!._id,
      contactId: contact._id,
      status: 'OPEN',
      priority: 'NORMAL',
      unreadCount: 0,
    });
    const call = await Call.create({
      tenantId: 'tenant-001',
      whatsappAccountId: account!._id,
      conversationId: conversation._id,
      contactId: contact._id,
      direction: 'INCOMING',
      status: 'RINGING',
      metaCallId: 'ring-accept',
    });

    await expect(acceptCall(admin, call)).rejects.toBeInstanceOf(AppError);
    const accepted = await acceptCall(admin, call, { sdp_type: 'answer', sdp: 'v=0' });
    expect(accepted.status).toBe('CONNECTED');
  });

  it('rejects duplicate incoming webhook for the same meta call id', async () => {
    const account = await WhatsAppAccount.findOne({ tenantId: 'tenant-001' });
    const contact = await Contact.create({
      tenantId: 'tenant-001',
      whatsappAccountId: account!._id,
      name: 'Caller',
      phone: '+917303769921',
      whatsappId: '917303769921',
    });
    await Conversation.create({
      tenantId: 'tenant-001',
      whatsappAccountId: account!._id,
      contactId: contact._id,
      status: 'OPEN',
      priority: 'NORMAL',
      unreadCount: 0,
    });

    vi.spyOn(socketService, 'emitToAuthorizedUsers').mockResolvedValue();

    await processIncomingCallWebhook('tenant-001', {
      callId: 'dup-meta',
      from: '917303769921',
      phoneNumberId: '1365279446671292',
    });
    await processIncomingCallWebhook('tenant-001', {
      callId: 'dup-meta',
      from: '917303769921',
      phoneNumberId: '1365279446671292',
    });

    const count = await Call.countDocuments({ metaCallId: 'dup-meta' });
    expect(count).toBe(1);
  });

  it('marks unanswered incoming calls as missed on terminate webhook', async () => {
    const account = await WhatsAppAccount.findOne({ tenantId: 'tenant-001' });
    const contact = await Contact.create({
      tenantId: 'tenant-001',
      whatsappAccountId: account!._id,
      name: 'Caller',
      phone: '+917303769921',
      whatsappId: '917303769921',
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
      direction: 'INCOMING',
      status: 'RINGING',
      metaCallId: 'ring-missed',
      startedAt: new Date(),
    });

    const emitSpy = vi.spyOn(socketService, 'emitToAuthorizedUsers').mockResolvedValue();

    await processCallWebhook('tenant-001', {
      callId: 'ring-missed',
      phoneNumberId: '1365279446671292',
      event: 'terminate',
    });

    const call = await Call.findOne({ metaCallId: 'ring-missed' });
    expect(call?.status).toBe('MISSED');
    expect(emitSpy).toHaveBeenCalledWith(
      'tenant-001',
      conversation._id.toString(),
      'call.ended',
      expect.objectContaining({ status: 'MISSED' })
    );
  });

  it('rejects a ringing incoming call', async () => {
    const account = await WhatsAppAccount.findOne({ tenantId: 'tenant-001' });
    const contact = await Contact.create({
      tenantId: 'tenant-001',
      whatsappAccountId: account!._id,
      name: 'Caller',
      phone: '+917303769921',
      whatsappId: '917303769921',
    });
    const conversation = await Conversation.create({
      tenantId: 'tenant-001',
      whatsappAccountId: account!._id,
      contactId: contact._id,
      status: 'OPEN',
      priority: 'NORMAL',
      unreadCount: 0,
    });
    const call = await Call.create({
      tenantId: 'tenant-001',
      whatsappAccountId: account!._id,
      conversationId: conversation._id,
      contactId: contact._id,
      direction: 'INCOMING',
      status: 'RINGING',
      metaCallId: 'ring-reject',
    });

    const rejected = await rejectCall(admin, call);
    expect(rejected.status).toBe('REJECTED');
  });
});
