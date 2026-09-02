import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, getParam } from '../types';
import * as callService from '../services/calls/callService';

export async function listCalls(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const page = Number(req.query.page) || 1;
    const result = await callService.listCalls(req.user!, page);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getCall(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await callService.getCall(req.user!, getParam(req.params.id));
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function startCall(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { conversationId, session } = req.body as {
      conversationId: string;
      session?: { sdp_type: 'offer'; sdp: string };
    };
    const call = await callService.startCall(req.user!, conversationId, session);
    res.status(201).json(call);
  } catch (error) {
    next(error);
  }
}

export async function acceptCall(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const call = await callService.acceptCall(req.user!, req.call!);
    res.json(call);
  } catch (error) {
    next(error);
  }
}

export async function rejectCall(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const call = await callService.rejectCall(req.user!, req.call!);
    res.json(call);
  } catch (error) {
    next(error);
  }
}

export async function endCall(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const call = await callService.endCall(req.user!, req.call!);
    res.json(call);
  } catch (error) {
    next(error);
  }
}
