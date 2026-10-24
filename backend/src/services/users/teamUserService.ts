import bcrypt from 'bcryptjs';
import { User } from '../../models/User';
import { Contact } from '../../models/Contact';
import { Conversation } from '../../models/Conversation';
import { ConversationAssignment } from '../../models/ConversationAssignment';
import { ConversationRead } from '../../models/ConversationRead';
import { Notification } from '../../models/Notification';
import { AuthOtpChallenge } from '../../models/AuthOtpChallenge';
import { AuthUser, AppError } from '../../types';
import { logActivity } from '../rbac/activityLog';
import { sendTeamUserWelcomeEmail } from '../email/emailService';
import { logger } from '../../config/logger';
import { sanitizeStoredPermissions } from '../../utils/userPermissions';
import { incrementUserTokenVersion } from '../auth/authService';

export function teamUserAvatarUrl(userId: string, profileImage?: string) {
  return profileImage ? `/api/whatsapp/team/users/${userId}/avatar` : undefined;
}

function mapTeamUser(entry: {
  _id: { toString(): string };
  name: string;
  email: string;
  role: 'ADMIN' | 'USER';
  permissions?: string[];
  profileImage?: string;
}) {
  const id = entry._id.toString();
  return {
    _id: id,
    name: entry.name,
    email: entry.email,
    role: entry.role,
    permissions: sanitizeStoredPermissions(entry.role, entry.permissions),
    profileImage: teamUserAvatarUrl(id, entry.profileImage),
  };
}

export async function getTeamUserAvatarStorageKey(viewer: AuthUser, userId: string): Promise<string> {
  const record = await User.findOne({ _id: userId, tenantId: viewer.tenantId, isActive: true });
  if (!record?.profileImage) {
    throw new AppError(404, 'Avatar not found');
  }
  return record.profileImage;
}

async function purgeTeamUserReferences(
  tenantId: string,
  targetUserId: string,
  userEmail: string
): Promise<void> {
  await Promise.all([
    Conversation.updateMany(
      { tenantId, assignedUserId: targetUserId },
      { $unset: { assignedUserId: '' } }
    ),
    Conversation.updateMany(
      { tenantId, permittedUsers: targetUserId },
      { $pull: { permittedUsers: targetUserId } }
    ),
    Contact.updateMany(
      { tenantId, assignedUserId: targetUserId },
      { $unset: { assignedUserId: '' } }
    ),
    ConversationAssignment.deleteMany({
      tenantId,
      assignedUserId: targetUserId,
    }),
    ConversationRead.deleteMany({ tenantId, userId: targetUserId }),
    Notification.deleteMany({ tenantId, userId: targetUserId }),
    AuthOtpChallenge.deleteMany({ email: userEmail.toLowerCase().trim() }),
  ]);
}

/** Removes every soft-deleted (`isActive: false`) user left from older deploys. Runs on backend startup. */
export async function purgeInactiveTeamUsers(): Promise<number> {
  const inactiveUsers = await User.find({ isActive: false });
  let purged = 0;

  for (const user of inactiveUsers) {
    const userId = user._id.toString();
    await purgeTeamUserReferences(user.tenantId, userId, user.email);
    await User.deleteOne({ _id: user._id });
    purged += 1;
  }

  const remaining = await User.countDocuments({ isActive: false });
  if (remaining > 0) {
    logger.error(
      { remaining },
      'Inactive user ghost records still present after purge — manual DB review may be needed'
    );
  } else if (purged > 0) {
    logger.info({ count: purged }, 'Purged inactive team user records (database has none left)');
  }

  return purged;
}

export async function createTeamUser(
  admin: AuthUser,
  input: { name: string; email: string; password: string; permissions?: string[] }
) {
  const normalizedEmail = input.email.toLowerCase().trim();
  const existing = await User.findOne({ email: normalizedEmail, tenantId: admin.tenantId });
  if (existing) {
    if (existing.isActive) {
      throw new AppError(409, 'An account with this email already exists');
    }

    const ghostUserId = existing._id.toString();
    await purgeTeamUserReferences(admin.tenantId, ghostUserId, existing.email);
    await User.deleteOne({ _id: existing._id });
    logger.info(
      { email: normalizedEmail, tenantId: admin.tenantId },
      'Removed inactive user record so email can be reused'
    );
  }

  const permissions = sanitizeStoredPermissions('USER', input.permissions);

  const passwordHash = await bcrypt.hash(input.password, 10);
  const user = await User.create({
    email: normalizedEmail,
    passwordHash,
    name: input.name.trim(),
    role: 'USER',
    permissions,
    tenantId: admin.tenantId,
    isActive: true,
  });

  const welcomeEmailSent = await sendTeamUserWelcomeEmail({
    tenantId: admin.tenantId,
    to: user.email,
    name: user.name,
    email: user.email,
    temporaryPassword: input.password,
  });

  if (!welcomeEmailSent) {
    logger.warn(
      { email: user.email, tenantId: admin.tenantId },
      'Team user welcome email delivery failed'
    );
  }

  return {
    _id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role as 'ADMIN' | 'USER',
    permissions: sanitizeStoredPermissions(user.role, user.permissions),
    welcomeEmailSent,
  };
}

