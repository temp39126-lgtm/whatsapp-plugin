import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, getParam } from '../types';
import * as conversationService from '../services/conversations/conversationService';
import * as analyticsService from '../services/analytics/analyticsService';

export async function listConversations(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await conversationService.listConversations(req.user!, req.query as never);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getConversation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const conversation = await conversationService.getConversation(req.user!, getParam(req.params.id));
    res.json(conversation);
  } catch (error) {
    next(error);
  }
}

export async function assignConversation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await conversationService.assignConversation(
      req.user!,
      req.conversation!,
      req.body.assignedUserId
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await conversationService.updateConversationStatus(
      req.user!,
      req.conversation!,
      req.body.status
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function updatePriority(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await conversationService.updateConversationPriority(
      req.user!,
      req.conversation!,
      req.body.priority
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function updateTags(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await conversationService.updateConversationTags(
      req.user!,
      req.conversation!,
      req.body.tagIds
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function createNote(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const note = await analyticsService.createInternalNote(
      req.user!,
      getParam(req.params.id),
      req.body.content
    );
    res.status(201).json(note);
  } catch (error) {
    next(error);
  }
}

export async function listNotes(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const notes = await analyticsService.listInternalNotes(req.user!, getParam(req.params.id));
    res.json(notes);
  } catch (error) {
    next(error);
  }
}

export async function getActivity(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const activity = await analyticsService.getActivityHistory(
      req.user!,
      'conversation',
      getParam(req.params.id)
    );
    res.json(activity);
  } catch (error) {
    next(error);
  }
}

export async function markRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await conversationService.markConversationRead(req.user!, req.conversation!);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
