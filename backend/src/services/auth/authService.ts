import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { User } from '../../models/User';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { AuthUser, AppError } from '../../types';
import { ADMIN_PERMISSIONS } from '../../constants/permissions';
import { sendPasswordResetEmail } from '../email/emailService';

export function userToAuthUser(user: {
  _id: { toString(): string };
  tenantId: string;
  role: 'ADMIN' | 'USER';
  email: string;
  name: string;
  profileImage?: string;
}): AuthUser {
  return {
    userId: user._id.toString(),
    tenantId: user.tenantId,
    role: user.role,
    permissions: user.role === 'ADMIN' ? [...ADMIN_PERMISSIONS] : [],
    email: user.email,
    name: user.name,
    profileImage: user.profileImage ? '/api/whatsapp/profile/avatar' : undefined,
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

const PASSWORD_RESET_MESSAGE =
  'If an account exists for that email, a password reset link has been sent.';

function hashPasswordResetToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function buildPasswordResetUrl(token: string): string {
  const base = env.FRONTEND_URL.replace(/\/$/, '');
  return `${base}/auth/reset-password?token=${encodeURIComponent(token)}`;
}

export async function requestPasswordReset(
  email: string
): Promise<{ message: string; resetUrl?: string }> {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail, isActive: true }).select(
    '+passwordResetToken +passwordResetExpires'
  );

  if (!user) {
    return { message: PASSWORD_RESET_MESSAGE };
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  user.passwordResetToken = hashPasswordResetToken(rawToken);
  user.passwordResetExpires = new Date(
    Date.now() + env.PASSWORD_RESET_EXPIRES_MINUTES * 60 * 1000
  );
  await user.save();

  const resetUrl = buildPasswordResetUrl(rawToken);
  const emailSent = await sendPasswordResetEmail({
    tenantId: user.tenantId,
    to: user.email,
    name: user.name,
    resetUrl,
  });

  if (!emailSent) {
    logger.info({ email: user.email, resetUrl }, 'Password reset link (SMTP not configured)');
  }

  return {
    message: PASSWORD_RESET_MESSAGE,
    ...(!emailSent ? { resetUrl } : {}),
  };
}

export async function resetPasswordWithToken(
  token: string,
  password: string
): Promise<{ message: string }> {
  const tokenHash = hashPasswordResetToken(token);
  const user = await User.findOne({
    passwordResetToken: tokenHash,
    passwordResetExpires: { $gt: new Date() },
    isActive: true,
  }).select('+passwordResetToken +passwordResetExpires');

  if (!user) {
    throw new AppError(400, 'Invalid or expired password reset link');
  }

  user.passwordHash = await bcrypt.hash(password, 10);
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  return { message: 'Password updated. You can sign in with your new password.' };
}

export async function seedDefaultUsers(tenantId: string): Promise<void> {
  const targetTenant = tenantId || env.DEFAULT_TENANT_ID;

  const defaults =
    env.NODE_ENV === 'production' && env.ADMIN_EMAIL && env.ADMIN_PASSWORD
      ? [
          {
            email: env.ADMIN_EMAIL,
            password: env.ADMIN_PASSWORD,
            name: 'Admin',
            role: 'ADMIN' as const,
          },
        ]
      : [
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
