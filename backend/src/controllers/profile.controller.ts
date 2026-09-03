import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { readAvatar } from '../services/avatars/avatarService';
import {
  getUserProfile,
  updateUserProfile,
  updateUserPreferences,
  uploadUserAvatar,
  getUserAvatarStorageKey,
  changeUserPassword,
  changeUserEmail,
} from '../services/users/userProfileService';

export async function getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const profile = await getUserProfile(req.user!);
    res.json(profile);
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { name, about } = req.body as { name?: string; about?: string };
    const profile = await updateUserProfile(req.user!, { name, about });
    res.json(profile);
  } catch (error) {
    next(error);
  }
}

export async function updatePreferences(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const profile = await updateUserPreferences(req.user!, req.body);
    res.json(profile);
  } catch (error) {
    next(error);
  }
}

export async function uploadProfileAvatar(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'Avatar image is required' });
      return;
    }

    const profile = await uploadUserAvatar(req.user!, file);
    res.json(profile);
  } catch (error) {
    next(error);
  }
}

export async function getProfileAvatar(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const storageKey = await getUserAvatarStorageKey(req.user!);
    const { body, mimeType } = await readAvatar(storageKey);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(body);
  } catch (error) {
    next(error);
  }
}

export async function changePassword(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { currentPassword, newPassword } = req.body as {
      currentPassword: string;
      newPassword: string;
    };
    const profile = await changeUserPassword(req.user!, currentPassword, newPassword);
    res.json({ profile: profile.profile, token: profile.token, message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
}

export async function changeEmail(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { email, currentPassword } = req.body as { email: string; currentPassword: string };
    const result = await changeUserEmail(req.user!, email, currentPassword);
    res.json({
      profile: result.profile,
      token: result.token,
      message: 'Email updated successfully',
    });
  } catch (error) {
    next(error);
  }
}
