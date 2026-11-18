import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';

vi.mock('../src/config/env', () => ({
  env: {
    ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  },
}));

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { TenantSettings } from '../src/models/TenantSettings';
import {
  getHiddenTemplateKeySet,
  setTemplateHidden,
  isTemplateHidden,
} from '../src/services/messages/hiddenTemplateService';
import { buildTemplateVisibilityKey, parseTemplateVisibilityKey } from '../src/utils/templateVisibility';

const TENANT = 'tenant-template-hidden';

describe('hidden WhatsApp templates', () => {
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

  it('builds stable visibility keys', () => {
    const key = buildTemplateVisibilityKey('hello_world', 'en_US');
    expect(key).toBe('hello_world::en_US');
    expect(parseTemplateVisibilityKey(key)).toEqual({ name: 'hello_world', language: 'en_US' });
  });

  it('stores and reads hidden template keys per tenant', async () => {
    expect(await getHiddenTemplateKeySet(TENANT)).toEqual(new Set());

    await setTemplateHidden(TENANT, 'test', 'en', true);
    const hidden = await getHiddenTemplateKeySet(TENANT);
    expect(hidden.has('test::en')).toBe(true);
    expect(isTemplateHidden(hidden, 'test', 'en')).toBe(true);
    expect(isTemplateHidden(hidden, 'other', 'en')).toBe(false);

    const record = await TenantSettings.findOne({ tenantId: TENANT }).lean();
    expect(record?.hiddenWhatsAppTemplates).toContain('test::en');

    await setTemplateHidden(TENANT, 'test', 'en', false);
    expect(await getHiddenTemplateKeySet(TENANT)).toEqual(new Set());
  });
});