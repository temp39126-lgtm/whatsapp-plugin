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

export async function listTeamUsers(user: AuthUser, options?: { agentsOnly?: boolean }) {
  const query: Record<string, unknown> = { tenantId: user.tenantId, isActive: true };
  if (options?.agentsOnly) query.role = 'USER';

  const users = await User.find(query, 'name email role').sort({ name: 1 }).lean();

  return users.map((entry) => ({
    _id: entry._id.toString(),
    name: entry.name,
    email: entry.email,
    role: entry.role as 'ADMIN' | 'USER',
  }));
}

function isAgentRole(role: 'ADMIN' | 'USER') {
  return role === 'USER';
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

type WorkloadCounts = { open: number; pending: number; total: number };

export async function mergeTeamUsersWithWorkload<T extends WorkloadCounts>(
  admin: AuthUser,
  stats: Array<{ _id: string } & T>
): Promise<Array<{ _id: string; name: string; email: string; role: 'ADMIN' | 'USER' } & T>> {
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
        open: 0,
        pending: 0,
        total: 0,
      } as { _id: string; name: string; email: string; role: 'ADMIN' | 'USER' } & T;
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
        total: 0,
        resolved: 0,
        open: 0,
      };
    })
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
}
