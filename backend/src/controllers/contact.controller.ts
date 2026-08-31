import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, getParam } from '../types';
import * as contactService from '../services/contacts/contactService';

export async function listContacts(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const page = Number(req.query.page) || 1;
    const search = req.query.search as string | undefined;
    const result = await contactService.listContacts(req.user!, page, 20, search);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getContact(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await contactService.getContact(req.user!, getParam(req.params.id));
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function updateContact(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await contactService.updateContact(req.user!, getParam(req.params.id), req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function assignContact(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await contactService.assignContact(req.user!, getParam(req.params.id), req.body.assignedUserId);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
