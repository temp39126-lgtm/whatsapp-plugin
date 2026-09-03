import bcrypt from 'bcryptjs';
import { User } from '../../models/User';
import { AuthUser, AppError } from '../../types';
import { storeAvatar } from '../avatars/avatarService';
import { userToAuthUser, signAuthToken } from '../auth/authService';
import {
  DEFAULT_USER_PREFERENCES,
  type UserPreferences,
} from '../../types/preferences';
import type { UserProfile } from '../../types';

function mergePreferences(
  stored?: UserPreferences | IUserPreferencesPartial
): UserPreferences {
  return {
    notifications: {
      ...DEFAULT_USER_PREFERENCES.notifications,
      ...stored?.notifications,
    },
    privacy: {
      ...DEFAULT_USER_PREFERENCES.privacy,
      ...stored?.privacy,
    },
  };
}

type IUserPreferencesPartial = {
  notifications?: Partial<UserPreferences['notifications']>;
  privacy?: Partial<UserPreferences['privacy']>;
};

export function userToProfile(user: {
  _id: { toString(): string };
  tenantId: string;
  role: 'ADMIN' | 'USER';
  email: string;
  name: string;
  profileImage?: string;
  about?: string;
  preferences?: IUserPreferencesPartial;
}): UserProfile {
  return {
    ...userToAuthUser(user),
    about: user.about ?? '',
    preferences: mergePreferences(user.preferences),
  };
}

export async function getUserProfile(user: AuthUser): Promise<UserProfile> {
  const record = await User.findOne({ _id: user.userId, tenantId: user.tenantId, isActive: true });
  if (!record) {
    throw new AppError(404, 'User not found');
  }
  return userToProfile(record);
}

export async function updateUserProfile(
  user: AuthUser,
  updates: { name?: string; about?: string }
): Promise<UserProfile> {
  const patch: { name?: string; about?: string } = {};

  if (updates.name !== undefined) {
    const trimmedName = updates.name.trim();
    if (!trimmedName) {
      throw new AppError(400, 'Name is required');
    }
    patch.name = trimmedName;
  }

  if (updates.about !== undefined) {
    patch.about = updates.about.trim().slice(0, 139);
  }

  if (Object.keys(patch).length === 0) {
    throw new AppError(400, 'No profile fields to update');
  }

  const record = await User.findOneAndUpdate(
    { _id: user.userId, tenantId: user.tenantId, isActive: true },
    patch,
    { new: true }
  );

  if (!record) {
    throw new AppError(404, 'User not found');
  }

  return userToProfile(record);
}

export async function changeUserPassword(
  user: AuthUser,
  currentPassword: string,
  newPassword: string
): Promise<UserProfile> {
  const record = await User.findOne({
    _id: user.userId,
    tenantId: user.tenantId,
    isActive: true,
  }).select('+passwordHash');

  if (!record) {
    throw new AppError(404, 'User not found');
  }

  const valid = await bcrypt.compare(currentPassword, record.passwordHash);
  if (!valid) {
    throw new AppError(401, 'Current password is incorrect');
  }

  if (currentPassword === newPassword) {
    throw new AppError(400, 'New password must be different from your current password');
  }

  record.passwordHash = await bcrypt.hash(newPassword, 10);
  await record.save();

  return userToProfile(record);
}

export async function changeUserEmail(
  user: AuthUser,
  newEmail: string,
  currentPassword: string
): Promise<{ profile: UserProfile; token: string }> {
  const normalizedEmail = newEmail.toLowerCase().trim();
  const record = await User.findOne({
    _id: user.userId,
    tenantId: user.tenantId,
    isActive: true,
  }).select('+passwordHash');

  if (!record) {
    throw new AppError(404, 'User not found');
  }

  const valid = await bcrypt.compare(currentPassword, record.passwordHash);
  if (!valid) {
    throw new AppError(401, 'Password is incorrect');
  }

  if (normalizedEmail === record.email) {
    throw new AppError(400, 'New email must be different from your current email');
  }

  const existing = await User.findOne({ email: normalizedEmail, tenantId: user.tenantId });
  if (existing) {
    throw new AppError(409, 'An account with this email already exists');
  }

  record.email = normalizedEmail;
  await record.save();

  const authUser = userToAuthUser(record);
  return {
    profile: userToProfile(record),
    token: signAuthToken(authUser),
  };
}

export async function updateUserPreferences(
  user: AuthUser,
  preferences: Partial<UserPreferences>
): Promise<UserProfile> {
  const record = await User.findOne({ _id: user.userId, tenantId: user.tenantId, isActive: true });
  if (!record) {
    throw new AppError(404, 'User not found');
  }

  const current = mergePreferences(record.preferences);

  record.preferences = {
    notifications: {
      ...current.notifications,
      ...preferences.notifications,
    },
    privacy: {
      ...current.privacy,
      ...preferences.privacy,
    },
  };

  await record.save();
  return userToProfile(record);
}

export async function uploadUserAvatar(
  user: AuthUser,
  file: Express.Multer.File
): Promise<UserProfile> {
  const record = await User.findOne({ _id: user.userId, tenantId: user.tenantId, isActive: true });
  if (!record) {
    throw new AppError(404, 'User not found');
  }

  const storageKey = await storeAvatar(
    user.tenantId,
    'users',
    user.userId,
    file.originalname,
    file.buffer,
    file.mimetype
  );

  record.profileImage = storageKey;
  await record.save();

  return userToProfile(record);
}

export async function getUserAvatarStorageKey(user: AuthUser): Promise<string> {
  const record = await User.findOne({ _id: user.userId, tenantId: user.tenantId, isActive: true });
  if (!record?.profileImage) {
    throw new AppError(404, 'Avatar not found');
  }
  return record.profileImage;
}
