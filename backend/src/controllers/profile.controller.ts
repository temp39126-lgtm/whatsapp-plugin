import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { readAvatar } from '../services/avatars/avatarService';
import {
  getUserProfile,
  updateUserProfile,
  uploadUserAvatar,
  getUserAvatarStorageKey,
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
    const { name } = req.body as { name: string };
    const profile = await updateUserProfile(req.user!, name);
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
