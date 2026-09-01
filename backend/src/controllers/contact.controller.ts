import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, getParam } from '../types';
import * as contactService from '../services/contacts/contactService';
import { readAvatar } from '../services/avatars/avatarService';
import { Contact } from '../models/Contact';
import { AppError } from '../types';

export async function createContact(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await contactService.createContact(req.user!, req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

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
    const result = await contactService.assignContact(
      req.user!,
      getParam(req.params.id),
      req.body.assignedUserId
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function deleteContact(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await contactService.deleteContact(req.user!, getParam(req.params.id));
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function uploadContactAvatar(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const file = req.file;
    if (!file) throw new AppError(400, 'Avatar image is required');

    const result = await contactService.uploadContactAvatar(req.user!, getParam(req.params.id), file);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getContactAvatar(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const contact = await Contact.findOne({
      _id: getParam(req.params.id),
      tenantId: req.user!.tenantId,
    });

    if (!contact?.profileImage) {
      res.status(404).json({ error: 'Avatar not found' });
      return;
    }

    const { body, mimeType } = await readAvatar(contact.profileImage);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(body);
  } catch (error) {
    next(error);
  }
}
