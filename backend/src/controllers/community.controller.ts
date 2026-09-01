import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import * as communityService from '../services/communities/communityService';

export async function listCommunities(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const communities = await communityService.listCommunities(req.user!);
    res.json(communities);
  } catch (error) {
    next(error);
  }
}

export async function createCommunity(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const community = await communityService.createCommunity(req.user!, req.body);
    res.status(201).json(community);
  } catch (error) {
    next(error);
  }
}
