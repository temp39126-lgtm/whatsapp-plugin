import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, AppError, getParam } from '../types';
import { Call } from '../models/Call';
import { getAccessibleConversation } from '../services/rbac/conversationAccess';

export async function callAccess(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const call = await Call.findOne({ _id: getParam(req.params.id), tenantId: req.user!.tenantId });
    if (!call) {
      next(new AppError(404, 'Call not found'));
      return;
    }
    await getAccessibleConversation(req.user!, call.conversationId.toString());
    req.call = call;
    next();
  } catch (error) {
    next(error);
  }
}
