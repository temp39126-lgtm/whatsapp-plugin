import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, getParam } from '../types';
import { getAccessibleConversation } from '../services/rbac/conversationAccess';

export function conversationAccess(paramName = 'id') {
  return async (req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const conversationId = getParam(req.params[paramName] ?? req.params.conversationId);
      req.conversation = await getAccessibleConversation(req.user!, conversationId);
      next();
    } catch (error) {
      next(error);
    }
  };
}
