import { User } from '../../models/User';
import { AuthUser, AppError } from '../../types';
import { storeAvatar } from '../avatars/avatarService';
import { userToAuthUser } from '../auth/authService';
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
