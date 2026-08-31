import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, getParam } from '../types';
import * as messageService from '../services/messages/messageService';

export async function listMessages(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;
    const result = await messageService.listMessages(req.user!, getParam(req.params.id), page, limit);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function createMessage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const message = await messageService.createMessage(req.user!, req.conversation!, req.body);
    res.status(201).json(message);
  } catch (error) {
    next(error);
  }
}

export async function addReaction(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const message = await messageService.getMessageById(req.user!, getParam(req.params.id));
    const reaction = await messageService.addReaction(req.user!, message, req.body.emoji);
    res.json(reaction);
  } catch (error) {
    next(error);
  }
}

export async function togglePin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const message = await messageService.getMessageById(req.user!, getParam(req.params.id));
    const result = await messageService.togglePin(req.user!, message);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function toggleStar(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const message = await messageService.getMessageById(req.user!, getParam(req.params.id));
    const result = await messageService.toggleStar(req.user!, message);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function retryMessage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const message = await messageService.getMessageById(req.user!, getParam(req.params.id));
    const result = await messageService.retryMessage(req.user!, message);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getPinned(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const messages = await messageService.getPinnedMessages(req.user!, getParam(req.params.id));
    res.json(messages);
  } catch (error) {
    next(error);
  }
}

export async function getStarred(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const messages = await messageService.getStarredMessages(req.user!, getParam(req.params.id));
    res.json(messages);
  } catch (error) {
    next(error);
  }
}
