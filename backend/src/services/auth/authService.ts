import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../../models/User';
import { env } from '../../config/env';
import { AuthUser, AppError } from '../../types';
import { ADMIN_PERMISSIONS } from '../../constants/permissions';

export function userToAuthUser(user: {
  _id: { toString(): string };
  tenantId: string;
  role: 'ADMIN' | 'USER';
  email: string;
  name: string;
}): AuthUser {
  return {
    userId: user._id.toString(),
    tenantId: user.tenantId,
    role: user.role,
    permissions: user.role === 'ADMIN' ? [...ADMIN_PERMISSIONS] : [],
    email: user.email,
    name: user.name,
  };
}

export function signAuthToken(user: AuthUser): string {
  const options: jwt.SignOptions = {
    algorithm: env.JWT_ALGORITHM,
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  };

  if (env.JWT_ISSUER) options.issuer = env.JWT_ISSUER;
  if (env.JWT_AUDIENCE) options.audience = env.JWT_AUDIENCE;

  return jwt.sign(
    {
      sub: user.userId,
      tenantId: user.tenantId,
      role: user.role,
      permissions: user.permissions,
      email: user.email,
      name: user.name,
    },
    env.JWT_SECRET,
    options
  );
}

export async function registerUser(
  name: string,
  email: string,
  password: string
): Promise<{ token: string; user: AuthUser }> {
  const normalizedEmail = email.toLowerCase().trim();
  const tenantId = env.DEFAULT_TENANT_ID;

  const existing = await User.findOne({ email: normalizedEmail, tenantId });
  if (existing) {
    throw new AppError(409, 'An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    email: normalizedEmail,
    passwordHash,
    name: name.trim(),
    role: 'USER',
    tenantId,
    isActive: true,
  });

  const authUser = userToAuthUser(user);
  return {
    token: signAuthToken(authUser),
    user: authUser,
  };
}

export async function loginWithPassword(
  email: string,
  password: string
): Promise<{ token: string; user: AuthUser }> {
  const user = await User.findOne({
    email: email.toLowerCase().trim(),
    isActive: true,
  });

  if (!user) {
    throw new AppError(401, 'Invalid email or password');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new AppError(401, 'Invalid email or password');
  }

  const authUser = userToAuthUser(user);
  return {
    token: signAuthToken(authUser),
    user: authUser,
  };
}

export async function seedDefaultUsers(tenantId: string): Promise<void> {
  const targetTenant = tenantId || env.DEFAULT_TENANT_ID;
  const defaults = [
    {
      email: 'admin@example.com',
      password: 'admin123',
      name: 'Admin User',
      role: 'ADMIN' as const,
    },
    {
      email: 'user@example.com',
      password: 'user123',
      name: 'Support User',
      role: 'USER' as const,
    },
  ];

  for (const entry of defaults) {
    const existing = await User.findOne({ email: entry.email, tenantId: targetTenant });
    if (existing) continue;

    const passwordHash = await bcrypt.hash(entry.password, 10);
    await User.create({
      email: entry.email,
      passwordHash,
      name: entry.name,
      role: entry.role,
      tenantId: targetTenant,
      isActive: true,
    });
  }
}
