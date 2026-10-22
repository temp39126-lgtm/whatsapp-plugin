import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';

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
}));

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Call } from '../src/models/Call';
import { releaseStaleActiveCalls } from '../src/services/calls/callService';

describe('releaseStaleActiveCalls', () => {
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
    await mongoose.connection.db?.dropDatabase();
  });

  it('marks old ringing calls as failed so new calls can start', async () => {
    const conversationId = new mongoose.Types.ObjectId();
    const staleStarted = new Date(Date.now() - 5 * 60 * 1000);

    await Call.create({
      tenantId: 'tenant-001',
      whatsappAccountId: new mongoose.Types.ObjectId(),
      conversationId,
      contactId: new mongoose.Types.ObjectId(),
      direction: 'OUTGOING',
      status: 'RINGING',
      startedAt: staleStarted,
    });

    const released = await releaseStaleActiveCalls('tenant-001', conversationId.toString());
    expect(released).toBe(1);

    const active = await Call.findOne({
      tenantId: 'tenant-001',
      conversationId,
      status: { $in: ['INITIATING', 'RINGING', 'CONNECTED'] },
    });
    expect(active).toBeNull();

    const failed = await Call.findOne({ conversationId, status: 'FAILED' });
    expect(failed?.failureReason).toContain('timed out');
  });

  it('does not clear recent ringing calls', async () => {
    const conversationId = new mongoose.Types.ObjectId();

    await Call.create({
      tenantId: 'tenant-001',
      whatsappAccountId: new mongoose.Types.ObjectId(),
      conversationId,
      contactId: new mongoose.Types.ObjectId(),
      direction: 'OUTGOING',
      status: 'RINGING',
      startedAt: new Date(),
    });

    const released = await releaseStaleActiveCalls('tenant-001', conversationId.toString());
    expect(released).toBe(0);

    const ringing = await Call.findOne({ conversationId, status: 'RINGING' });
    expect(ringing).toBeTruthy();
  });
});
