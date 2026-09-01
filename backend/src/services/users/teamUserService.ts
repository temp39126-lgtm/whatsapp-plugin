import bcrypt from 'bcryptjs';
import { User } from '../../models/User';
import { AuthUser, AppError } from '../../types';

export async function createTeamUser(
  admin: AuthUser,
  input: { name: string; email: string; password: string }
) {
  const normalizedEmail = input.email.toLowerCase().trim();
  const existing = await User.findOne({ email: normalizedEmail, tenantId: admin.tenantId });
  if (existing) {
    throw new AppError(409, 'An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const user = await User.create({
    email: normalizedEmail,
    passwordHash,
    name: input.name.trim(),
    role: 'USER',
    tenantId: admin.tenantId,
    isActive: true,
  });

  return {
    _id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role as 'ADMIN' | 'USER',
  };
}

export async function listTeamUsers(user: AuthUser) {
  const users = await User.find({ tenantId: user.tenantId, isActive: true }, 'name email role')
    .sort({ name: 1 })
    .lean();

  return users.map((entry) => ({
    _id: entry._id.toString(),
    name: entry.name,
    email: entry.email,
    role: entry.role as 'ADMIN' | 'USER',
  }));
}

type AgentStatRow = { _id: string };

export async function enrichAgentStats<T extends AgentStatRow>(
  tenantId: string,
  stats: T[]
): Promise<Array<T & { name: string; email: string; role: 'ADMIN' | 'USER' }>> {
  if (stats.length === 0) return [];

  const userIds = stats.map((row) => row._id);
  const users = await User.find({ _id: { $in: userIds }, tenantId }, 'name email role').lean();
  const userMap = new Map(users.map((entry) => [entry._id.toString(), entry]));

  return stats.map((row) => {
    const user = userMap.get(row._id);
    return {
      ...row,
      name: user?.name ?? 'Unknown agent',
      email: user?.email ?? '',
      role: (user?.role ?? 'USER') as 'ADMIN' | 'USER',
    };
  });
}
