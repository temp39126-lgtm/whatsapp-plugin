import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';

vi.mock('../src/services/email/emailService', () => ({
  sendTeamUserWelcomeEmail: vi.fn().mockResolvedValue(true),
}));
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User } from '../src/models/User';
import { Conversation } from '../src/models/Conversation';
import { Contact } from '../src/models/Contact';
import { sendTeamUserWelcomeEmail } from '../src/services/email/emailService';
import {
  createTeamUser,
  deleteTeamUser,
  purgeInactiveTeamUsers,
} from '../src/services/users/teamUserService';
import { AppError } from '../src/types';
import bcrypt from 'bcryptjs';

describe('Team user service', () => {
  let mongo: MongoMemoryServer;

  function adminAuth(userId: string) {
    return {
      userId,
      tenantId: 'tenant-001',
      role: 'ADMIN' as const,
      permissions: ['manage_team'],
      email: 'admin@example.com',
      name: 'Admin User',
    };
  }

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  beforeEach(async () => {
    vi.mocked(sendTeamUserWelcomeEmail).mockClear();
    await mongoose.connection.db?.dropDatabase();
    await User.create({
      email: 'admin@example.com',
      passwordHash: await bcrypt.hash('admin123', 10),
      name: 'Admin User',
      role: 'ADMIN',
      tenantId: 'tenant-001',
      isActive: true,
    });
  });

  it('creates an agent account in the admin tenant', async () => {
    const admin = await User.findOne({ email: 'admin@example.com' });
    const user = await createTeamUser(adminAuth(admin!._id.toString()), {
      name: 'New Agent',
      email: 'agent@example.com',
      password: 'password123',
    });

    expect(user.name).toBe('New Agent');
    expect(user.email).toBe('agent@example.com');
    expect(user.role).toBe('USER');
    expect(user.welcomeEmailSent).toBe(true);
    expect(sendTeamUserWelcomeEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'agent@example.com',
        temporaryPassword: 'password123',
      })
    );

    const stored = await User.findOne({ email: 'agent@example.com' });
    expect(stored?.tenantId).toBe('tenant-001');
  });

  it('purgeInactiveTeamUsers removes every isActive false user from the database', async () => {
    await User.create({
      email: 'ghost1@example.com',
      passwordHash: await bcrypt.hash('x', 10),
      name: 'Ghost One',
      role: 'USER',
      tenantId: 'tenant-001',
      isActive: false,
    });
    await User.create({
      email: 'ghost2@example.com',
      passwordHash: await bcrypt.hash('x', 10),
      name: 'Ghost Two',
      role: 'USER',
      tenantId: 'tenant-001',
      isActive: false,
    });

    const purged = await purgeInactiveTeamUsers();
    expect(purged).toBe(2);
    expect(await User.countDocuments({ isActive: false })).toBe(0);
    expect(await User.findOne({ email: 'ghost1@example.com' })).toBeNull();
    expect(await User.findOne({ email: 'ghost2@example.com' })).toBeNull();
  });

  it('recreates a user when the email belongs to a soft-deleted inactive record', async () => {
    const admin = await User.findOne({ email: 'admin@example.com' });
    const adminUser = adminAuth(admin!._id.toString());

    await User.create({
      email: 'ghost@example.com',
      passwordHash: await bcrypt.hash('oldpass', 10),
      name: 'Ghost User',
      role: 'USER',
      tenantId: 'tenant-001',
      isActive: false,
    });

    const user = await createTeamUser(adminUser, {
      name: 'New Ghost',
      email: 'ghost@example.com',
      password: 'password123',
    });

    expect(user.email).toBe('ghost@example.com');
    expect(user.name).toBe('New Ghost');

    const stored = await User.findOne({ email: 'ghost@example.com' });
    expect(stored?.isActive).toBe(true);
    expect(stored?.name).toBe('New Ghost');
  });

  it('rejects duplicate email in tenant', async () => {
    const admin = await User.findOne({ email: 'admin@example.com' });
    await createTeamUser(adminAuth(admin!._id.toString()), {
      name: 'Agent One',
      email: 'agent@example.com',
      password: 'password123',
    });

    await expect(
      createTeamUser(adminAuth(admin!._id.toString()), {
        name: 'Agent Two',
        email: 'agent@example.com',
        password: 'password456',
      })
    ).rejects.toBeInstanceOf(AppError);
  });

  it('hard-deletes a team user and unassigns their workload', async () => {
    const admin = await User.findOne({ email: 'admin@example.com' });
    const adminUser = adminAuth(admin!._id.toString());
    const created = await createTeamUser(adminUser, {
      name: 'Agent Remove',
      email: 'remove@example.com',
      password: 'password123',
    });

    await Conversation.create({
      tenantId: 'tenant-001',
      whatsappAccountId: new mongoose.Types.ObjectId(),
      contactId: new mongoose.Types.ObjectId(),
      assignedUserId: created._id,
      status: 'OPEN',
      priority: 'NORMAL',
      unreadCount: 0,
    });

    await Contact.create({
      tenantId: 'tenant-001',
      whatsappAccountId: new mongoose.Types.ObjectId(),
      name: 'Customer',
      phone: '+15551234567',
      whatsappId: '15551234567',
      assignedUserId: created._id,
    });

    const result = await deleteTeamUser(adminUser, created._id);
    expect(result.deleted).toBe(true);

    const stored = await User.findById(created._id);
    expect(stored).toBeNull();

    const conversation = await Conversation.findOne({ assignedUserId: created._id });
    expect(conversation).toBeNull();

    const contact = await Contact.findOne({ assignedUserId: created._id });
    expect(contact).toBeNull();
  });

  it('prevents deleting your own account', async () => {
    const admin = await User.findOne({ email: 'admin@example.com' });
    const adminUser = adminAuth(admin!._id.toString());
    await expect(deleteTeamUser(adminUser, adminUser.userId)).rejects.toMatchObject({
      statusCode: 400,
    });
  });
});