export async function updateTeamUserPermissions(
  admin: AuthUser,
  targetUserId: string,
  permissions: string[]
) {
  const user = await User.findOne({
    _id: targetUserId,
    tenantId: admin.tenantId,
    isActive: true,
  });

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  if (user.role === 'ADMIN') {
    throw new AppError(400, 'Admin permissions cannot be edited here');
  }

  user.permissions = sanitizeStoredPermissions('USER', permissions);
  await user.save();
  await incrementUserTokenVersion(targetUserId);

  await logActivity(admin, 'user.permissions_updated', 'user', targetUserId, {
    email: user.email,
    permissions: user.permissions,
  });

  return mapTeamUser(user);
}

export async function deleteTeamUser(admin: AuthUser, targetUserId: string) {
  if (admin.userId === targetUserId) {
    throw new AppError(400, 'You cannot delete your own account');
  }

  const user = await User.findOne({
    _id: targetUserId,
    tenantId: admin.tenantId,
  });

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  if (user.role === 'ADMIN') {
    const adminCount = await User.countDocuments({
      tenantId: admin.tenantId,
      role: 'ADMIN',
    });
    if (adminCount <= 1) {
      throw new AppError(400, 'Cannot delete the last admin account');
    }
  }

  const userEmail = user.email;

  await purgeTeamUserReferences(admin.tenantId, targetUserId, userEmail);
  await User.deleteOne({ _id: user._id });

  await logActivity(admin, 'user.deleted', 'user', targetUserId, {
    email: userEmail,
    name: user.name,
    role: user.role,
    hardDelete: true,
  });

  return { deleted: true };
}

export async function listTeamUsers(user: AuthUser, options?: { agentsOnly?: boolean }) {
  const query: Record<string, unknown> = { tenantId: user.tenantId, isActive: true };
  if (options?.agentsOnly) query.role = 'USER';

  const users = await User.find(query, 'name email role permissions profileImage')
    .sort({ name: 1 })
    .lean();

  return users.map((entry) => mapTeamUser(entry));
}

function isAgentRole(role: 'ADMIN' | 'USER') {
  return role === 'USER';
}

type AgentStatRow = { _id: string };

export async function enrichAgentStats<T extends AgentStatRow>(
  tenantId: string,
  stats: T[]
): Promise<
  Array<
    T & { name: string; email: string; role: 'ADMIN' | 'USER'; profileImage?: string }
  >
> {
  if (stats.length === 0) return [];

  const userIds = stats.map((row) => row._id);
  const users = await User.find({ _id: { $in: userIds }, tenantId }, 'name email role profileImage').lean();
  const userMap = new Map(users.map((entry) => [entry._id.toString(), entry]));

  return stats.map((row) => {
    const user = userMap.get(row._id);
    return {
      ...row,
      name: user?.name ?? 'Unknown user',
      email: user?.email ?? '',
      role: (user?.role ?? 'USER') as 'ADMIN' | 'USER',
      profileImage: teamUserAvatarUrl(row._id, user?.profileImage),
    };
  });
}

type WorkloadCounts = { open: number; pending: number; total: number };

export async function mergeTeamUsersWithWorkload<T extends WorkloadCounts>(
  admin: AuthUser,
  stats: Array<{ _id: string } & T>
): Promise<
  Array<
    { _id: string; name: string; email: string; role: 'ADMIN' | 'USER'; profileImage?: string } & T
  >
> {
  const enriched = (await enrichAgentStats(admin.tenantId, stats)).filter((row) =>
    isAgentRole(row.role)
  );
  const statMap = new Map(enriched.map((row) => [row._id, row]));
  const allUsers = (await listTeamUsers(admin, { agentsOnly: true }));

  return allUsers
    .map((member) => {
      const existing = statMap.get(member._id);
      if (existing) return existing;

      return {
        _id: member._id,
        name: member.name,
        email: member.email,
        role: member.role,
        profileImage: member.profileImage,
        open: 0,
        pending: 0,
        total: 0,
      } as { _id: string; name: string; email: string; role: 'ADMIN' | 'USER'; profileImage?: string } & T;
    })
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
}

type AnalyticsCounts = { total: number; resolved: number; open: number };

export async function mergeTeamUsersWithAgentAnalytics(
  admin: AuthUser,
  stats: Array<{ _id: string } & AnalyticsCounts>
): Promise<
  Array<{ _id: string; name: string; email: string; role: 'ADMIN' | 'USER' } & AnalyticsCounts>
> {
  const enriched = (await enrichAgentStats(admin.tenantId, stats)).filter((row) =>
    isAgentRole(row.role)
  );
  const statMap = new Map(enriched.map((row) => [row._id, row]));
  const allUsers = (await listTeamUsers(admin, { agentsOnly: true }));

  return allUsers
    .map((member) => {
      const existing = statMap.get(member._id);
      if (existing) return existing;

      return {
        _id: member._id,
        name: member.name,
        email: member.email,
        role: member.role,
        profileImage: member.profileImage,
        total: 0,
        resolved: 0,
        open: 0,
      };
    })
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
}
