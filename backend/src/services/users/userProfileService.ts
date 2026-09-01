import { User } from '../../models/User';
import { AuthUser, AppError } from '../../types';
import { storeAvatar } from '../avatars/avatarService';
import { userToAuthUser } from '../auth/authService';

export async function getUserProfile(user: AuthUser): Promise<AuthUser> {
  const record = await User.findOne({ _id: user.userId, tenantId: user.tenantId, isActive: true });
  if (!record) {
    throw new AppError(404, 'User not found');
  }
  return userToAuthUser(record);
}

export async function updateUserProfile(user: AuthUser, name: string): Promise<AuthUser> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new AppError(400, 'Name is required');
  }

  const record = await User.findOneAndUpdate(
    { _id: user.userId, tenantId: user.tenantId, isActive: true },
    { name: trimmedName },
    { new: true }
  );

  if (!record) {
    throw new AppError(404, 'User not found');
  }

  return userToAuthUser(record);
}

export async function uploadUserAvatar(
  user: AuthUser,
  file: Express.Multer.File
): Promise<AuthUser> {
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

  return userToAuthUser(record);
}

export async function getUserAvatarStorageKey(user: AuthUser): Promise<string> {
  const record = await User.findOne({ _id: user.userId, tenantId: user.tenantId, isActive: true });
  if (!record?.profileImage) {
    throw new AppError(404, 'Avatar not found');
  }
  return record.profileImage;
}
