import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import * as groupService from '../services/groups/groupService';

export async function listGroups(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const groups = await groupService.listGroups(req.user!);
    res.json(groups);
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
