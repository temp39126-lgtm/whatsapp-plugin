import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, getParam } from '../types';
import * as groupService from '../services/groups/groupService';
import { readAvatar } from '../services/avatars/avatarService';
import { Group } from '../models/Group';
import { AppError } from '../types';

export async function listGroups(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const groups = await groupService.listGroups(req.user!);
    res.json(groups);
  } catch (error) {
    next(error);
  }
}

export async function getGroup(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const group = await groupService.getGroup(req.user!, getParam(req.params.id));
    res.json(group);
  } catch (error) {
    next(error);
  }
}

export async function createGroup(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const group = await groupService.createGroup(req.user!, req.body);
    res.status(201).json(group);
  } catch (error) {
    next(error);
  }
}

export async function deleteGroup(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await groupService.deleteGroup(req.user!, getParam(req.params.id));
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function uploadGroupAvatar(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const file = req.file;
    if (!file) throw new AppError(400, 'Avatar image is required');

    const result = await groupService.uploadGroupAvatar(req.user!, getParam(req.params.id), file);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getGroupAvatar(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const group = await Group.findOne({
      _id: getParam(req.params.id),
      tenantId: req.user!.tenantId,
    });

    if (!group?.profileImage) {
      res.status(404).json({ error: 'Avatar not found' });
      return;
    }

    const { body, mimeType } = await readAvatar(group.profileImage);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(body);
  } catch (error) {
    next(error);
  }
}
